/**
 * Upload HTTP service — pure functions for building requests and posting to
 * the server.  No Vue reactivity, no side effects beyond the fetch calls.
 *
 * Extracted from useImageUpload so the upload pipeline can be tested and
 * reasoned about independently of UI state.
 */

import { isTransientError, messageFor } from "./uploadErrors";

export interface FileItem {
   id: string;
   file: File;
   preview: string;
   title: string;
   description: string;
   year?: number;
   capturedAt?: string;
   latitude?: number;
   longitude?: number;
}

export interface UploadResult {
   filename: string;
   url: string;
}

export interface UploadFailure {
   fileItem: FileItem;
   name: string;
   code?: string;
   message: string;
}

interface MonumentData {
   lat?: number;
   lon?: number;
   commonsCategory?: string;
   inventory?: string;
}

interface UploadAttemptResult {
   ok: boolean;
   result?: UploadResult;
   code?: string;
   httpStatus?: number;
   message?: string;
}

const UPLOAD_TIMEOUT_MS = 120000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Builds a multipart FormData for a single file upload.
 *
 * All parameters are plain values — callers pass in data from their reactive
 * state at call time, keeping this function free of Vue dependencies.
 */
export function buildUploadFormData(
   fileItem: FileItem,
   license: string,
   monument: MonumentData,
): FormData {
   const formData = new FormData();
   formData.append("file", fileItem.file);
   formData.append("title", fileItem.title);
   formData.append("description", fileItem.description);
   formData.append("license", license);

   // Add Coordinates (Prioritize EXIF > Monument > None)
   if (fileItem.latitude && fileItem.longitude) {
      formData.append("lat", fileItem.latitude.toString());
      formData.append("lon", fileItem.longitude.toString());
   } else if (monument.lat && monument.lon) {
      formData.append("lat", monument.lat.toString());
      formData.append("lon", monument.lon.toString());
   }

   // Add Commons Category if available
   if (monument.commonsCategory) {
      formData.append("categories", monument.commonsCategory);
   }

   // Add inventory number if available (used for the heritage template)
   if (monument.inventory) {
      formData.append("inventory", monument.inventory);
   }

   // Add EXIF capture date if available (server falls back to upload date)
   if (fileItem.capturedAt) {
      formData.append("capturedAt", fileItem.capturedAt);
   }

   return formData;
}

/**
 * Single POST attempt against /upload.  Never throws — returns a structured
 * outcome so callers can decide on retrying.
 */
async function attemptUpload(
   fileItem: FileItem,
   license: string,
   monument: MonumentData,
): Promise<UploadAttemptResult> {
   const formData = buildUploadFormData(fileItem, license, monument);
   try {
      const response = await fetch("/upload", {
         method: "POST",
         body: formData,
         signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });

      // Read response as text first to handle non-JSON errors (like Nginx 413)
      const responseText = await response.text();
      let responseData;
      try {
         responseData = JSON.parse(responseText);
      } catch {
         return {
            ok: false,
            httpStatus: response.status,
            message:
               "Server yanlış cavab qaytardı. Bu, faylın server yükləmə limitindən böyük olması halında baş verə bilər.",
         };
      }

      if (!response.ok) {
         return {
            ok: false,
            httpStatus: response.status,
            code: responseData.code,
            message: responseData.details || responseData.error || "Yükləmə xətası",
         };
      }

      return {
         ok: true,
         result: {
            filename: responseData.filename,
            url: responseData.url,
         },
      };
   } catch (e: unknown) {
      const code = e instanceof Error && e.name === "TimeoutError" ? "timeout" : "http_error";
      return {
         ok: false,
         code,
         httpStatus: 502,
         message: "",
      };
   }
}

/**
 * Uploads one file with auto-retry on transient failures.
 */
export async function uploadSingleFile(
   fileItem: FileItem,
   license: string,
   monument: MonumentData,
): Promise<{
   ok: boolean;
   result?: UploadResult;
   failure?: UploadFailure;
}> {
   let last: UploadAttemptResult | null = null;
   for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(RETRY_DELAY_MS);
      last = await attemptUpload(fileItem, license, monument);
      if (last.ok) return { ok: true, result: last.result };
      if (!isTransientError(last.code, last.httpStatus)) break;
   }

   const message = last!.message || messageFor(last!.code, "Yükləmə zamanı xəta baş verdi.");
   return {
      ok: false,
      failure: {
         fileItem,
         name: fileItem.file.name,
         code: last!.code,
         message,
      },
   };
}

export const isHeicFile = (file: File): boolean =>
   file.name.toLowerCase().endsWith(".heic") ||
   file.type === "image/heic" ||
   file.type === "image/heif";
