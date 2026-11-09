import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUserStats } from "@/composables/useUserStats.ts";
import type { UserStats } from "@/types/api.ts";
import { ApiError, apiFetch } from "@/utils/apiClient.ts";

vi.mock("@/utils/apiClient.ts", () => ({
   ApiError: class ApiError extends Error {
      status = 0;
      code = "unknown";
   },
   apiFetch: vi.fn(),
}));

const mockApiFetch = vi.mocked(apiFetch);

/** Minimal `localStorage`, since the composable reads and writes it directly. */
function createStorage() {
   const store = new Map<string, string>();
   return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() {
         return store.size;
      },
   };
}

const userStats = (username: string, count: number): UserStats => ({
   username,
   total: { count, usage: count, reg: 20200101000000 },
   commons: null,
   country: "Azerbaijan",
});

const deferred = <T>() => {
   let resolve!: (value: T) => void;
   const promise = new Promise<T>((res) => {
      resolve = res;
   });
   return { promise, resolve };
};

beforeEach(() => {
   vi.stubGlobal("localStorage", createStorage());
});

afterEach(() => {
   vi.unstubAllGlobals();
   vi.clearAllMocks();
   vi.restoreAllMocks();
});

describe("useUserStats", () => {
   it("ignores invalid cached JSON and fetches the current stats", async () => {
      localStorage.setItem("user_stats_Alice", JSON.stringify({ username: "Alice" }));
      mockApiFetch.mockResolvedValue(userStats("Alice", 12));

      const user = useUserStats();
      await user.fetchUserStats("Alice");

      expect(user.stats.value?.total.count).toBe(12);
      expect(user.error.value).toBeNull();
      // The bad cache entry is replaced by the validated response.
      expect(JSON.parse(localStorage.getItem("user_stats_Alice") ?? "{}").total.count).toBe(12);
   });

   it("clears the previous user's stats before the next user resolves", async () => {
      mockApiFetch.mockResolvedValueOnce(userStats("Alice", 12));

      const user = useUserStats();
      await user.fetchUserStats("Alice");
      expect(user.stats.value?.username).toBe("Alice");

      const bob = deferred<UserStats>();
      mockApiFetch.mockReturnValueOnce(bob.promise);

      const pending = user.fetchUserStats("Bob");

      // Alice's numbers must not remain visible while Bob is loading.
      expect(user.stats.value).toBeNull();
      expect(user.isLoading.value).toBe(true);

      bob.resolve(userStats("Bob", 4));
      await pending;

      expect(user.stats.value?.username).toBe("Bob");
      expect(user.isLoading.value).toBe(false);
   });

   it("ignores a slow response for the previously selected user", async () => {
      mockApiFetch.mockResolvedValueOnce(userStats("Alice", 12));

      const user = useUserStats();
      await user.fetchUserStats("Alice");

      const slowAlice = deferred<UserStats>();
      mockApiFetch.mockReturnValueOnce(slowAlice.promise);
      const alicePending = user.fetchUserStats("Alice");

      mockApiFetch.mockResolvedValueOnce(userStats("Bob", 4));
      await user.fetchUserStats("Bob");
      expect(user.stats.value?.username).toBe("Bob");

      slowAlice.resolve(userStats("Alice", 99));
      await alicePending;

      expect(user.stats.value?.username).toBe("Bob");
      expect(user.isLoading.value).toBe(false);
   });

   it("clears stats on reset so a signed-out profile keeps no old numbers", async () => {
      mockApiFetch.mockResolvedValueOnce(userStats("Alice", 12));

      const user = useUserStats();
      await user.fetchUserStats("Alice");

      user.resetStats();

      expect(user.stats.value).toBeNull();
      expect(user.error.value).toBeNull();
      expect(user.isLoading.value).toBe(false);
   });

   it("records when the stats were fetched and serves the freshness from cache", async () => {
      mockApiFetch.mockResolvedValue(userStats("Alice", 12));

      const user = useUserStats();
      await user.fetchUserStats("Alice");

      expect(user.lastFetchedAt.value).toBeInstanceOf(Date);
      expect(user.refreshFailed.value).toBe(false);
      expect(user.errorKind.value).toBeNull();

      // A second instance reads the timestamp back from the cached snapshot.
      const cached = useUserStats();
      mockApiFetch.mockResolvedValue(userStats("Alice", 12));
      await cached.fetchUserStats("Alice");

      expect(cached.lastFetchedAt.value).toBeInstanceOf(Date);
   });

   it("exposes the error kind so the page can branch (404 vs server)", async () => {
      /**
       * Builds a mocked ApiError. The stub class ignores the constructor's
       * second argument, so status/code are assigned explicitly.
       */
      const apiError = (status: number) =>
         Object.assign(
            new ApiError("failed", { status, code: "http_error", url: "https://example.org/" }),
            {
               status,
            },
         );

      mockApiFetch.mockRejectedValueOnce(apiError(404));

      const user = useUserStats();
      await user.fetchUserStats("Ghost");

      expect(user.stats.value).toBeNull();
      expect(user.errorKind.value).toBe("not_found");
      expect(user.error.value).toContain("tapılmadı");

      mockApiFetch.mockRejectedValueOnce(apiError(503));
      const retry = useUserStats();
      await retry.fetchUserStats("Ghost");

      expect(retry.errorKind.value).toBe("server");
   });

   it("flags a stale cached copy when revalidation fails", async () => {
      mockApiFetch.mockResolvedValueOnce(userStats("Alice", 12));

      const user = useUserStats();
      await user.fetchUserStats("Alice");
      expect(user.refreshFailed.value).toBe(false);

      mockApiFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      await user.fetchUserStats("Alice");

      // Cached numbers stay on screen; the page can say they may be stale.
      expect(user.stats.value?.total.count).toBe(12);
      expect(user.refreshFailed.value).toBe(true);
      expect(user.error.value).toBeNull();
   });
});
