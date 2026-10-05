import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLeaderboard } from "@/composables/useLeaderboard.ts";

/**
 * Minimal `localStorage`, since the composable reads and writes it directly and
 * the vitest environment is node.
 */
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

/** One Azerbaijan user as `/api/leaderboard/monuments<year>` returns them. */
const API_PAYLOAD = {
   Azerbaijan: {
      category: "Wiki Loves Monuments",
      count: 5,
      usage: 3,
      usercount: 1,
      start: 20250901000000,
      end: 20250930000000,
      years: {},
      data: {},
      users: { Tester: { count: 5, usage: 3, reg: 20200102030405 } },
   },
};

const fetchStub = () =>
   vi.fn(async () => ({ ok: true, status: 200, json: async () => API_PAYLOAD }));

beforeEach(() => {
   vi.stubGlobal("localStorage", createStorage());
});

describe("useLeaderboard loading state", () => {
   it("loads on a cold cache, so the page shows its loading state", async () => {
      vi.stubGlobal("fetch", fetchStub());
      const leaderboard = useLeaderboard();

      const pending = leaderboard.fetchLeaderboard(2025);

      // Nothing cached yet → the skeleton is what the user should see
      expect(leaderboard.isLoading.value).toBe(true);
      expect(leaderboard.users.value).toHaveLength(0);

      await pending;

      expect(leaderboard.isLoading.value).toBe(false);
      expect(leaderboard.users.value).toHaveLength(1);
      expect(leaderboard.users.value[0].reg).toBeInstanceOf(Date);
   });

   it("renders straight from the cache without entering the loading state", async () => {
      vi.stubGlobal("fetch", fetchStub());
      await useLeaderboard().fetchLeaderboard(2025);

      const cached = useLeaderboard();
      const pending = cached.fetchLeaderboard(2025);

      // Stale-while-revalidate: rows are on screen immediately, so there is
      // nothing to placeholder — only the small revalidating spinner shows.
      expect(cached.users.value).toHaveLength(1);
      expect(cached.isLoading.value).toBe(false);
      expect(cached.isValidating.value).toBe(true);

      await pending;
   });
});

describe("useLeaderboard cache round-trip", () => {
   it("revives the cached registration date back into a Date", async () => {
      vi.stubGlobal("fetch", fetchStub());
      await useLeaderboard().fetchLeaderboard(2025);

      const cached = useLeaderboard();
      const pending = cached.fetchLeaderboard(2025);

      // Checked before the fetch resolves: this is the state the first render
      // sees, and the one that throws. JSON has no Date type, so without
      // reviving, `reg` is a string and Intl.DateTimeFormat raises
      // "Invalid time value" while formatting the registration column.
      const reg = cached.users.value[0].reg;
      expect(reg).toBeInstanceOf(Date);
      expect(() =>
         new Intl.DateTimeFormat("az-AZ", { dateStyle: "medium" }).format(reg),
      ).not.toThrow();

      await pending;
   });

   it("ignores an unusable cache entry instead of rendering broken rows", async () => {
      const storage = createStorage();
      // A hand-edited or stale-format entry: `reg` is not a parseable date.
      storage.setItem(
         "leaderboard_data_2025",
         JSON.stringify({ users: [{ username: "Tester", reg: "nope" }] }),
      );
      vi.stubGlobal("localStorage", storage);
      vi.stubGlobal("fetch", fetchStub());

      const leaderboard = useLeaderboard();
      const pending = leaderboard.fetchLeaderboard(2025);

      // Treated as a cache miss: loading state shows, fresh data is fetched.
      expect(leaderboard.isLoading.value).toBe(true);

      await pending;

      expect(leaderboard.users.value).toHaveLength(1);
      expect(leaderboard.users.value[0].username).toBe("Tester");
      expect(leaderboard.users.value[0].reg).toBeInstanceOf(Date);
   });
});
