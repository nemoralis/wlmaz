import { describe, expect, it } from "vitest";
import { buildDailySeries } from "@/utils/dailyStats.ts";

describe("buildDailySeries", () => {
   it("zero-fills gaps across the contest window", () => {
      const series = buildDailySeries(
         {
            20230901: { images: 10, joiners: 2, newbie_joiners: 1 },
            20230905: { images: 30, joiners: 4, newbie_joiners: 0 },
         },
         20230901000000,
         20230905000000,
      );

      expect(series.map((p) => p.date)).toEqual([
         "2023-09-01",
         "2023-09-02",
         "2023-09-03",
         "2023-09-04",
         "2023-09-05",
      ]);
      expect(series.map((p) => p.images)).toEqual([10, 0, 0, 0, 30]);
      expect(series[1]).toEqual({ date: "2023-09-02", images: 0, joiners: 0, newbie_joiners: 0 });
   });

   it("falls back to the data's own range when no window is given", () => {
      const series = buildDailySeries({
         20241012: { images: 5, joiners: 1, newbie_joiners: 0 },
         20241010: { images: 7, joiners: 2, newbie_joiners: 1 },
      });

      expect(series.map((p) => p.date)).toEqual(["2024-10-10", "2024-10-11", "2024-10-12"]);
      expect(series.map((p) => p.images)).toEqual([7, 0, 5]);
   });

   it("normalizes a reversed window", () => {
      const series = buildDailySeries(
         { 20230902: { images: 1, joiners: 0, newbie_joiners: 0 } },
         20230903000000,
         20230901000000,
      );

      expect(series.map((p) => p.date)).toEqual(["2023-09-01", "2023-09-02", "2023-09-03"]);
   });

   it("skips malformed date keys", () => {
      const series = buildDailySeries({
         20231301: { images: 1, joiners: 0, newbie_joiners: 0 }, // month 13
         20230231: { images: 1, joiners: 0, newbie_joiners: 0 }, // Feb 31
         notadate: { images: 1, joiners: 0, newbie_joiners: 0 },
      });

      expect(series).toEqual([]);
   });

   it("returns empty for null/undefined data", () => {
      expect(buildDailySeries(null, 20230901000000, 20230930000000)).toEqual([]);
      expect(buildDailySeries(undefined)).toEqual([]);
   });

   it("spans leap-day windows correctly", () => {
      const series = buildDailySeries(
         { 20240229: { images: 3, joiners: 1, newbie_joiners: 0 } },
         20240228000000,
         20240301000000,
      );

      expect(series.map((p) => p.date)).toEqual(["2024-02-28", "2024-02-29", "2024-03-01"]);
   });

   it("uses only the date part of YYYYMMDDHHmmss timestamps", () => {
      // start at 20:00 on Aug 31, end at 19:59:59 on Oct 31 (real WLM shape)
      const series = buildDailySeries(
         { 20231031: { images: 9, joiners: 1, newbie_joiners: 0 } },
         20230831200000,
         20231031195959,
      );

      expect(series[0].date).toBe("2023-08-31");
      expect(series[series.length - 1]).toEqual({
         date: "2023-10-31",
         images: 9,
         joiners: 1,
         newbie_joiners: 0,
      });
   });
});
