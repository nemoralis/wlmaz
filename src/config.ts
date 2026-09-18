/**
 * Centralized application configuration.
 *
 * Reads ALL environment variables once at module load and exports a typed,
 * validated config object. Every other module imports from here instead of
 * calling process.env directly.
 *
 * This module imports NOTHING from src/ — it is always safe to import first
 * and cannot create circular dependencies.
 */

const isProduction = process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// Derived flags
// ---------------------------------------------------------------------------

/**
 * True only when the local MediaWiki dev-upload mode may be used: not running
 * in production AND explicitly enabled via MEDIAWIKI_DEV_MODE=true.
 */
const isDevUploadMode =
   !isProduction && process.env.MEDIAWIKI_DEV_MODE === "true";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string, value: string | undefined, condition = true): string {
   if (condition && (!value || value.trim() === "")) {
      throw new Error(`Missing required environment variable: ${name}`);
   }
   return value?.trim() ?? "";
}

// ---------------------------------------------------------------------------
// Core settings (always validated)
// ---------------------------------------------------------------------------

const sessionSecret = requireEnv("SESSION_SECRET", process.env.SESSION_SECRET);
if (sessionSecret.length < 32) {
   throw new Error("SESSION_SECRET must be at least 32 characters long");
}

// ---------------------------------------------------------------------------
// OAuth settings (required when not in dev-upload mode)
// ---------------------------------------------------------------------------

const oauthConsumerKey = requireEnv(
   "WM_CONSUMER_KEY",
   process.env.WM_CONSUMER_KEY,
   !isDevUploadMode,
);
const oauthConsumerSecret = requireEnv(
   "WM_CONSUMER_SECRET",
   process.env.WM_CONSUMER_SECRET,
   !isDevUploadMode,
);

// ---------------------------------------------------------------------------
// Exported config object
// ---------------------------------------------------------------------------

export const config = {
   /** true when NODE_ENV === "production" */
   isProduction,

   /** true when dev-upload mode is active (non-production + MEDIAWIKI_DEV_MODE=true) */
   isDevUploadMode,

   /** HTTP listen port */
   port: Number(process.env.PORT) || 3000,

   /** Session signing secret (validated ≥32 chars at startup) */
   sessionSecret,

   /** Frontend origin used for CORS and OAuth callback URL */
   clientUrl: (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, ""),

   /** Redis connection string */
   redisUrl: process.env.REDIS_URL || "redis://localhost:6379",

   /** Whether photo uploads to Wikimedia Commons are enabled */
   uploadsEnabled: process.env.ENABLE_UPLOADS === "true",

   /** Log level: debug | info | warn | error */
   logLevel: (process.env.LOG_LEVEL?.toLowerCase()) ||
      (isProduction ? "info" : "debug"),

   /** Wikimedia OAuth consumer credentials (trimmed) */
   oauth: {
      consumerKey: oauthConsumerKey,
      consumerSecret: oauthConsumerSecret,
   },

   /** Local MediaWiki dev-upload settings (only meaningful when isDevUploadMode) */
   mediawikiDev: {
      apiUrl: (process.env.MEDIAWIKI_API_URL || "").trim(),
      username: (process.env.MEDIAWIKI_DEV_USERNAME || "").trim(),
      botPassword: process.env.MEDIAWIKI_DEV_BOT_PASSWORD || "",
   },
} as const;
