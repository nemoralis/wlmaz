import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoverageData } from "@/content/coverage.ts";
import {
   COVERAGE_DATA_ELEMENT_ID,
   fetchCoverage,
   parseCoverageData,
   STATS_HISTORY_URL,
} from "@/utils/coverageData.ts";

const payload: CoverageData = { total: 1444, withImage: 804 };

afterEach(() => {
   vi.unstubAllGlobals();
});

describe("parseCoverageData", () => {
   it("reads a payload written by scripts/prerender.ts", () => {
      expect(parseCoverageData(JSON.stringify(payload))).toEqual(payload);
   });

   it("ignores extra fields such as the stats-history date", () => {
      const entry = { ...payload, date: "2026-11-04", withoutImage: 640 };
      expect(parseCoverageData(JSON.stringify(entry))).toEqual(payload);
   });

   it("returns null instead of throwing on unusable input", () => {
      for (const bad of [null, undefined, "", "not json", "[]", '"text"', "null"]) {
         expect(parseCoverageData(bad)).toBeNull();
      }
   });

   it("rejects a payload whose counts are missing or not numbers", () => {
      expect(parseCoverageData(JSON.stringify({ total: 10 }))).toBeNull();
      expect(parseCoverageData(JSON.stringify({ total: "10", withImage: 4 }))).toBeNull();
   });

   it("warns rather than throws on malformed JSON", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(parseCoverageData("{oops")).toBeNull();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
   });
});

describe("coverage data wiring", () => {
   it("keeps the element id and fallback path in sync with the prerender", () => {
      expect(COVERAGE_DATA_ELEMENT_ID).toBe("coverage-data");
      expect(STATS_HISTORY_URL).toBe("/stats-history.json");
   });

   it("uses the latest stats-history entry as the fallback", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
         ok: true,
         json: async () => [{ total: 10, withImage: 4 }, payload],
      });
      vi.stubGlobal("fetch", fetchMock);

      await expect(fetchCoverage()).resolves.toEqual(payload);
      expect(fetchMock).toHaveBeenCalledWith(STATS_HISTORY_URL);
   });

   it("returns null when the fallback cannot be loaded", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

      await expect(fetchCoverage()).resolves.toBeNull();
   });
});
