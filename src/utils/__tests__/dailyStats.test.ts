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
      expect(series[1]).toEqual({
         date: "2023-09-02",
         images: 0,
         joiners: 0,
         newbie_joiners: 0,
         totalImages: 10,
         totalJoiners: 2,
      });
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

      expect(series[0].date).toBe("2023-09-01");
      expect(series[series.length - 1]).toEqual({
         date: "2023-10-31",
         images: 9,
         joiners: 1,
         newbie_joiners: 0,
         totalImages: 9,
         totalJoiners: 1,
      });
   });

   describe("cumulative totals", () => {
      it("accumulates each day's count", () => {
         const series = buildDailySeries(
            {
               20250901: { images: 5, joiners: 1, newbie_joiners: 0 },
               20250902: { images: 4, joiners: 0, newbie_joiners: 0 },
               20250903: { images: 6, joiners: 2, newbie_joiners: 1 },
            },
            20250831200000,
            20250903195959,
         );

         expect(series.map((p) => p.totalImages)).toEqual([5, 9, 15]);
         expect(series.map((p) => p.totalJoiners)).toEqual([1, 1, 3]);
      });

      it("holds the running total flat on days without uploads", () => {
         const series = buildDailySeries(
            { 20250901: { images: 5, joiners: 1, newbie_joiners: 0 } },
            20250901000000,
            20250904000000,
         );

         expect(series.map((p) => p.totalImages)).toEqual([5, 5, 5, 5]);
      });

      it("sums to the same total as the raw daily counts", () => {
         const data = {
            20250901: { images: 55, joiners: 0, newbie_joiners: 0 },
            20250902: { images: 125, joiners: 2, newbie_joiners: 1 },
            20250903: { images: 6, joiners: 0, newbie_joiners: 0 },
         };
         const series = buildDailySeries(data, 20250831200000, 20250930000000);

         expect(series.at(-1)?.totalImages).toBe(
            Object.values(data).reduce((sum, stat) => sum + stat.images, 0),
         );
      });
   });

   describe("September start", () => {
      it("starts on 1 September when the window opens on 31 August", () => {
         const series = buildDailySeries(
            { 20250901: { images: 3, joiners: 1, newbie_joiners: 0 } },
            20250831200000,
            20250902195959,
         );

         expect(series.map((p) => p.date)).toEqual(["2025-09-01", "2025-09-02"]);
      });

      it("folds a 31 August bucket into 1 September (2013 shape)", () => {
         const series = buildDailySeries(
            {
               20130831: { images: 14, joiners: 1, newbie_joiners: 0 },
               20130901: { images: 12, joiners: 0, newbie_joiners: 0 },
               20130902: { images: 10, joiners: 0, newbie_joiners: 0 },
            },
            20130831190000,
            20130930185959,
         );

         expect(series[0]).toEqual({
            date: "2013-09-01",
            images: 26,
            joiners: 1,
            newbie_joiners: 0,
            totalImages: 26,
            totalJoiners: 1,
         });
         expect(series.at(-1)?.totalImages).toBe(36);
      });

      it("leaves a window that needs no September day alone", () => {
         const series = buildDailySeries(
            { 20240820: { images: 4, joiners: 0, newbie_joiners: 0 } },
            20240819200000,
            20240825235959,
         );

         expect(series.map((p) => p.date)).toEqual([
            "2024-08-19",
            "2024-08-20",
            "2024-08-21",
            "2024-08-22",
            "2024-08-23",
            "2024-08-24",
            "2024-08-25",
         ]);
         expect(series.at(-1)?.totalImages).toBe(4);
      });

      it("applies to the data's own range when no window is given", () => {
         const series = buildDailySeries({
            20190831: { images: 2, joiners: 0, newbie_joiners: 0 },
            20190901: { images: 8, joiners: 1, newbie_joiners: 0 },
         });

         expect(series.map((p) => p.date)).toEqual(["2019-09-01"]);
         expect(series[0].images).toBe(10);
         expect(series[0].totalImages).toBe(10);
      });
   });
});
