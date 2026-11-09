import { afterEach, describe, expect, it, vi } from "vitest";
import { useStats } from "@/composables/useStats.ts";

const jsonResponse = (body: unknown, status = 200) =>
   new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
   });

afterEach(() => {
   vi.unstubAllGlobals();
   vi.restoreAllMocks();
});

describe("useStats", () => {
   it("exposes a failed load instead of presenting zeroes as real data", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal(
         "fetch",
         vi.fn(async () => new Response("unavailable", { status: 503 })),
      );

      const stats = useStats();
      await stats.fetchData();

      expect(stats.error.value).toBeTruthy();
      expect(stats.isLoading.value).toBe(false);
      expect(stats.currentStats.value.total).toBe(0);
      // No snapshot means no date, not today's date.
      expect(stats.lastUpdateDate.value).toBe("-");
   });

   it("rejects a malformed history payload", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.stubGlobal(
         "fetch",
         vi.fn(async () => jsonResponse([{ total: "many", withImage: 1 }])),
      );

      const stats = useStats();
      await stats.fetchData();

      expect(stats.error.value).toContain("etibarsız");
      expect(stats.history.value).toHaveLength(0);
      expect(stats.isLoading.value).toBe(false);
   });

   it("uses the last valid snapshot as the current one", async () => {
      vi.stubGlobal(
         "fetch",
         vi.fn(async () =>
            jsonResponse([
               { total: 100, withImage: 40, withoutImage: 60, date: "2024-01-01" },
               { total: 120, withImage: 80, withoutImage: 40, date: "2025-01-01" },
            ]),
         ),
      );

      const stats = useStats();
      await stats.fetchData();

      expect(stats.error.value).toBeNull();
      expect(stats.currentStats.value.total).toBe(120);
      expect(stats.imagePercentage.value).toBe("66.7");
      expect(stats.lastUpdateDate.value).not.toBe("-");
   });
});
