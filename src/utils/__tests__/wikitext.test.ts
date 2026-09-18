import { describe, expect, it, vi, afterEach } from "vitest";
import {
   buildCategoryText,
   buildDateTemplate,
   buildHeritageTemplate,
   buildLocationTemplate,
   buildUploadWikitext,
} from "../wikitext";

describe("buildDateTemplate", () => {
   afterEach(() => {
      vi.useRealTimers();
   });

   it("formats a date-only string with midnight time", () => {
      expect(buildDateTemplate("2025-06-15")).toBe("2025-06-15 00:00:00");
   });

   it("preserves time from a full datetime string", () => {
      expect(buildDateTemplate("2025-06-15 14:30:45")).toBe("2025-06-15 14:30:45");
   });

   it("pads month and day with leading zeros", () => {
      expect(buildDateTemplate("2025-01-05")).toBe("2025-01-05 00:00:00");
      expect(buildDateTemplate("2025-01-05 09:05:03")).toBe("2025-01-05 09:05:03");
   });

   it("falls back to today for undefined input", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));

      expect(buildDateTemplate(undefined)).toBe("2025-03-10 00:00:00");
   });

   it("falls back to today for empty string", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));

      expect(buildDateTemplate("")).toBe("2025-03-10 00:00:00");
   });

   it("falls back to today for malformed date", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));

      expect(buildDateTemplate("not-a-date")).toBe("2025-03-10 00:00:00");
      expect(buildDateTemplate("2025/06/15")).toBe("2025-03-10 00:00:00");
   });

   it("falls back to today for invalid month", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));

      expect(buildDateTemplate("2025-13-01")).toBe("2025-03-10 00:00:00");
      expect(buildDateTemplate("2025-13-01 10:00:00")).toBe("2025-03-10 00:00:00");
   });

   it("falls back to today for invalid day", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));

      expect(buildDateTemplate("2025-06-32")).toBe("2025-03-10 00:00:00");
   });

   it("falls back to today for invalid time components", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));

      expect(buildDateTemplate("2025-06-15 25:00:00")).toBe("2025-03-10 00:00:00");
      expect(buildDateTemplate("2025-06-15 12:60:00")).toBe("2025-03-10 00:00:00");
      expect(buildDateTemplate("2025-06-15 12:00:61")).toBe("2025-03-10 00:00:00");
   });

   it("falls back to today for partial datetime", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-03-10T12:00:00Z"));

      expect(buildDateTemplate("2025-06-15 14:30")).toBe("2025-03-10 00:00:00");
   });
});

describe("buildLocationTemplate", () => {
   it("formats valid coordinates", () => {
      expect(buildLocationTemplate("40.4093", "49.8671")).toBe("\n{{Location|40.4093|49.8671}}");
   });

   it("formats negative coordinates", () => {
      expect(buildLocationTemplate("-33.8688", "151.2093")).toBe("\n{{Location|-33.8688|151.2093}}");
   });

   it("formats zero coordinates", () => {
      expect(buildLocationTemplate("0", "0")).toBe("\n{{Location|0|0}}");
   });

   it("returns empty for undefined inputs", () => {
      expect(buildLocationTemplate(undefined, undefined)).toBe("");
   });

   it("returns empty for missing longitude", () => {
      expect(buildLocationTemplate("40.4093", undefined)).toBe("");
   });

   it("returns empty for missing latitude", () => {
      expect(buildLocationTemplate(undefined, "49.8671")).toBe("");
   });

   it("returns empty for non-numeric strings", () => {
      expect(buildLocationTemplate("abc", "def")).toBe("");
   });

   it("returns empty for latitude out of range", () => {
      expect(buildLocationTemplate("91", "49.8671")).toBe("");
      expect(buildLocationTemplate("-91", "49.8671")).toBe("");
   });

   it("returns empty for longitude out of range", () => {
      expect(buildLocationTemplate("40.4093", "181")).toBe("");
      expect(buildLocationTemplate("40.4093", "-181")).toBe("");
   });

   it("accepts boundary values", () => {
      expect(buildLocationTemplate("90", "180")).toBe("\n{{Location|90|180}}");
      expect(buildLocationTemplate("-90", "-180")).toBe("\n{{Location|-90|-180}}");
   });
});

describe("buildHeritageTemplate", () => {
   it("returns template with inventory ID", () => {
      expect(buildHeritageTemplate("AZE-1234")).toBe("\n{{Cultural Heritage Azerbaijan|AZE-1234}}");
   });

   it("returns empty for undefined", () => {
      expect(buildHeritageTemplate(undefined)).toBe("");
   });

   it("returns empty for empty string", () => {
      expect(buildHeritageTemplate("")).toBe("");
   });
});

describe("buildCategoryText", () => {
   it("returns category line", () => {
      expect(buildCategoryText("Baku landmarks")).toBe("\n[[Category:Baku landmarks]]");
   });

   it("returns empty for undefined", () => {
      expect(buildCategoryText(undefined)).toBe("");
   });

   it("returns empty for empty string", () => {
      expect(buildCategoryText("")).toBe("");
   });
});

describe("buildUploadWikitext", () => {
   const minimalParams = {
      description: "A historic building in Baku",
      licenseTemplate: "{{self|cc-by-sa-4.0}}",
      username: "TestUser",
   };

   it("builds wikitext with all fields", () => {
      const result = buildUploadWikitext({
         ...minimalParams,
         capturedAt: "2025-06-15",
         lat: "40.4093",
         lon: "49.8671",
         categories: "Baku landmarks",
         inventory: "AZE-1234",
      });

      expect(result).toContain("== {{int:filedesc}} ==");
      expect(result).toContain("|description={{en|1=A historic building in Baku}}");
      expect(result).toContain("{{Cultural Heritage Azerbaijan|AZE-1234}}");
      expect(result).toContain("|date=2025-06-15 00:00:00");
      expect(result).toContain("|source={{own}}");
      expect(result).toContain("|author=[[User:TestUser|TestUser]]");
      expect(result).toContain("{{Location|40.4093|49.8671}}");
      expect(result).toContain("== {{int:license-header}} ==");
      expect(result).toContain("{{self|cc-by-sa-4.0}}");
      expect(result).toContain("{{Wiki Loves Monuments 2026|az}}");
      expect(result).toContain("[[Category:Baku landmarks]]");
   });

   it("builds wikitext with minimal fields", () => {
      const result = buildUploadWikitext(minimalParams);

      expect(result).toContain("== {{int:filedesc}} ==");
      expect(result).toContain("|description={{en|1=A historic building in Baku}}");
      expect(result).toContain("|author=[[User:TestUser|TestUser]]");
      expect(result).toContain("{{self|cc-by-sa-4.0}}");
      expect(result).toContain("{{Wiki Loves Monuments 2026|az}}");
      // Should NOT contain heritage, location, or category lines
      expect(result).not.toContain("Cultural Heritage");
      expect(result).not.toContain("Location|");
      expect(result).not.toContain("[[Category:");
   });

   it("uses today's date when capturedAt is undefined", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-08-20T10:00:00Z"));

      const result = buildUploadWikitext(minimalParams);
      expect(result).toContain("|date=2025-08-20 00:00:00");

      vi.useRealTimers();
   });

   it("places heritage line inside Information description", () => {
      const result = buildUploadWikitext({
         ...minimalParams,
         inventory: "TEST-001",
      });

      const lines = result.split("\n");
      const descIdx = lines.findIndex((l) => l.startsWith("|description="));
      const heritageIdx = lines.findIndex((l) => l.includes("{{Cultural Heritage Azerbaijan|TEST-001}}"));
      // Heritage line immediately follows the description line
      expect(heritageIdx).toBe(descIdx + 1);
      expect(lines[heritageIdx]).toBe("{{Cultural Heritage Azerbaijan|TEST-001}}");
   });

   it("places location template between Information block and license header", () => {
      const result = buildUploadWikitext({
         ...minimalParams,
         lat: "40.4",
         lon: "49.8",
      });

      const lines = result.split("\n");
      const infoEnd = lines.findIndex((l) => l.startsWith("}}"));
      const licenseStart = lines.findIndex((l) => l.includes("{{int:license-header}}"));
      const locationLine = lines.findIndex((l) => l.includes("{{Location|"));

      expect(locationLine).toBeGreaterThan(infoEnd);
      expect(locationLine).toBeLessThan(licenseStart);
   });
});
