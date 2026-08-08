import { describe, expect, it } from "vitest";
import type { MonumentProps } from "../../types";
import {
   getCanonicalId,
   getCategoryUrl,
   getClosestWikiWidth,
   getDescriptionPage,
   getOptimizedImage,
   getSrcSet,
   isIdMatch,
} from "../monumentFormatters";

describe("getClosestWikiWidth", () => {
   it("returns the first supported width >= target", () => {
      expect(getClosestWikiWidth(100)).toBe(120);
      expect(getClosestWikiWidth(500)).toBe(500);
   });

   it("snaps to the largest supported width when target exceeds the list", () => {
      expect(getClosestWikiWidth(5000)).toBe(3840);
   });
});

describe("getOptimizedImage", () => {
   it("returns empty string for empty url", () => {
      expect(getOptimizedImage("")).toBe("");
   });

   it("appends a width param for Special:FilePath urls", () => {
      const url = "https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg";
      expect(getOptimizedImage(url)).toBe(`${url}?width=500`);
   });

   it("forces https", () => {
      const url = "http://commons.wikimedia.org/wiki/Special:FilePath/X.jpg";
      expect(getOptimizedImage(url)).toBe(
         `https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg?width=500`,
      );
   });

   it("passes through non-FilePath urls", () => {
      const url = "https://example.com/img.jpg";
      expect(getOptimizedImage(url)).toBe(url);
   });
});

describe("getSrcSet", () => {
   it("returns empty for non-FilePath urls", () => {
      expect(getSrcSet("https://example.com/img.jpg")).toBe("");
   });

   it("returns empty for empty url", () => {
      expect(getSrcSet("")).toBe("");
   });

   it("snaps and sorts candidate widths", () => {
      const url = "https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg";
      const result = getSrcSet(url, [500, 330, 400, 500]);
      expect(result).toBe(
         "https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg?width=330 330w, " +
            "https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg?width=500 500w",
      );
   });
});

describe("getDescriptionPage", () => {
   it("converts Special:FilePath to File page url", () => {
      expect(getDescriptionPage("https://commons.wikimedia.org/wiki/Special:FilePath/X.jpg")).toBe(
         "https://commons.wikimedia.org/wiki/File:X.jpg",
      );
   });

   it("returns empty for empty url", () => {
      expect(getDescriptionPage("")).toBe("");
   });
});

describe("getCategoryUrl", () => {
   const base: MonumentProps = {
      id: "AZ-1",
      name: "Test",
      lat: 0,
      lon: 0,
   };

   it("prefers commonsLink", () => {
      expect(
         getCategoryUrl({
            ...base,
            commonsLink: "https://commons.wikimedia.org/wiki/Category:Custom",
         }),
      ).toBe("https://commons.wikimedia.org/wiki/Category:Custom");
   });

   it("builds a category url from commonsCategory", () => {
      expect(getCategoryUrl({ ...base, commonsCategory: "Category:Azerbaijan" })).toBe(
         "https://commons.wikimedia.org/wiki/Category:Category%3AAzerbaijan",
      );
   });

   it("returns empty when neither link nor category exist", () => {
      expect(getCategoryUrl(base)).toBe("");
   });
});

describe("getCanonicalId", () => {
   it("returns the first id from a comma-separated inventory", () => {
      expect(getCanonicalId("AZ-01, AZ-02, AZ-03")).toBe("AZ-01");
   });

   it("returns empty for empty input", () => {
      expect(getCanonicalId(undefined)).toBe("");
   });
});

describe("isIdMatch", () => {
   it("matches a trimmed id in the inventory", () => {
      expect(isIdMatch("AZ-01, AZ-02", " AZ-02 ")).toBe(true);
   });

   it("returns false for non-matching ids", () => {
      expect(isIdMatch("AZ-01", "AZ-99")).toBe(false);
   });

   it("returns false for empty inputs", () => {
      expect(isIdMatch("", "AZ-01")).toBe(false);
      expect(isIdMatch("AZ-01", "")).toBe(false);
   });
});
