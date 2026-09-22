import crypto from "crypto";
import OAuth from "oauth-1.0a";
import { config } from "@/config.ts";
import type { WikiUser } from "@/types";
import type { MediaWikiApiResponse } from "@/types/mediawiki.ts";
import { logger } from "@/utils/logger.ts";
import { MediaWikiBotClient } from "@/utils/mediawikiBotClient.ts";
import {
   getBotPasswordCredentials,
   resolveMediaWikiTarget,
   type MediaWikiTarget,
} from "@/utils/mediawikiConfig.ts";
import { sanitizeFilename } from "@/utils/sanitize.ts";
import { MEDIAWIKI_TITLES_PER_REQUEST } from "@/utils/constants.ts";
import { normalizeWikiTitle, pickUploadWarning } from "@/utils/mediawikiShared.ts";

// The Commons OAuth API target is separate from local dev mode. The upload
// routes decide at request time which target applies via resolveMediaWikiTarget.
const API_CONFIG = {
   url: "https://commons.wikimedia.org/w/api.php",
   consumer: {
      key: config.oauth.consumerKey,
      secret: config.oauth.consumerSecret,
   },
};

/**
 * Returns a fully-authenticated MediaWiki client for the given target.
 *
 * - oauth: wraps the request, but the MediaWikiBotClient is not used; callers
 *   of `uploadFile`/`checkFileExistence` handle the OAuth path internally.
 * - bot-password: returns a MediaWikiBotClient already logged in with the
 *   configured bot credentials (development only).
 */
async function buildBotClient(target: MediaWikiTarget): Promise<MediaWikiBotClient | null> {
   if (target.auth.mode !== "bot-password") return null;
   const credentials = getBotPasswordCredentials();
   if (!credentials.username || !credentials.password) {
      throw new Error("Local MediaWiki upload mode requires bot credentials to be configured");
   }
   const client = new MediaWikiBotClient(target.apiUrl, credentials);
   await client.login();
   return client;
}

/**
 * Creates an OAuth instance with the configured credentials.
 */
function getOAuthClient() {
   return new OAuth({
      consumer: API_CONFIG.consumer,
      signature_method: "HMAC-SHA1",
      hash_function(base_string, key) {
         return crypto.createHmac("sha1", key).update(base_string).digest("base64");
      },
   });
}

/**
 * Helper to get the correct token for signing the OAuth request.
 * Requires a logged-in user, whose OAuth token/secret pair is used.
 */

function getSigningToken(user?: WikiUser) {
   if (user) {
      return {
         key: user.token,
         secret: user.tokenSecret,
      };
   }

   throw new Error("No valid signing token available (User not logged in)");
}

// ==========================================
// API METHODS
// ==========================================

/**
 * Error raised when Wikimedia Commons rejects or fails an upload.
 * Carries the API error code/info so callers can surface it to the user.
 */
export class CommonsUploadError extends Error {
   constructor(
      public code: string,
      public info?: string,
      public httpStatus?: number,
   ) {
      super(`Commons upload failed: ${code}${info ? ` - ${info}` : ""}`);
      this.name = "CommonsUploadError";
   }
}

/**
 * Fetches a CSRF (Edit) Token.
 * Uses POST x-www-form-urlencoded to avoid query string signing issues.
 */
async function fetchCsrfToken(user: WikiUser): Promise<string> {
   const oauth = getOAuthClient();
   const token = getSigningToken(user);

   const params = {
      action: "query",
      meta: "tokens",
      type: "csrf",
      format: "json",
   };

   // Simple Oauth Sign: URL + POST Body
   const requestData = {
      url: API_CONFIG.url,
      method: "POST",
      data: params,
   };

   const headers = oauth.toHeader(oauth.authorize(requestData, token));

   const response = await fetch(API_CONFIG.url, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
         ...headers,
         "Content-Type": "application/x-www-form-urlencoded",
         "User-Agent": "WLMAZ-Tool/1.0",
      },
      body: new URLSearchParams(params).toString(),
   });

   if (!response.ok) {
      throw new Error(`HTTP Error fetching token: ${response.status} ${response.statusText}`);
   }

   const data: MediaWikiApiResponse = await response.json();

   if (data.error) {
      logger.error("[MediaWiki] Token Error:", data.error);
      throw new Error(`MediaWiki API Error: ${data.error.code} - ${data.error.info}`);
   }
   return data.query?.tokens?.csrftoken ?? "";
}

/**
 * Uploads a file.
 *
 * In OAuth mode this signs URL query params only (multipart body is plain).
 * In bot-password mode (development only) it delegates to MediaWikiBotClient,
 * which authenticates with a session instead of OAuth headers.
 */
export async function uploadFile(
   user: WikiUser | null,
   fileData: { name: string; buffer: Buffer; mimetype: string },
   metadata: { text: string; comment?: string },
   target: MediaWikiTarget = resolveMediaWikiTarget(),
): Promise<MediaWikiApiResponse> {
   if (target.auth.mode === "bot-password") {
      const client = await buildBotClient(target);
      if (!client) throw new Error("Internal: bot target without bot client");
      return client.upload(fileData, metadata);
   }

   // ---- OAuth path (requires a logged-in user) ----
   if (!user) {
      throw new CommonsUploadError("notloggedin", "Authentication required for upload");
   }

   // 1. Get Token
   const csrfToken = await fetchCsrfToken(user);

   // 2. Setup Request
   const oauth = getOAuthClient();
   const token = getSigningToken(user);

   // URL Parameters (SIGNED)
   const queryParams = {
      action: "upload",
      format: "json",
   };

   // Body Parameters (NOT SIGNED by OAuth, but sent in Multipart)
   // Note: 'token', 'filename', 'text' go here.
   const formData = new FormData();
   formData.append("filename", fileData.name);
   formData.append("text", metadata.text);
   formData.append("comment", metadata.comment || "Uploaded via WLMAZ Map");
   formData.append("token", csrfToken);

   // Attach File
   const fileBlob = new Blob([fileData.buffer as unknown as BlobPart], { type: fileData.mimetype });
   formData.append("file", fileBlob, fileData.name);

   // 3. Sign Request (URL Only)
   const requestData = {
      url: API_CONFIG.url,
      method: "POST",
      data: queryParams, // Only sign these!
   };

   // Generate Authorization Header
   const headers = oauth.toHeader(oauth.authorize(requestData, token));

   // 4. Send Fetch
   // Combine Base URL + Signed Query Params
   const queryString = new URLSearchParams(queryParams).toString();
   const fetchUrl = `${API_CONFIG.url}?${queryString}`;

   const response = await fetch(fetchUrl, {
      method: "POST",
      signal: AbortSignal.timeout(30000), // Uploads might take longer than simple queries
      headers: {
         ...headers,
         "User-Agent": "WLMAZ-Tool/1.0",
         // Do not set Content-Type (FormData handles boundary)
      },
      body: formData,
   });

   if (!response.ok) {
      throw new CommonsUploadError(
         "http_error",
         `HTTP Upload Error: ${response.status}`,
         response.status,
      );
   }

   const result: MediaWikiApiResponse = await response.json();

   if (result.error) {
      logger.error("[MediaWiki] Upload Error Details:", result.error);
      throw new CommonsUploadError(result.error.code, result.error.info);
   }

   const warning = pickUploadWarning(result.upload);
   if (warning) {
      logger.error("[MediaWiki] Upload Warning Details:", result.upload?.warnings);
      throw new CommonsUploadError(warning.code, warning.info);
   }

   return result;
}

/**
 * Checks which of the given raw upload titles already exist.
 * Mirrors the server-side file naming: each title becomes `File:<sanitizeFilename(t)>.<ext>`,
 * where the backend always re-encodes to `.jpg` (see image.ts). File existence is
 * public data, so no OAuth signing is needed in production.
 *
 * In bot-password mode (development only) the check runs against the same local
 * MediaWiki target and session as the upload.
 *
 * The returned array contains the subset of `rawTitles` that already exist.
 */
export async function checkFileExistence(
   rawTitles: string[],
   target: MediaWikiTarget = resolveMediaWikiTarget(),
): Promise<string[]> {
   if (target.auth.mode === "bot-password") {
      const client = await buildBotClient(target);
      if (!client) throw new Error("Internal: bot target without bot client");
      return client.checkFileExistence(rawTitles);
   }

   const apiUrl = target.apiUrl;

   // MediaWiki normalizes titles (File: prefix, underscores vs spaces, first
   // letter casing) — fold both sides to a comparable key.
   const existing: string[] = [];

   for (let i = 0; i < rawTitles.length; i += MEDIAWIKI_TITLES_PER_REQUEST) {
      const chunk = rawTitles.slice(i, i + MEDIAWIKI_TITLES_PER_REQUEST);
      const fileTitles = chunk.map((t) => `File:${sanitizeFilename(t)}.jpg`);

      const params = new URLSearchParams({
         action: "query",
         titles: fileTitles.join("|"),
         format: "json",
      });

      const response = await fetch(`${apiUrl}?${params.toString()}`, {
         method: "GET",
         signal: AbortSignal.timeout(10000),
         headers: { "User-Agent": "WLMAZ-Tool/1.0" },
      });

      if (!response.ok) {
         throw new Error(
            `HTTP Error checking file existence: ${response.status} ${response.statusText}`,
         );
      }

      const data: MediaWikiApiResponse = await response.json();
      if (data.error) {
         throw new Error(`MediaWiki API Error: ${data.error.code} - ${data.error.info}`);
      }

      const pages = data.query?.pages || {};
      const pageCount = Object.keys(pages).length;
      // Log the page-ID keys so we can see whether missing pages are grouped
      // under "-1" (expected) or spread across real IDs (unexpected).
      logger.debug(
         "[checkFileExistence] titles=%d pages=%d keys=%j",
         chunk.length,
         pageCount,
         Object.keys(pages),
      );

      const existingKeys = new Set(
         Object.values(data.query?.pages || {}).flatMap((page) => {
            if (!page) return [];
            // A page is missing when it carries a "missing" key (often "").
            // Check key presence, not truthiness, so missing pages aren't
            // mistaken for existing files.
            return !("missing" in page) && page.title ? [normalizeWikiTitle(page.title)] : [];
         }),
      );

      for (const raw of chunk) {
         if (existingKeys.has(normalizeWikiTitle(`File:${sanitizeFilename(raw)}.jpg`))) {
            existing.push(raw);
         }
      }
   }

   return existing;
}
