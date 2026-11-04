/**
 * Typed wrapper around `fetch` for the app's own JSON APIs.
 *
 * Every call must provide a runtime parser. The parser turns the decoded body
 * into the response type or throws, so a typed value can never be produced by
 * an unchecked cast. HTTP failures, timeouts, aborts, unreadable bodies and
 * parser failures all become a single {@link ApiError} shape with a stable
 * machine code.
 *
 * No Vue/Node imports: this module runs in the browser, in tests and in the
 * server bundle.
 */

import { isRecord } from "@/utils/typeGuards.ts";

/** Turns a decoded response body into a typed value or throws. */
export type ApiParser<T> = (body: unknown) => T;

export interface ApiFetchOptions<T> extends Omit<RequestInit, "signal"> {
   /** Runtime parser/validator for the decoded body. */
   parse: ApiParser<T>;
   /** How to decode the body before `parse` runs. Defaults to "json". */
   responseType?: "json" | "text";
   /** Request timeout in milliseconds. `0` disables it. Defaults to 15s. */
   timeoutMs?: number;
   /** Caller cancellation, combined with the timeout. */
   signal?: AbortSignal | null;
   /** Human-readable name used in error messages, e.g. "upload config". */
   label?: string;
}

/** Stable failure codes callers can branch on without parsing messages. */
export type ApiErrorCode =
   "http_error" | "invalid_response" | "timeout" | "aborted" | "network_error";

const DEFAULT_TIMEOUT_MS = 15_000;

/** One error type for every failed API call. */
export class ApiError extends Error {
   /** HTTP status, or 0 when no response was received. */
   readonly status: number;
   /** Stable machine-readable failure code. */
   readonly code: ApiErrorCode;
   /** Server-provided detail, when it sent one. */
   readonly details?: string;
   /** Server-provided machine code (e.g. a Commons upload error). */
   readonly serverCode?: string;
   /** Request URL, useful for logs. */
   readonly url: string;

   constructor(
      message: string,
      options: {
         status: number;
         code: ApiErrorCode;
         url: string;
         details?: string;
         serverCode?: string;
         cause?: unknown;
      },
   ) {
      super(message, { cause: options.cause });
      this.name = "ApiError";
      this.status = options.status;
      this.code = options.code;
      this.details = options.details;
      this.serverCode = options.serverCode;
      this.url = options.url;
   }
}

/**
 * Pulls the message/code/details out of the backend's error envelope:
 * `{ error: string, code?: string, details?: string }` (some routes use
 * `message` instead of `error`).
 */
const errorFields = (body: unknown): { message?: string; code?: string; details?: string } => {
   if (!isRecord(body)) return {};

   const text = (value: unknown): string | undefined =>
      typeof value === "string" && value.trim() ? value : undefined;

   return {
      message: text(body.details) ?? text(body.error) ?? text(body.message),
      code: text(body.code),
      details: text(body.details),
   };
};

/** Maps a thrown fetch error to the stable ApiError shape. */
const fetchFailure = (error: unknown, url: string, label?: string): ApiError => {
   const subject = label ? `${label} (${url})` : url;

   if (error instanceof Error) {
      if (error.name === "TimeoutError") {
         return new ApiError(`Request timed out: ${subject}`, {
            status: 0,
            code: "timeout",
            url,
            cause: error,
         });
      }
      if (error.name === "AbortError") {
         return new ApiError(`Request aborted: ${subject}`, {
            status: 0,
            code: "aborted",
            url,
            cause: error,
         });
      }
      return new ApiError(error.message || `Network request failed: ${subject}`, {
         status: 0,
         code: "network_error",
         url,
         cause: error,
      });
   }

   return new ApiError(`Network request failed: ${subject}`, {
      status: 0,
      code: "network_error",
      url,
      cause: error,
   });
};

/** Combines the optional caller signal with the request timeout. */
const requestSignal = (
   signal: AbortSignal | null | undefined,
   timeoutMs: number,
): AbortSignal | undefined => {
   const signals: AbortSignal[] = [];
   if (timeoutMs > 0) signals.push(AbortSignal.timeout(timeoutMs));
   if (signal) signals.push(signal);

   if (signals.length === 0) return undefined;
   return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
};

/**
 * Fetches `url` and returns the parsed, validated body.
 *
 * Throws {@link ApiError} for non-2xx responses, timeouts, aborts, invalid
 * JSON and parser failures. Pass `responseType: "text"` for non-JSON payloads;
 * the parser then receives the raw string.
 */
export async function apiFetch<T>(url: string, options: ApiFetchOptions<T>): Promise<T> {
   const {
      parse,
      responseType = "json",
      timeoutMs = DEFAULT_TIMEOUT_MS,
      signal: externalSignal,
      label,
      ...init
   } = options;

   let response: Response;
   try {
      response = await fetch(url, {
         ...init,
         signal: requestSignal(externalSignal, timeoutMs),
      });
   } catch (error) {
      // A caller abort may carry a custom reason, in which case fetch rejects
      // with that value instead of an AbortError. The signal state is the
      // authoritative check.
      if (externalSignal?.aborted) {
         throw new ApiError(`Request aborted: ${label ?? url}`, {
            status: 0,
            code: "aborted",
            url,
            cause: error,
         });
      }
      throw fetchFailure(error, url, label);
   }

   let raw: string;
   try {
      raw = await response.text();
   } catch (error) {
      throw new ApiError(`Failed to read response: ${label ?? url}`, {
         status: response.status,
         code: "network_error",
         url,
         cause: error,
      });
   }

   let body: unknown = raw;
   if (responseType === "json" && raw.trim()) {
      try {
         body = JSON.parse(raw);
      } catch (error) {
         // A non-2xx response may be plain text (e.g. an nginx 413 page).
         // Let the status-based error below report it instead of masking the
         // real failure as malformed JSON.
         if (response.ok) {
            throw new ApiError(`Invalid JSON from ${label ?? url}`, {
               status: response.status,
               code: "invalid_response",
               url,
               cause: error,
            });
         }
         body = undefined;
      }
   } else if (responseType === "json") {
      body = undefined;
   }

   if (!response.ok) {
      const fields = errorFields(body);
      throw new ApiError(fields.message ?? `HTTP ${response.status} from ${label ?? url}`, {
         status: response.status,
         code: "http_error",
         url,
         details: fields.details,
         serverCode: fields.code,
      });
   }

   try {
      return parse(body);
   } catch (error) {
      throw new ApiError(`Invalid response from ${label ?? url}`, {
         status: response.status,
         code: "invalid_response",
         url,
         cause: error,
      });
   }
}
