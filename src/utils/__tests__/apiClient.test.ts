import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/utils/apiClient.ts";

const jsonResponse = (body: unknown, status = 200) =>
   new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
   });

const textResponse = (body: string, status = 200) =>
   new Response(body, { status, headers: { "Content-Type": "text/plain" } });

const parseObject = (body: unknown): Record<string, unknown> => {
   if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new TypeError("not an object");
   }
   return body as Record<string, unknown>;
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
   fetchMock = vi.fn();
   vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe("apiFetch success", () => {
   it("returns the parser's typed value for a JSON body", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ enabled: true }));

      const data = await apiFetch<{ enabled: boolean }>("/upload/status", {
         parse: (body) => {
            const record = parseObject(body);
            return { enabled: record.enabled === true };
         },
      });

      expect(data).toEqual({ enabled: true });
   });

   it("passes method, headers and body through to fetch", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ success: true }));

      await apiFetch("/auth/logout", {
         method: "POST",
         headers: { "X-Requested-With": "XMLHttpRequest" },
         body: "payload",
         parse: parseObject,
      });

      expect(fetchMock).toHaveBeenCalledWith(
         "/auth/logout",
         expect.objectContaining({
            method: "POST",
            headers: { "X-Requested-With": "XMLHttpRequest" },
            body: "payload",
         }),
      );
   });

   it("supports raw text responses", async () => {
      fetchMock.mockResolvedValue(textResponse("hello"));

      const text = await apiFetch("/health.txt", {
         responseType: "text",
         parse: (body) => {
            if (typeof body !== "string") throw new TypeError("not text");
            return body;
         },
      });

      expect(text).toBe("hello");
   });

   it("passes undefined to the parser for an empty JSON body", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      const value = await apiFetch("/empty", {
         parse: (body) => body,
      });

      expect(value).toBeUndefined();
   });
});

describe("apiFetch failures", () => {
   it("turns a JSON error envelope into an ApiError", async () => {
      fetchMock.mockResolvedValue(
         jsonResponse(
            { error: "Commons rejected the upload", code: "fileexists", details: "Already there" },
            422,
         ),
      );

      await expect(apiFetch("/upload", { parse: parseObject })).rejects.toMatchObject({
         name: "ApiError",
         message: "Already there",
         status: 422,
         code: "http_error",
         details: "Already there",
         serverCode: "fileexists",
         url: "/upload",
      });
   });

   it("falls back to the HTTP status for a non-JSON error body", async () => {
      fetchMock.mockResolvedValue(textResponse("<html>too large</html>", 413));

      const error = await apiFetch("/upload", { parse: parseObject }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
         status: 413,
         code: "http_error",
         message: "HTTP 413 from /upload",
      });
   });

   it("wraps a parser rejection as invalid_response", async () => {
      fetchMock.mockResolvedValue(jsonResponse({ unexpected: true }));

      const error = await apiFetch("/api/leaderboard/monuments2025", {
         parse: () => {
            throw new TypeError("bad shape");
         },
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
         status: 200,
         code: "invalid_response",
         message: "Invalid response from /api/leaderboard/monuments2025",
      });
   });

   it("wraps malformed JSON in a successful response", async () => {
      fetchMock.mockResolvedValue(textResponse("{not json", 200));

      await expect(apiFetch("/api/data", { parse: parseObject })).rejects.toMatchObject({
         status: 200,
         code: "invalid_response",
      });
   });

   it("times out a request that never settles", async () => {
      fetchMock.mockImplementation(
         (_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
               init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
            }),
      );

      await expect(apiFetch("/slow", { parse: parseObject, timeoutMs: 10 })).rejects.toMatchObject({
         status: 0,
         code: "timeout",
      });
   });

   it("reports caller cancellation as aborted", async () => {
      fetchMock.mockImplementation(
         (_url: string, init: RequestInit) =>
            new Promise((_resolve, reject) => {
               init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
            }),
      );

      const controller = new AbortController();
      const request = apiFetch("/slow", {
         parse: parseObject,
         signal: controller.signal,
      });

      // A custom reason makes fetch reject with that value instead of an
      // AbortError; the signal state still classifies it as aborted.
      controller.abort("stop");

      await expect(request).rejects.toMatchObject({
         status: 0,
         code: "aborted",
      });
   });
});
