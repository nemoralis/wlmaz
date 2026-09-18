/**
 * Extracts EXIF metadata from an image file for upload pre-filling.
 *
 * Dynamically imports `exifr` to keep it out of the main bundle.
 * Returns plain data — no Vue reactivity, no side effects.
 */
export interface ExifData {
   year?: number;
   capturedAt?: string;
   latitude?: number;
   longitude?: number;
}

export async function extractExifData(file: File): Promise<ExifData> {
   try {
      const exifr = (await import("exifr")).default;
      const data = await exifr.parse(file, [
         "DateTimeOriginal",
         "latitude",
         "longitude",
      ]);

      if (!data) return {};

      const result: ExifData = {};

      if (data.DateTimeOriginal) {
         const date = new Date(data.DateTimeOriginal);
         const y = date.getFullYear();
         const m = date.getMonth() + 1;
         const d = date.getDate();
         const hh = String(date.getHours()).padStart(2, "0");
         const mm = String(date.getMinutes()).padStart(2, "0");
         const ss = String(date.getSeconds()).padStart(2, "0");
         result.year = y;
         result.capturedAt = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")} ${hh}:${mm}:${ss}`;
      }

      if (data.latitude && data.longitude) {
         result.latitude = data.latitude;
         result.longitude = data.longitude;
      }

      return result;
   } catch {
      return {};
   }
}
