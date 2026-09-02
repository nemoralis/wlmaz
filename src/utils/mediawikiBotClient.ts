/**
 * Minimal MediaWiki API client using a session authenticated with a Bot Password.
 *
 * DEVELOPMENT/TESTING ONLY. This authenticates directly to a local MediaWiki
 * instance and performs uploads on behalf of the configured bot account. It is
 * never used in production — `resolveMediaWikiTarget` guarantees that.
 *
 * Security rules observed here:
 *  - The bot password is kept strictly server-side and never logged or surfaced
 *    in errors.
 *  - The MediaWiki API URL comes only from server configuration (constructor).
 *  - Errors returned to callers never contain credentials or cookies.
 */

import { logger } from "./logger";
import { CommonsUploadError } from "./mediawiki";
import type { BotPasswordCredentials } from "./mediawikiConfig";
import { sanitizeFilename } from "./sanitize";

const USER_AGENT = "WLMAZ-Tool/1.0";

/** Any JSON value returned by the MediaWiki API. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MediaWikiJson = any;

export class MediaWikiBotClient {
   private apiUrl: string;
   private credentials: BotPasswordCredentials;
   private cookieJar: Map<string, string>;

   constructor(apiUrl: string, credentials: BotPasswordCredentials) {
      this.apiUrl = apiUrl;
      this.credentials = credentials;
      this.cookieJar = new Map();
   }

   private getCookieHeader(): string {
      return [...this.cookieJar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
   }

   private storeCookies(setCookie: string[] | undefined): void {
      if (!setCookie) return;
      for (const raw of setCookie) {
         const first = raw.split(";", 1)[0];
         const eq = first.indexOf("=");
         if (eq === -1) continue;
         const name = first.slice(0, eq).trim();
         const value = first.slice(eq + 1).trim();
         if (name) this.cookieJar.set(name, value);
      }
   }

   /**
    * Sends a form-encoded POST to the MediaWiki API and returns parsed JSON.
    * Never logs credentials. Shared by login and CSRF-token steps.
    */
   private async apiRequest(
      params: Record<string, string>,
      { withSession = false, timeoutMs = 15000 }: { withSession?: boolean; timeoutMs?: number } = {},
   ): Promise<MediaWikiJson> {
      const body = new URLSearchParams({ format: "json", ...params }).toString();
      const headers: Record<string, string> = {
         "Content-Type": "application/x-www-form-urlencoded",
         "User-Agent": USER_AGENT,
      };
      if (withSession) headers["Cookie"] = this.getCookieHeader();

      const response = await fetch(this.apiUrl, {
         method: "POST",
         signal: AbortSignal.timeout(timeoutMs),
         headers,
         body,
      });

      this.storeCookies(response.headers.getSetCookie?.() ?? []);

      if (!response.ok) {
         throw new CommonsUploadError(
            "http_error",
            `HTTP Error talking to Local MediaWiki: ${response.status}`,
            response.status,
         );
      }

      const data = await response.json();
      if (data.error) {
         logger.error("[MediaWikiBot] API Error:", data.error.code);
         // Do NOT include data.error.info in case it reflects credential details.
         throw new CommonsUploadError(data.error.code || "api_error", "Local MediaWiki API error");
      }
      return data;
   }

   /**
    * Performs the standard MediaWiki login-token -> login flow used by Bot
    * Passwords, retaining the session cookies for subsequent requests.
    */
   async login(): Promise<void> {
      const tokenRes = await this.apiRequest({
         action: "query",
         meta: "tokens",
         type: "login",
      });
      const token = tokenRes?.query?.tokens?.logintoken;
      if (!token) {
         throw new CommonsUploadError("badtoken", "Could not obtain a MediaWiki login token");
      }

      const loginRes = await this.apiRequest(
         {
            action: "login",
            lgname: this.credentials.username,
            lgpassword: this.credentials.password,
            lgtoken: token,
         },
         { withSession: true },
      );

      if (loginRes?.login?.result !== "Success") {
         // Never echo the upstream reason verbatim — it may reflect credentials.
         logger.error("[MediaWikiBot] Local MediaWiki login failed");
         throw new CommonsUploadError("login-failed", "Bot login failed against Local MediaWiki");
      }
   }

   /**
    * Fetches a CSRF (edit) token using the authenticated session.
    */
   async getCsrfToken(): Promise<string> {
      const res = await this.apiRequest(
         { action: "query", meta: "tokens", type: "csrf" },
         { withSession: true },
      );
      const token = res?.query?.tokens?.csrftoken;
      if (!token) {
         throw new CommonsUploadError("badtoken", "Could not obtain a MediaWiki CSRF token");
      }
      return token;
   }

   /**
    * Uploads a file through the authenticated local MediaWiki session.
    * Mirrors the production OAuth upload: `ignorewarnings` is NOT set, so an
    * existing title fails with the same warning codes the client already maps.
    */
   async upload(
      fileData: { name: string; buffer: Buffer; mimetype: string },
      metadata: { text: string; comment?: string },
   ): Promise<MediaWikiJson> {
      const csrfToken = await this.getCsrfToken();

      const formData = new FormData();
      formData.append("action", "upload");
      formData.append("format", "json");
      formData.append("filename", fileData.name);
      formData.append("text", metadata.text);
      formData.append("comment", metadata.comment || "Uploaded via WLMAZ Map (dev)");
      formData.append("token", csrfToken);
      const fileBlob = new Blob([fileData.buffer as unknown as BlobPart], {
         type: fileData.mimetype,
      });
      formData.append("file", fileBlob, fileData.name);

      const response = await fetch(this.apiUrl, {
         method: "POST",
         signal: AbortSignal.timeout(30000),
         headers: {
            Cookie: this.getCookieHeader(),
            "User-Agent": USER_AGENT,
         },
         body: formData,
      });

      this.storeCookies(response.headers.getSetCookie?.() ?? []);

      if (!response.ok) {
         throw new CommonsUploadError(
            "http_error",
            `HTTP Upload Error (Local MediaWiki): ${response.status}`,
            response.status,
         );
      }

      const result = await response.json();
      if (result.error) {
         logger.error("[MediaWikiBot] Upload Error Details:", result.error.code);
         throw new CommonsUploadError(result.error.code, result.error.info);
      }

      const uploadResult = result.upload;
      const hasWarnings = !!uploadResult?.warnings && Object.keys(uploadResult.warnings).length > 0;
      if (uploadResult && (uploadResult.result === "Warning" || hasWarnings)) {
         const warnings = uploadResult.warnings || {};
         const priority = [
            "exists",
            "fileexists-shared-forbidden",
            "fileexists",
            "no-change",
            "duplicateversions",
            "duplicate",
            "duplicate-archive",
            "was-deleted",
            "badfilename",
         ];
         const primary =
            priority.find((key) => key in warnings) || Object.keys(warnings)[0] || "warning";
         const raw = warnings[primary];
         const info = Array.isArray(raw) ? raw.join(", ") : raw;
         throw new CommonsUploadError(primary, info ? String(info) : `Upload refused: ${primary}`);
      }

      return result;
   }

   /**
    * Checks which of the given raw upload titles already exist on the local wiki.
    * Uses the same session and API URL as uploads. Returns the subset that exist.
    */
   async checkFileExistence(rawTitles: string[]): Promise<string[]> {
      const MAX_TITLES_PER_REQUEST = 50;
      const normalize = (title: string): string =>
         title
            .replace(/^File:/i, "")
            .replace(/_/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();

      const existing: string[] = [];

      for (let i = 0; i < rawTitles.length; i += MAX_TITLES_PER_REQUEST) {
         const chunk = rawTitles.slice(i, i + MAX_TITLES_PER_REQUEST);
         const fileTitles = chunk.map((t) => `File:${sanitizeFilename(t)}.jpg`);

         const params = new URLSearchParams({
            action: "query",
            titles: fileTitles.join("|"),
            format: "json",
         });

         const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
            method: "GET",
            signal: AbortSignal.timeout(10000),
            headers: {
               Cookie: this.getCookieHeader(),
               "User-Agent": USER_AGENT,
            },
         });

         if (!response.ok) {
            throw new Error(
               `HTTP Error checking file existence (Local MediaWiki): ${response.status}`,
            );
         }

         const data = await response.json();
         if (data.error) {
            throw new Error(`MediaWiki API Error: ${data.error.code}`);
         }

         const existingKeys = new Set(
            Object.values(data.query?.pages || {}).flatMap((page) => {
               const p = page as { missing?: string; title?: string };
               // A page is missing when it carries a "missing" key (often "").
               // Check key presence, not truthiness, so missing pages aren't
               // mistaken for existing files.
               return !("missing" in p) && p.title ? [normalize(p.title)] : [];
            }),
         );

         for (const raw of chunk) {
            if (existingKeys.has(normalize(`File:${sanitizeFilename(raw)}.jpg`))) {
               existing.push(raw);
            }
         }
      }

      return existing;
   }
}
