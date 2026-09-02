/**
 * MediaWiki upload target resolution.
 *
 * Two exclusive authentication modes exist:
 *  - "oauth": the production Commons flow using the logged-in user's OAuth token.
 *  - "bot-password": a development-only flow that authenticates directly to a
 *    local MediaWiki instance with a Bot Password, without any user session.
 *
 * The bot-password mode is STRICTLY for local development/testing. It can only
 * ever be activated when the server is not running in production, AND the
 * operator explicitly opts in via MEDIAWIKI_DEV_MODE=true. Production ignores
 * all MEDIAWIKI_DEV_* variables even if they are accidentally set.
 *
 * The MediaWiki API URL always comes from trusted server configuration, never
 * from client input.
 */

export type MediaWikiAuth = { mode: "oauth" } | { mode: "bot-password" };

export interface MediaWikiTarget {
   apiUrl: string;
   auth: MediaWikiAuth;
}

export interface BotPasswordCredentials {
   /** MediaWiki bot username, e.g. "MyBot@BotPasswordName" */
   username: string;
   /** The bot password string (NOT a normal user password). Server-side only. */
   password: string;
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const PRODUCTION_API_URL = "https://commons.wikimedia.org/w/api.php";

/**
 * Reads the local bot-password credentials from the environment. Only meaningful
 * when bot-password mode is active.
 */
export function getBotPasswordCredentials(): BotPasswordCredentials {
   return {
      username: (process.env.MEDIAWIKI_DEV_USERNAME || "").trim(),
      password: process.env.MEDIAWIKI_DEV_BOT_PASSWORD || "",
   };
}

/**
 * True only when the local MediaWiki dev-upload mode may be used: not running in
 * production AND explicitly enabled via MEDIAWIKI_DEV_MODE=true.
 */
export function isLocalMediaWikiEnabled(): boolean {
   // Production must refuse this mode even if the env var slips in.
   return !IS_PRODUCTION && process.env.MEDIAWIKI_DEV_MODE === "true";
}

/**
 * Resolves the MediaWiki target for uploads.
 *
 * - Production always targets Commons with OAuth (dev settings ignored).
 * - A non-production build targets Commons OAuth by default, and only switches
 *   to the local bot-password mode when explicitly enabled.
 *
 * The API URL is derived exclusively from server configuration.
 */
export function resolveMediaWikiTarget(): MediaWikiTarget {
   if (isLocalMediaWikiEnabled()) {
      const apiUrl = (process.env.MEDIAWIKI_API_URL || "").trim();
      if (!apiUrl) {
         throw new Error(
            "Local MediaWiki upload mode requires MEDIAWIKI_API_URL to be set (development only)",
         );
      }
      return { apiUrl, auth: { mode: "bot-password" } };
   }

   return {
      apiUrl: PRODUCTION_API_URL,
      auth: { mode: "oauth" },
   };
}

/**
 * Safe, client-facing upload configuration. Contains ONLY non-sensitive info the
 * UI needs. Bot credentials and usernames are NEVER included — they are strictly
 * server-side. In production this always reports the Commons target.
 */
export function getUploadClientConfig(): { localUploadEnabled: boolean; mediaWikiUrl: string } {
   const local = isLocalMediaWikiEnabled();
   const target = resolveMediaWikiTarget();
   // Normalize the wiki root (strip "/w/api.php" if present) for display only.
   const mediaWikiUrl = target.apiUrl.replace(/\/w\/api\.php$/i, "");
   return {
      localUploadEnabled: local,
      mediaWikiUrl: local ? mediaWikiUrl : "https://commons.wikimedia.org",
   };
}
