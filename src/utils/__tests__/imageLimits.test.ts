import { describe, expect, it } from "vitest";
import {
   assertImageWithinLimits,
   createUploadSharp,
   ImageTooLargeError,
   MAX_IMAGE_PIXELS,
   SHARP_INPUT_OPTIONS,
} from "@/utils/imageLimits.ts";

describe("upload image limits", () => {
   it("uses explicit Sharp guard options", () => {
      expect(SHARP_INPUT_OPTIONS.limitInputPixels).toBe(MAX_IMAGE_PIXELS);
      expect(SHARP_INPUT_OPTIONS.limitInputChannels).toBe(5);
      expect(SHARP_INPUT_OPTIONS.failOn).toBe("error");
      expect(SHARP_INPUT_OPTIONS.sequentialRead).toBe(true);
   });

   it("creates a Sharp instance with the upload limits", () => {
      // 1x1 transparent PNG.
      const png = Buffer.from(
         "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=",
         "base64",
      );
      const image = createUploadSharp(png);
      expect(typeof image.metadata).toBe("function");
   });

   it("accepts images within the pixel limit", () => {
      expect(() => assertImageWithinLimits({ width: 10000, height: 10000 })).not.toThrow();
   });

   it("rejects images above the pixel limit before conversion", () => {
      expect(() => assertImageWithinLimits({ width: 10001, height: 10000 })).toThrow(
         ImageTooLargeError,
      );
   });

   it("rejects metadata without dimensions", () => {
      expect(() => assertImageWithinLimits({ width: 0, height: 100 })).toThrow(
         "missing dimensions",
      );
   });
});
