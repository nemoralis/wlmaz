import crypto from "crypto";
import OAuth from "oauth-1.0a";
import type { WikiUser } from "../types";

const IS_PROD = process.env.NODE_ENV === "production";

const API_CONFIG = {
   url: IS_PROD
      ? "https://commons.wikimedia.org/w/api.php"
      : "https://test.wikipedia.org/w/api.php",
   consumer: {
      key: (IS_PROD ? process.env.WM_CONSUMER_KEY : process.env.WM_CONSUMER_TEST)?.trim() || "",
      secret:
         (IS_PROD ? process.env.WM_CONSUMER_SECRET : process.env.WM_CONSUMERSC_TEST)?.trim() || "",
   },
};

// Log configuration on startup (masked)
console.log(`[MediaWiki] Initialized in ${IS_PROD ? "PRODUCTION" : "TEST"} mode.`);
console.log(`[MediaWiki] Target URL: ${API_CONFIG.url}`);
console.log(`[MediaWiki] Consumer Key: ${API_CONFIG.consumer.key.substring(0, 4)}...`);

// Ensure keys are trimmed
API_CONFIG.consumer.key = API_CONFIG.consumer.key.trim();
API_CONFIG.consumer.secret = API_CONFIG.consumer.secret.trim();

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
 * Helper to get the correct token for signing.
 * In Test Mode, ignores the passed user and uses Environment variables.
 */
/**
 * Helper to get the correct token for signing.
 * In Test Mode (non-prod), if user auth is missing, check/use Env variables fallback.
 */
function getSigningToken(user?: WikiUser) {
   if (!IS_PROD && process.env.WM_TEST_ACCESS && process.env.WM_TEST_ACCESSSC) {
      if (!user) {
         // Fallback for owner-only testing without login
         return {
            key: process.env.WM_TEST_ACCESS.trim(),
            secret: process.env.WM_TEST_ACCESSSC.trim(),
         };
      }
   }

   if (user) {
      return {
         key: user.token,
         secret: user.tokenSecret,
      };
   }

   throw new Error("No valid signing token available (User not logged in and not in Test Mode)");
}

// ==========================================
// API METHODS
// ==========================================

/**
 * Fetches a CSRF (Edit) Token.
 * Uses POST x-www-form-urlencoded to avoid query string signing issues.
 */
export async function fetchCsrfToken(user: WikiUser): Promise<string> {
   const oauth = getOAuthClient();
   const token = getSigningToken(user);

   console.log("[MediaWiki] Fetching CSRF Token...");

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

   console.log("[MediaWiki] Token Request Headers:", headers);

   const response = await fetch(API_CONFIG.url, {
      method: "POST",
      headers: {
         ...headers,
         "Content-Type": "application/x-www-form-urlencoded",
         "User-Agent": "WLMAZ-Tool/1.0",
      },
      body: new URLSearchParams(params as any).toString(),
   });

   if (!response.ok) {
      throw new Error(`HTTP Error fetching token: ${response.status} ${response.statusText}`);
   }

   const data = await response.json();

   if (data.error) {
      console.error("[MediaWiki] Token Error:", data.error);
      throw new Error(`MediaWiki API Error: ${data.error.code} - ${data.error.info}`);
   }

   if (!data.query?.tokens?.csrftoken) {
      console.error("[MediaWiki] Unexpected Response:", data);
      throw new Error("Missing csrftoken in response");
   }

   console.log(
      "[MediaWiki] Got CSRF Token:",
      data.query.tokens.csrftoken === "+\\" ? "Anonymous (BAD)" : "Valid",
   );
   return data.query.tokens.csrftoken;
}

/**
 * Uploads a file.
 * Handles Multipart signing strictly: Signs URL Query Params ONLY.
 */
export async function uploadFile(
   user: WikiUser,
   fileData: { name: string; buffer: Buffer; mimetype: string },
   metadata: { text: string; comment?: string },
): Promise<any> {
   console.log(`[MediaWiki] Starting upload for: ${fileData.name}`);

   // 1. Get Token
   console.log("[MediaWiki] User authenticated:", {
      username: user.username,
      hasToken: !!user.token,
      hasSecret: !!user.tokenSecret,
   });
   const csrfToken = await fetchCsrfToken(user);

   // 2. Setup Request
   const oauth = getOAuthClient();
   const token = getSigningToken(user);

   // URL Parameters (SIGNED)
   const queryParams = {
      action: "upload",
      format: "json",
      ignorewarnings: "1",
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

   console.log(`[MediaWiki] Posting to: ${fetchUrl}`);
   console.log("[MediaWiki] Upload Request Headers:", headers);

   const response = await fetch(fetchUrl, {
      method: "POST",
      headers: {
         ...headers,
         "User-Agent": "WLMAZ-Tool/1.0",
         // Do not set Content-Type (FormData handles boundary)
      },
      body: formData,
   });

   if (!response.ok) {
      throw new Error(`HTTP Upload Error: ${response.status}`);
   }

   const result = await response.json();

   if (result.error) {
      console.error("[MediaWiki] Upload Error Details:", result.error);
      throw new Error(`Upload Failed: ${result.error.code} - ${result.error.info}`);
   }

   console.log("[MediaWiki] Upload Success:", result.upload?.filename);
   return result;
}
