import { vi } from "vitest";

// Ensure config.ts can load in the test environment without throwing.
// These are safe dummy values — no real OAuth or Redis connections are made.
vi.stubEnv("SESSION_SECRET", "test-session-secret-at-least-32-characters-long");
vi.stubEnv("NODE_ENV", "development");
vi.stubEnv("WM_CONSUMER_KEY", "test-consumer-key");
vi.stubEnv("WM_CONSUMER_SECRET", "test-consumer-secret");
