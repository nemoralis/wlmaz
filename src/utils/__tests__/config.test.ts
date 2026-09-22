import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Tests for the central runtime config (src/config.ts): validation of the
 * session secret, the dev-upload-mode exemption for OAuth envs, parsing of
 * numeric/boolean settings, and safe defaults.
 */

async function loadConfig() {
   vi.stubEnv("SESSION_SECRET", "test-session-secret-at-least-32-characters-long");
   vi.stubEnv("NODE_ENV", "development");
   vi.stubEnv("WM_CONSUMER_KEY", "test-consumer-key");
   vi.stubEnv("WM_CONSUMER_SECRET", "test-consumer-secret");
   vi.resetModules();
   return await import("@/config.ts");
}

afterEach(() => {
   vi.unstubAllEnvs();
   vi.restoreAllMocks();
});

describe("config session secret validation", () => {
   it("throws when SESSION_SECRET is missing", async () => {
      vi.stubEnv("SESSION_SECRET", "");
      vi.resetModules();
      await expect(import("@/config.ts")).rejects.toThrow(/SESSION_SECRET/);
   });

   it("throws when SESSION_SECRET is shorter than 32 characters", async () => {
      vi.stubEnv("SESSION_SECRET", "too-short");
      vi.resetModules();
      await expect(import("@/config.ts")).rejects.toThrow(/at least 32 characters/);
   });

   it("accepts a 32+ character secret", async () => {
      const mod = await loadConfig();
      expect(mod.config.sessionSecret).toBe("test-session-secret-at-least-32-characters-long");
   });
});

describe("config OAuth requirements vs dev-upload mode", () => {
   it("requires OAuth keys outside dev-upload mode (throwing remains)", async () => {
      vi.stubEnv("SESSION_SECRET", "test-session-secret-at-least-32-characters-long");
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "false");
      vi.stubEnv("WM_CONSUMER_KEY", "");
      vi.stubEnv("WM_CONSUMER_SECRET", "test-consumer-secret");
      vi.resetModules();
      await expect(import("@/config.ts")).rejects.toThrow(/WM_CONSUMER_KEY/);
   });

   it("does not require OAuth keys in dev-upload mode", async () => {
      vi.stubEnv("SESSION_SECRET", "test-session-secret-at-least-32-characters-long");
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("WM_CONSUMER_KEY", "");
      vi.stubEnv("WM_CONSUMER_SECRET", "");
      vi.resetModules();
      const mod = await import("@/config.ts");
      expect(mod.config.isDevUploadMode).toBe(true);
      expect(mod.config.oauth.consumerKey).toBe("");
   });
});

describe("config derived values and defaults", () => {
   it("computes isDevUploadMode as non-production AND MEDIAWIKI_DEV_MODE=true", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      const mod = await loadConfig();
      expect(mod.config.isDevUploadMode).toBe(true);
   });

   it("never enables dev-upload mode in production", async () => {
      vi.stubEnv("SESSION_SECRET", "test-session-secret-at-least-32-characters-long");
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("MEDIAWIKI_DEV_MODE", "true");
      vi.stubEnv("WM_CONSUMER_KEY", "test-consumer-key");
      vi.stubEnv("WM_CONSUMER_SECRET", "test-consumer-secret");
      vi.resetModules();
      const mod = await import("@/config.ts");
      expect(mod.config.isDevUploadMode).toBe(false);
      expect(mod.config.isProduction).toBe(true);
   });

   it("defaults port, clientUrl, uploadsEnabled and log level", async () => {
      vi.stubEnv("PORT", "");
      vi.stubEnv("CLIENT_URL", "");
      vi.stubEnv("ENABLE_UPLOADS", "");
      vi.stubEnv("LOG_LEVEL", "");
      const mod = await loadConfig();
      expect(mod.config.port).toBe(3000);
      expect(mod.config.clientUrl).toBe("http://localhost:5173");
      expect(mod.config.uploadsEnabled).toBe(false);
      expect(mod.config.logLevel).toBe("debug"); // non-production default
   });

   it("parses PORT, ENABLE_UPLOADS and log level when set", async () => {
      vi.stubEnv("PORT", "8080");
      vi.stubEnv("ENABLE_UPLOADS", "true");
      vi.stubEnv("LOG_LEVEL", "WARN");
      const mod = await loadConfig();
      expect(mod.config.port).toBe(8080);
      expect(mod.config.uploadsEnabled).toBe(true);
      expect(mod.config.logLevel).toBe("warn");
   });

   it("trims trailing slashes from CLIENT_URL", async () => {
      vi.stubEnv("CLIENT_URL", "https://example.com///");
      const mod = await loadConfig();
      expect(mod.config.clientUrl).toBe("https://example.com");
   });
});