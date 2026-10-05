import { describe, expect, it, vi } from "vitest";
import type { HomeData } from "@/content/featured.ts";
import { HOME_DATA_ELEMENT_ID, HOME_DATA_URL, parseHomeData } from "@/utils/homeData.ts";

const payload: HomeData = {
   featured: [],
   regions: [],
   total: 1313,
   withImage: 250,
};

describe("parseHomeData", () => {
   it("reads a payload written by scripts/prerender.ts", () => {
      expect(parseHomeData(JSON.stringify(payload))).toEqual(payload);
   });

   it("tolerates the escaped `<` the prerender writes", () => {
      const escaped = JSON.stringify(payload).replace(/</g, "\\u003c");
      expect(parseHomeData(escaped)).toEqual(payload);
   });

   it("defaults the arrays the about page never reads", () => {
      const partial = parseHomeData(JSON.stringify({ total: 10, withImage: 4 }));
      expect(partial?.featured).toEqual([]);
      expect(partial?.regions).toEqual([]);
   });

   it("returns null instead of throwing on unusable input", () => {
      // The counts are supplementary: a broken payload must degrade to "no
      // numbers", never take the page down.
      for (const bad of [null, undefined, "", "not json", "[]", '"text"', "null"]) {
         expect(parseHomeData(bad)).toBeNull();
      }
   });

   it("rejects a payload whose counts are missing or not numbers", () => {
      expect(parseHomeData(JSON.stringify({ featured: [] }))).toBeNull();
      expect(parseHomeData(JSON.stringify({ total: "10", withImage: 4 }))).toBeNull();
   });
});

describe("home data wiring", () => {
   it("keeps the element id and fallback path in sync with the prerender", () => {
      // scripts/prerender.ts writes id="home-data"; scripts/write-home-data.ts
      // writes public/home-data.json. Both are load-bearing for the counts.
      expect(HOME_DATA_ELEMENT_ID).toBe("home-data");
      expect(HOME_DATA_URL).toBe("/home-data.json");
   });

   it("warns rather than throws on malformed JSON", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(parseHomeData("{oops")).toBeNull();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
   });
});
