import sharp from "sharp";

interface OptimizedImage {
   buffer: Buffer;
   mimetype: string;
   extension: string;
}

/**
 * Optimizes an image buffer for Wikimedia Commons upload.
 * - Resizes if dimensions are excessive (>5000px).
 * - Auto-rotates based on EXIF orientation.
 * - Converts to high-quality JPEG (95%).
 * - Preserves metadata (EXIF/IPTC/XMP) which is critical for Commons.
 */
export async function optimizeImage(buffer: Buffer): Promise<OptimizedImage> {
   try {
      const image = sharp(buffer);
      const metadata = await image.metadata();

      // Check if resizing is needed
      const MAX_DIMENSION = 8192; // Increased to 8K matches Commons "High Resolution" goal
      if (
         metadata.width &&
         metadata.height &&
         (metadata.width > MAX_DIMENSION || metadata.height > MAX_DIMENSION)
      ) {
         image.resize({
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: "inside",
            withoutEnlargement: true,
         });
      }

      // 1. rotate(): Auto-orient based on metadata
      // 2. jpeg(): 95% Quality, 4:4:4 Chroma, BASELINE (progressive: false)
      // Commons docs explicitly warn against Progressive JPEGs for large files.
      // 3. withMetadata(): KEEP EXIF DATA!
      const outputBuffer = await image
         .rotate()
         .jpeg({
            quality: 95,
            progressive: false, // Explicitly Baseline
            chromaSubsampling: "4:4:4", // Best color quality
         })
         .withMetadata()
         .toBuffer();

      return {
         buffer: outputBuffer,
         mimetype: "image/jpeg",
         extension: ".jpg",
      };
   } catch (error) {
      console.error(
         "Image optimization failed:",
         error instanceof Error ? error.message : error,
      );
      // Re-throw so the upload route responds with a proper 500 rather than
      // silently forwarding an application/octet-stream buffer to Commons,
      // which would result in an opaque, hard-to-diagnose upload rejection.
      throw error;
   }
}
