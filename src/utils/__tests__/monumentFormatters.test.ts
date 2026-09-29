import { describe, expect, it } from "vitest";
import type { MonumentProps } from "@/types";
import {
   encodeIdForUrl,
   findDuplicateLabels,
   getCanonicalId,
   getCategoryUrl,
   getClosestWikiWidth,
   getDescriptionPage,
   getDisplayLabel,
   getOptimizedImage,
   getSrcSet,
   isIdMatch,
   resolveInventoryId,
   safeFileName,
   toInventoryIds,
} from "@/utils/monumentFormatters.ts";

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
      inventory: ["AZ-1"],
      itemLabel: "Test",
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

describe("toInventoryIds", () => {
   it("returns a trimmed copy of a list", () => {
      expect(toInventoryIds([" 38 ", "1945"])).toEqual(["38", "1945"]);
   });

   it("splits a legacy comma-separated string", () => {
      expect(toInventoryIds("38, 1945")).toEqual(["38", "1945"]);
   });

   it("drops empty entries and empty input", () => {
      expect(toInventoryIds(["38", "", "  "])).toEqual(["38"]);
      expect(toInventoryIds(", ,")).toEqual([]);
      expect(toInventoryIds([])).toEqual([]);
      expect(toInventoryIds(undefined)).toEqual([]);
      expect(toInventoryIds(null)).toEqual([]);
   });
});

describe("getCanonicalId", () => {
   it("returns the first id of an inventory list", () => {
      expect(getCanonicalId(["AZ-01", "AZ-02", "AZ-03"])).toBe("AZ-01");
   });

   it("accepts a comma-separated string for legacy values", () => {
      expect(getCanonicalId("AZ-01, AZ-02, AZ-03")).toBe("AZ-01");
   });

   it("returns empty for empty input", () => {
      expect(getCanonicalId(undefined)).toBe("");
      expect(getCanonicalId([])).toBe("");
   });
});

describe("isIdMatch", () => {
   it("matches a trimmed id in the inventory list", () => {
      expect(isIdMatch(["AZ-01", "AZ-02"], " AZ-02 ")).toBe(true);
   });

   it("matches a legacy comma-separated value", () => {
      expect(isIdMatch("AZ-01, AZ-02", "AZ-02")).toBe(true);
   });

   it("returns false for non-matching ids", () => {
      expect(isIdMatch(["AZ-01"], "AZ-99")).toBe(false);
   });

   it("returns false for empty inputs", () => {
      expect(isIdMatch("", "AZ-01")).toBe(false);
      expect(isIdMatch([], "AZ-01")).toBe(false);
      expect(isIdMatch(["AZ-01"], "")).toBe(false);
   });
});

describe("resolveInventoryId", () => {
   const has =
      (...ids: string[]) =>
      (id: string) =>
         ids.includes(id);

   it("resolves a single id", () => {
      expect(resolveInventoryId("38", has("38"))).toBe("38");
   });

   it("resolves a whole inventory string through its comma-separated parts", () => {
      expect(resolveInventoryId("38, 1945", has("38", "1945"))).toBe("38");
   });

   it("prefers the whole value when it is itself a key", () => {
      expect(resolveInventoryId("38, 1945", has("38, 1945", "1945"))).toBe("38, 1945");
   });

   it("falls through to a later part when the first has no marker", () => {
      expect(resolveInventoryId("38, 1945", has("1945"))).toBe("1945");
   });

   it("trims surrounding and inner whitespace", () => {
      expect(resolveInventoryId(" 38 ", has("38"))).toBe("38");
      expect(resolveInventoryId("38 , 1945", has("1945"))).toBe("1945");
   });

   it("keeps spaces inside a single id intact", () => {
      expect(resolveInventoryId("3166 -1", has("3166 -1"))).toBe("3166 -1");
   });

   it("returns null when nothing matches", () => {
      expect(resolveInventoryId("9999", has("38"))).toBeNull();
   });

   it("returns null for empty, missing and comma-only input", () => {
      expect(resolveInventoryId("", has("38"))).toBeNull();
      expect(resolveInventoryId(null, has("38"))).toBeNull();
      expect(resolveInventoryId(undefined, has("38"))).toBeNull();
      expect(resolveInventoryId(" , ", has("38"))).toBeNull();
   });
});

describe("encodeIdForUrl", () => {
   it("escapes dots to %2E so they survive path routing", () => {
      expect(encodeIdForUrl("AZ-01.2")).toBe("AZ-01%2E2");
   });

   it("URL-encodes non-ASCII characters", () => {
      expect(encodeIdForUrl("Gəncə")).toBe("G%C9%99nc%C9%99");
   });

   it("passes through plain alphanumeric ids unchanged", () => {
      expect(encodeIdForUrl("AZ-0001")).toBe("AZ-0001");
   });
});

describe("safeFileName", () => {
   it("keeps letters, digits, dashes and dots as-is", () => {
      expect(safeFileName("AZ-0001.2")).toBe("AZ-0001.2");
   });

   it("preserves non-ASCII (Unicode) letters like Azerbaijani ç/ə/ğ and №", () => {
      expect(safeFileName("Gəncə / № 2")).toBe("Gəncə___№_2");
   });

   it("replaces whitespace and characters unsafe for file systems with underscores", () => {
      expect(safeFileName("Gəncə/Qalası: A")).toBe("Gəncə_Qalası__A");
   });
});

describe("findDuplicateLabels", () => {
   it("returns only labels used more than once", () => {
      const dups = findDuplicateLabels(["Məscid", "Saray", "Məscid"]);
      expect([...dups]).toEqual(["Məscid"]);
   });

   it("returns an empty set when every label is unique", () => {
      expect(findDuplicateLabels(["Məscid", "Saray"]).size).toBe(0);
   });

   it("normalizes missing labels to the 'Abidə' fallback so they cannot collide silently", () => {
      const dups = findDuplicateLabels([undefined, "", "Saray"]);
      expect(dups.has("Abidə")).toBe(true);
      expect(dups.has("Saray")).toBe(false);
   });
});

describe("getDisplayLabel", () => {
   it("keeps a unique label untouched", () => {
      expect(getDisplayLabel("Məscid", "42", new Set())).toBe("Məscid");
   });

   it("appends the canonical inventory id for shared labels", () => {
      expect(getDisplayLabel("Yaşayış evi", "4996-12", new Set(["Yaşayış evi"]))).toBe(
         "Yaşayış evi (4996-12)",
      );
   });

   it("falls back to 'Abidə' for missing labels", () => {
      expect(getDisplayLabel(undefined, "5", new Set())).toBe("Abidə");
   });

   it("disambiguates label-less monuments when the fallback itself is shared", () => {
      expect(getDisplayLabel(undefined, "5", new Set(["Abidə"]))).toBe("Abidə (5)");
   });

   it("leaves a shared label bare when there is no inventory id to append", () => {
      expect(getDisplayLabel("Məscid", "", new Set(["Məscid"]))).toBe("Məscid");
   });
});
