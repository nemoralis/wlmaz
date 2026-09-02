import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tests the dev-only MediaWiki target resolution and the security boundary that
 * prevents the local Bot Password bypass from ever activating in production.
 */

async function loadConfig() {
   // Force fresh module evaluation so process.env / NODE_ENV are read anew.
   vi.resetModules();
   return await import("../mediawikiConfig");
}

afterEach(() => {
   vi.unstubAllEnvs();
   vi.restoreAllMocks();
});

describe("isLocalMediaWikiEnabled", () => {
   it("is disabled in production even when MEDIAWIKI_DEV_MODE=true", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      const mod = await loadConfig();
      expect(mod.isLocalMediaWikiEnabled()).toBe(false);
   });

   it("is enabled in development when MEDIAWIKI_DEV_MODE=true", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      const mod = await loadConfig();
      expect(mod.isLocalMediaWikiEnabled()).toBe(true);
   });

   it("is disabled in development when MEDIAWIKI_DEV_MODE is not true", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "false");
      const mod = await loadConfig();
      expect(mod.isLocalMediaWikiEnabled()).toBe(false);
   });
});

describe("resolveMediaWikiTarget", () => {
   it("uses the configured local API URL in dev bot mode", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("MEDIAWIKI_API_URL", "http://localhost:8080/w/api.php");
      const mod = await loadConfig();
      expect(mod.resolveMediaWikiTarget()).toEqual({
         apiUrl: "http://localhost:8080/w/api.php",
         auth: { mode: "bot-password" },
      });
   });

   it("produces an OAuth Commons target in production ignoring dev vars", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("MEDIAWIKI_API_URL", "http://localhost:8080/w/api.php");
      const mod = await loadConfig();
      expect(mod.resolveMediaWikiTarget()).toEqual({
         apiUrl: "https://commons.wikimedia.org/w/api.php",
         auth: { mode: "oauth" },
      });
   });

   it("never uses a client-provided URL (only server config)", async () => {
      // There is no client-influenced input path; ensure target only reflects env.
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("MEDIAWIKI_API_URL", "http://localhost:8080/w/api.php");
      const mod = await loadConfig();
      const target = mod.resolveMediaWikiTarget();
      // The resolver takes no arguments, so arbitrary caller-supplied URLs
      // cannot influence it.
      expect(target).not.toBe("http://evil.example/w/api.php");
      expect(target.apiUrl).toBe("http://localhost:8080/w/api.php");
   });

   it("throws a safe error in dev bot mode when the API URL is missing", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("MEDIAWIKI_API_URL", "");
      const mod = await loadConfig();
      expect(() => mod.resolveMediaWikiTarget()).toThrow(/MEDIAWIKI_API_URL/);
   });

   it("returns the Commons target in dev without bot mode", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "false");
      const mod = await loadConfig();
      expect(mod.resolveMediaWikiTarget()).toEqual({
         apiUrl: "https://commons.wikimedia.org/w/api.php",
         auth: { mode: "oauth" },
      });
   });
});

describe("getUploadClientConfig", () => {
   it("returns dev mode + local URL, never exposing credentials", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("MEDIAWIKI_API_URL", "http://localhost:8080/w/api.php");
      vi.stubEnv("MEDIAWIKI_DEV_USERNAME", "Bot@BotName");
      vi.stubEnv("MEDIAWIKI_DEV_BOT_PASSWORD", "hunter2-secret");
      const mod = await loadConfig();

      const config = mod.getUploadClientConfig();
      expect(config).toEqual({
         localUploadEnabled: true,
         mediaWikiUrl: "http://localhost:8080",
      });

      const serialized = JSON.stringify(config).toLowerCase();
      expect(serialized).not.toContain("hunter2-secret");
      expect(serialized).not.toContain("botname");
      expect(serialized).not.toContain("botpassword");
      expect(serialized).not.toContain("lgpassword");
   });

   it("always reports the Commons target in production", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("MEDIAWIKI_API_URL", "http://localhost:9999/w/api.php");
      const mod = await loadConfig();
      expect(mod.getUploadClientConfig()).toEqual({
         localUploadEnabled: false,
         mediaWikiUrl: "https://commons.wikimedia.org",
      });
   });
});
