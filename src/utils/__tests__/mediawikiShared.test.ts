import { describe, expect, it } from "vitest";
import type { MediaWikiUploadResult } from "@/types/mediawiki.ts";
import { normalizeWikiTitle, pickUploadWarning } from "@/utils/mediawikiShared.ts";

describe("normalizeWikiTitle", () => {
   it("strips the File: prefix case-insensitively", () => {
      expect(normalizeWikiTitle("File:Monument.jpg")).toBe("monument.jpg");
      expect(normalizeWikiTitle("file:Monument.jpg")).toBe("monument.jpg");
   });

   it("normalizes underscores to spaces and collapses whitespace", () => {
      expect(normalizeWikiTitle("File:Nizami_Mausoleum")).toBe("nizami mausoleum");
      expect(normalizeWikiTitle("File:Nizami   Mausoleum")).toBe("nizami mausoleum");
   });

   it("trims and lowercases the result", () => {
      expect(normalizeWikiTitle("  File:Gəncə  ")).toBe("file:gəncə");
      expect(normalizeWikiTitle("File:Gəncə  ")).toBe("gəncə");
   });
});

describe("pickUploadWarning", () => {
   it("returns null for a clean upload result", () => {
      expect(pickUploadWarning({ filename: "x.jpg" })).toBeNull();
      expect(pickUploadWarning(undefined)).toBeNull();
      expect(pickUploadWarning({ filename: "x.jpg", result: "Success" })).toBeNull();
   });

   it("returns the first priority warning code when multiple are present", () => {
      const upload: MediaWikiUploadResult = {
         filename: "x.jpg",
         result: "Warning",
         warnings: {
            duplicate: ["dup"],
            badfilename: ["bad"],
         },
      };
      expect(pickUploadWarning(upload)).toEqual({
         code: "duplicate",
         info: "dup",
      });
   });

   it("favors the high-priority 'exists' warning", () => {
      const upload: MediaWikiUploadResult = {
         filename: "x.jpg",
         result: "Warning",
         warnings: {
            was_deleted: ["deleted"],
            exists: ["already there"],
         },
      };
      expect(pickUploadWarning(upload)?.code).toBe("exists");
   });

   it("joins array warning details into a comma-separated string", () => {
      const upload: MediaWikiUploadResult = {
         filename: "x.jpg",
         warnings: {
            duplicate: ["File:A.jpg", "File:B.jpg"],
         },
      };
      expect(pickUploadWarning(upload)).toEqual({
         code: "duplicate",
         info: "File:A.jpg, File:B.jpg",
      });
   });
});