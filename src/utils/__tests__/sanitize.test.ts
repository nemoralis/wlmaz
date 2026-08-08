import { describe, expect, it } from "vitest";
import { mapLicenseTemplate, sanitizeFilename, sanitizeWikitext } from "../sanitize";

describe("sanitizeWikitext", () => {
   it("strips link and category brackets", () => {
      expect(sanitizeWikitext("[[Category:Test]]")).toBe("Category:Test");
   });

   it("strips template braces", () => {
      expect(sanitizeWikitext("{{template}}")).toBe("template");
   });

   it("strips pipes", () => {
      expect(sanitizeWikitext("a|b|c")).toBe("abc");
   });

   it("trims surrounding whitespace", () => {
      expect(sanitizeWikitext("  hello  ")).toBe("hello");
   });

   it("handles empty and non-string input", () => {
      expect(sanitizeWikitext("")).toBe("");
      expect(sanitizeWikitext(undefined as unknown as string)).toBe("");
      expect(sanitizeWikitext(null as unknown as string)).toBe("");
   });
});

describe("sanitizeFilename", () => {
   it("replaces forbidden filename characters with underscores", () => {
      expect(sanitizeFilename("a/b:c?d*e\\f")).toBe("a_b_c_d_e_f");
   });

   it("strips control characters", () => {
      expect(sanitizeFilename("a\x00b\x1Fc")).toBe("abc");
   });

   it("cannot start with a space or dot", () => {
      expect(sanitizeFilename(" .hidden")).toBe("hidden");
   });

   it("truncates to 128 characters", () => {
      expect(sanitizeFilename("x".repeat(200))).toHaveLength(128);
   });

   it("handles empty input", () => {
      expect(sanitizeFilename("")).toBe("");
   });
});

describe("mapLicenseTemplate", () => {
   it("defaults to cc-by-sa-4.0", () => {
      expect(mapLicenseTemplate(undefined)).toBe("{{self|cc-by-sa-4.0}}");
      expect(mapLicenseTemplate("unknown")).toBe("{{self|cc-by-sa-4.0}}");
   });

   it("maps cc-by-4.0", () => {
      expect(mapLicenseTemplate("cc-by-4.0")).toBe("{{self|cc-by-4.0}}");
   });

   it("maps cc0", () => {
      expect(mapLicenseTemplate("cc0")).toBe("{{self|cc0}}");
   });
});
