import { describe, expect, it } from "vitest";
import { buildDailySeries } from "@/utils/dailyStats.ts";

describe("buildDailySeries", () => {
   it("reports only the days upstream listed, leaving gaps as gaps", () => {
      const series = buildDailySeries(
         {
            20230901: { images: 10, joiners: 2, newbie_joiners: 1 },
            20230905: { images: 30, joiners: 4, newbie_joiners: 0 },
         },
         20230901000000,
      );

      // 09-02..09-04 were not reported. They must not appear as zero days —
      // a zero would claim uploads didn't happen, when really we don't know.
      expect(series.map((p) => p.date)).toEqual(["2023-09-01", "2023-09-05"]);
      expect(series.map((p) => p.images)).toEqual([10, 30]);
   });

   it("accumulates totals across the days it does have", () => {
      const series = buildDailySeries(
         {
            20230901: { images: 10, joiners: 2, newbie_joiners: 1 },
            20230905: { images: 30, joiners: 4, newbie_joiners: 0 },
         },
         20230901000000,
      );

      expect(series.map((p) => p.totalImages)).toEqual([10, 40]);
      expect(series.map((p) => p.totalJoiners)).toEqual([2, 6]);
   });

   it("falls back to the data's own range when no window is given", () => {
      const series = buildDailySeries({
         20241012: { images: 5, joiners: 1, newbie_joiners: 0 },
         20241010: { images: 7, joiners: 2, newbie_joiners: 1 },
      });

      expect(series.map((p) => p.date)).toEqual(["2024-10-10", "2024-10-12"]);
      expect(series.map((p) => p.images)).toEqual([7, 5]);
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
      expect(buildDailySeries(null, 20230901000000)).toEqual([]);
      expect(buildDailySeries(undefined)).toEqual([]);
   });

   it("keeps leap days and ignores their unreported neighbours", () => {
      const series = buildDailySeries(
         { 20240229: { images: 3, joiners: 1, newbie_joiners: 0 } },
         20240228000000,
      );

      expect(series.map((p) => p.date)).toEqual(["2024-02-29"]);
      expect(series[0].totalImages).toBe(3);
   });

   it("uses only the date part of YYYYMMDDHHmmss timestamps", () => {
      // start at 20:00 on Aug 31, end at 19:59:59 on Oct 31 (real WLM shape)
      const series = buildDailySeries(
         { 20231031: { images: 9, joiners: 1, newbie_joiners: 0 } },
         20230831200000,
      );

      // The August start stamp must not drag the series back into August
      expect(series.map((p) => p.date)).toEqual(["2023-10-31"]);
      expect(series[0].totalImages).toBe(9);
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
         );

         expect(series.map((p) => p.totalImages)).toEqual([5, 9, 15]);
         expect(series.map((p) => p.totalJoiners)).toEqual([1, 1, 3]);
      });

      it("sums to the same total as the raw daily counts", () => {
         const data = {
            20250901: { images: 55, joiners: 0, newbie_joiners: 0 },
            20250902: { images: 125, joiners: 2, newbie_joiners: 1 },
            20250903: { images: 6, joiners: 0, newbie_joiners: 0 },
         };
         const series = buildDailySeries(data, 20250831200000);

         expect(series.at(-1)?.totalImages).toBe(
            Object.values(data).reduce((sum, stat) => sum + stat.images, 0),
         );
      });

      it("does not let a gap reset the running total", () => {
         const series = buildDailySeries(
            {
               20250901: { images: 5, joiners: 1, newbie_joiners: 0 },
               20250904: { images: 2, joiners: 1, newbie_joiners: 0 },
            },
            20250831200000,
         );

         // 09-02 and 09-03 are absent, so the total carries straight through
         expect(series.map((p) => p.totalImages)).toEqual([5, 7]);
      });
   });

   describe("September start", () => {
      it("starts on 1 September when the window opens on 31 August", () => {
         const series = buildDailySeries(
            { 20250901: { images: 3, joiners: 1, newbie_joiners: 0 } },
            20250831200000,
         );

         expect(series.map((p) => p.date)).toEqual(["2025-09-01"]);
      });

      it("folds a 31 August bucket into 1 September (2013 shape)", () => {
         const series = buildDailySeries(
            {
               20130831: { images: 14, joiners: 1, newbie_joiners: 0 },
               20130901: { images: 12, joiners: 0, newbie_joiners: 0 },
               20130902: { images: 10, joiners: 0, newbie_joiners: 0 },
            },
            20130831190000,
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
         );

         expect(series.map((p) => p.date)).toEqual(["2024-08-20"]);
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

      it("folds the August bucket into an existing September day", () => {
         const series = buildDailySeries(
            {
               20140831: { images: 5, joiners: 0, newbie_joiners: 0 },
               20140902: { images: 7, joiners: 1, newbie_joiners: 0 },
            },
            20140831200000,
         );

         // 09-01 was never reported, so the fold creates it from the August day
         expect(series.map((p) => p.date)).toEqual(["2014-09-01", "2014-09-02"]);
         expect(series[0].images).toBe(5);
         expect(series.at(-1)?.totalImages).toBe(12);
      });
   });
});
