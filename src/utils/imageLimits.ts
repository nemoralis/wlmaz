import sharp, { type Metadata } from "sharp";

/**
 * Explicit input guards for user-supplied upload images.
 *
 * Multer bounds the compressed size (20 MB), but a highly compressible image
 * can still expand to a very large pixel surface. Sharp's constructor limits
 * run before decoding, and the metadata assertion gives the upload route a
 * client-error path instead of a 500.
 */
export const MAX_IMAGE_PIXELS = 100_000_000;
export const MAX_IMAGE_DIMENSION = 8192;

export const SHARP_INPUT_OPTIONS = {
   limitInputPixels: MAX_IMAGE_PIXELS,
   limitInputChannels: 5,
   failOn: "error",
   sequentialRead: true,
} as const;

export class ImageTooLargeError extends Error {
   constructor(message = "Image exceeds the maximum pixel limit") {
      super(message);
      this.name = "ImageTooLargeError";
   }
}

export function createUploadSharp(buffer: Buffer) {
   return sharp(buffer, SHARP_INPUT_OPTIONS);
}

export function assertImageWithinLimits(metadata: Pick<Metadata, "width" | "height">): void {
   const { width, height } = metadata;
   if (!width || !height) {
      throw new Error("Image metadata is missing dimensions");
   }

   if (width * height > MAX_IMAGE_PIXELS) {
      throw new ImageTooLargeError(
         `Image has ${width * height} pixels; maximum is ${MAX_IMAGE_PIXELS}`,
      );
   }
}
