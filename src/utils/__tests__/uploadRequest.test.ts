import { describe, expect, it } from "vitest";
import { parseTitlesExistRequest, parseUploadFields } from "@/utils/uploadRequest.ts";

describe("parseUploadFields", () => {
   it("accepts and normalizes the upload form fields", () => {
      const result = parseUploadFields({
         title: "Monument",
         description: "A photo",
         license: "cc0",
         lat: "40.4",
         lon: "49.8",
         categories: "Monuments of Azerbaijan",
         inventory: "302",
         capturedAt: "2025-09-01 12:00:00",
      });

      expect(result).toEqual({
         ok: true,
         value: {
            title: "Monument",
            description: "A photo",
            license: "cc0",
            lat: "40.4",
            lon: "49.8",
            categories: "Monuments of Azerbaijan",
            inventory: "302",
            capturedAt: "2025-09-01 12:00:00",
         },
      });
   });

   it("treats missing and null optional fields as absent", () => {
      const result = parseUploadFields({
         title: "Monument",
         description: "A photo",
         license: null,
         categories: undefined,
      });

      expect(result).toEqual({
         ok: true,
         value: {
            title: "Monument",
            description: "A photo",
            license: undefined,
            lat: undefined,
            lon: undefined,
            categories: undefined,
            inventory: undefined,
            capturedAt: undefined,
         },
      });
   });

   it("rejects missing, non-string and non-object bodies", () => {
      expect(parseUploadFields(null)).toEqual({
         ok: false,
         error: "Missing title or description",
      });
      expect(parseUploadFields({ description: "A photo" })).toEqual({
         ok: false,
         error: "Missing title or description",
      });
      expect(parseUploadFields({ title: ["Monument"], description: "A photo" })).toEqual({
         ok: false,
         error: "Missing title or description",
      });
   });

   it("rejects non-string optional fields instead of coercing them", () => {
      expect(
         parseUploadFields({
            title: "Monument",
            description: "A photo",
            categories: ["one", "two"],
         }),
      ).toEqual({ ok: false, error: "Invalid categories field" });
      expect(
         parseUploadFields({
            title: "Monument",
            description: "A photo",
            capturedAt: 20250901,
         }),
      ).toEqual({ ok: false, error: "Invalid capturedAt field" });
   });

   it("enforces every length limit", () => {
      expect(parseUploadFields({ title: "x".repeat(256), description: "ok" })).toEqual({
         ok: false,
         error: "Input too long",
      });
      expect(parseUploadFields({ title: "ok", description: "x".repeat(2001) })).toEqual({
         ok: false,
         error: "Input too long",
      });
      expect(
         parseUploadFields({ title: "ok", description: "ok", categories: "x".repeat(256) }),
      ).toEqual({ ok: false, error: "Input too long" });
      expect(
         parseUploadFields({ title: "ok", description: "ok", inventory: "x".repeat(256) }),
      ).toEqual({ ok: false, error: "Input too long" });
      expect(
         parseUploadFields({ title: "ok", description: "ok", capturedAt: "x".repeat(21) }),
      ).toEqual({ ok: false, error: "Input too long" });
   });
});

describe("parseTitlesExistRequest", () => {
   it("trims, drops empty entries and keeps order", () => {
      expect(
         parseTitlesExistRequest({ titles: [" Monument 1.jpg ", "", null, "Monument 2.jpg"] }),
      ).toEqual({ ok: true, value: ["Monument 1.jpg", "Monument 2.jpg"] });
   });

   it("caps the batch at 50 non-empty titles", () => {
      const titles = Array.from({ length: 55 }, (_, index) => ` Monument ${index + 1}.jpg `);
      const result = parseTitlesExistRequest({ titles });

      expect(result.ok).toBe(true);
      if (result.ok) {
         expect(result.value).toHaveLength(50);
         expect(result.value[0]).toBe("Monument 1.jpg");
         expect(result.value[49]).toBe("Monument 50.jpg");
      }
   });

   it("rejects missing, empty and non-string entries", () => {
      expect(parseTitlesExistRequest({})).toEqual({
         ok: false,
         error: "Missing titles parameter",
      });
      expect(parseTitlesExistRequest({ titles: [] })).toEqual({
         ok: false,
         error: "Missing titles parameter",
      });
      expect(parseTitlesExistRequest({ titles: ["", null] })).toEqual({
         ok: false,
         error: "Missing titles parameter",
      });
      expect(parseTitlesExistRequest({ titles: ["ok.jpg", 42] })).toEqual({
         ok: false,
         error: "Invalid titles parameter",
      });
   });

   it("rejects titles over the MediaWiki length limit", () => {
      expect(parseTitlesExistRequest({ titles: ["x".repeat(256)] })).toEqual({
         ok: false,
         error: "Title too long",
      });
   });
});
