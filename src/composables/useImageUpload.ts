import { computed, reactive, ref, type Ref } from "vue";
import type { MonumentProps } from "../types";
import { nextFreeTitles } from "../utils/uploadFileNames";

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

const UPLOAD_TIMEOUT_MS = 120000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 1500;

// Commons API error codes that are safe to auto-retry (transient/server-side).
const TRANSIENT_ERROR_CODES = new Set([
   "http_error",
   "stashfailed",
   "internalerror",
   "uploaddisabled",
   "sessionlost",
]);

// Friendly Azerbaijani messages for known Commons upload error codes.
const UPLOAD_ERROR_MESSAGES: Record<string, string> = {
   fileexists: "Bu adda fayl artıq Vikianbarda mövcuddur.",
   "fileexists-shared-forbidden": "Bu adda fayl artıq mövcuddur və yenidən yüklənə bilməz.",
   "duplicate-archive": "Bu fayl artıq Vikianbarda başqa adda mövcuddur.",
   duplicate: "Bu fayl artıq Vikianbarda başqa adda mövcuddur.",
   duplicateversions:
      "Bu fayl artıq eyni məzmunla Vikianbarda mövcuddur. Başlığı dəyişdirin.",
   "no-change": "Bu adda eyni fayl artıq mövcuddur. Başlığı dəyişdirin.",
   "was-deleted": "Bu adda fayl əvvəllər silinib. Başlığı dəyişdirin.",
   "verify-error": "Fayl doğrulama müddəti bitdi. Yenidən cəhd edin.",
   "empty-file": "Fayl boşdur və yüklənə bilməz.",
   badfilename: "Bu fayl adı etibarsızdır.",
   "filename-too-short": "Fayl adı çox qısadır.",
   "title_check_failed":
      "Başlıqların mövcudluğunu yoxlamaq mümkün olmadı. İnternet bağlantınızı yoxlayıb yenidən cəhd edin.",
   "external-session-invalid": "Vikianbar sessiyası etibarsızdır. Səhifəni yeniləyib yenidən cəhd edin.",
   badtoken: "Təhlükəsizlik tokeni köhnəlmişdir. Səhifəni yeniləyib yenidən cəhd edin.",
   uploaddisabled: "Vikianbar yükləmələri müvəqqəti olaraq dayandırılıb.",
   stashfailed: "Vikianbar yükləmə xidməti xəta verdi. Yenidən cəhd edin.",
   internalerror: "Vikianbar daxili xəta verdi. Yenidən cəhd edin.",
   http_error: "Vikianbara qoşulma xətası. İnternet bağlantınızı yoxlayın.",
   timeout: "Yükləmə müddəti bitdi. Yenidən cəhd edin.",
};

const messageFor = (code: string | undefined, fallback: string): string =>
   (code && UPLOAD_ERROR_MESSAGES[code]) || fallback;

const isTransientError = (code: string | undefined, httpStatus?: number): boolean =>
   (!!code && TRANSIENT_ERROR_CODES.has(code)) || (httpStatus !== undefined && httpStatus >= 500);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isHeicFile = (file: File): boolean =>
   file.name.toLowerCase().endsWith(".heic") ||
   file.type === "image/heic" ||
   file.type === "image/heif";

/**
 * Encapsulates the file-selection and upload-to-Commons logic used by the
 * UploadModal, keyed off the currently selected monument.
 */
export function useImageUpload(monument: Ref<MonumentProps | null>) {
   const fileInput = ref<HTMLInputElement | null>(null);
   const files = ref<FileItem[]>([]);
   const isUploading = ref(false);
   const uploadProgress = ref(0);
   const currentFileIndex = ref(0);
   const mode = ref<"bulk" | "individual">("bulk");
   const uploadComplete = ref(false);
   const uploadResults = ref<UploadResult[]>([]);
   const uploadFailures = ref<UploadFailure[]>([]);
   const isRetrying = ref(false);
   const uploadsEnabled = ref(true);
   const isDragging = ref(false);
   // Server-driven: true when the backend is running in local MediaWiki dev mode
   // (uploads work without a Commons OAuth login). Never carries credentials.
   const localUploadEnabled = ref(false);
   const mediaWikiUrl = ref("");

   const bulkForm = reactive({
      title: "",
      description: "",
      license: "cc-by-sa-4.0",
   });

   const checkStatus = async () => {
      try {
         const res = await fetch("/upload/status");
         if (res.ok) {
            const data = await res.json();
            uploadsEnabled.value = data.enabled;
         }
      } catch (e) {
         console.error("Failed to check status", e);
      }

      // Fetch server-driven upload config (safe info only: dev mode flag + wiki
      // URL). Prod always reports non-local; the bot password never leaves the server.
      try {
         const res = await fetch("/upload/config");
         if (res.ok) {
            const data = await res.json();
            localUploadEnabled.value = !!data.localUploadEnabled;
            mediaWikiUrl.value = data.mediaWikiUrl || "";
         }
      } catch (e) {
         console.error("Failed to check upload config", e);
      }
   };

   const isValid = computed(() => {
      if (files.value.length === 0) return false;

      if (mode.value === "bulk") {
         return !!(bulkForm.title.trim() && bulkForm.description.trim());
      } else {
         // Check if ALL individual files have titles
         // Description can be optional for some flows, but let's enforce title
         return files.value.every((f) => f.title.trim().length > 0);
      }
   });

   const hasHeicFiles = computed(() => files.value.some((f) => isHeicFile(f.file)));

   const licenseDescription = computed(() => {
      const map: Record<string, string> = {
         "cc-by-sa-4.0":
            "Başqaları əsərinizi istifadə edə bilər, amma sizə istinad verməli və eyni lisenziya ilə paylaşmalıdırlar.",
         "cc-by-4.0":
            "Başqaları əsərinizi istifadə edə bilər, sadəcə sizə istinad vermələri kifayətdir.",
         cc0: "Əsərinizi ictimai varidata bağışlayırsınız. Heç bir məhdudiyyət yoxdur.",
      };
      return map[bulkForm.license] || "";
   });

   const licenseUrl = computed(() => {
      const map: Record<string, string> = {
         "cc-by-sa-4.0": "https://creativecommons.org/licenses/by-sa/4.0/deed.az",
         "cc-by-4.0": "https://creativecommons.org/licenses/by/4.0/deed.az",
         cc0: "https://creativecommons.org/publicdomain/zero/1.0/deed.az",
      };
      return map[bulkForm.license] || "#";
   });

   const resetForm = () => {
      files.value.forEach((f) => URL.revokeObjectURL(f.preview));
      files.value = [];
      bulkForm.title = "";
      bulkForm.description = "";
      bulkForm.license = "cc-by-sa-4.0";
      mode.value = "bulk";
      isUploading.value = false;
      uploadProgress.value = 0;
      currentFileIndex.value = 0;
      uploadComplete.value = false;
      uploadResults.value = [];
      uploadFailures.value = [];
      if (fileInput.value) fileInput.value.value = "";
   };

   /** Called when the modal opens: refreshes status and pre-fills the title. */
   const open = () => {
      checkStatus();

      if (monument.value) {
         const name = monument.value.itemLabel || "";
         const inv = monument.value.inventory;

         // Default to Inventory format first, will be updated to Year format if EXIF exists
         if (name && inv) {
            bulkForm.title = `${name} (${inv})`;
         } else if (name) {
            bulkForm.title = name;
         }
      }
   };

   const triggerFileInput = () => {
      fileInput.value?.click();
   };

   const processFiles = (newFiles: FileList | File[]) => {
      const incoming = Array.from(newFiles);

      const validFiles = incoming.filter(
         (file) => file.type.startsWith("image/") || isHeicFile(file),
      );

      if (validFiles.length === 0) return;

      const newItems: FileItem[] = validFiles.map((file) => ({
         id: Math.random().toString(36).substring(7),
         file,
         // HEIC files won't have previews (browsers can't display them)
         // Backend handles conversion to JPEG
         preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
         title: "",
         description: "",
      }));

      files.value = [...files.value, ...newItems];

      // Async EXIF processing for the new items
      newItems.forEach(async (item) => {
         try {
            const exifr = (await import("exifr")).default;
            const data = await exifr.parse(item.file, [
               "DateTimeOriginal",
               "latitude",
               "longitude",
            ]);

            if (data) {
               if (data.DateTimeOriginal) {
                  const date = new Date(data.DateTimeOriginal);
                  const y = date.getFullYear();
                  const m = date.getMonth() + 1;
                  const d = date.getDate();
                  item.year = y;
                  item.capturedAt = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
               }
               if (data.latitude && data.longitude) {
                  item.latitude = data.latitude;
                  item.longitude = data.longitude;
               }
            }
         } catch (e) {
            console.warn(`Could not parse EXIF for ${item.file.name}`, e);
         } finally {
            updateBulkTitleWithYear();
         }
      });
   };

   const updateBulkTitleWithYear = () => {
      if (!monument.value || mode.value !== "bulk") return;

      // Find the first available year
      const firstYear = files.value.find((f) => f.year)?.year;

      if (firstYear) {
         const name = monument.value.itemLabel || "Abidə";
         // Pattern: Name (Year)
         const newTitle = `${name} (${firstYear})`;

         // Only update if the user hasn't heavily customized the title
         // OR if it currently matches the default Inventory format
         const invFormat = `${name} (${monument.value.inventory})`;
         const nameOnly = name;

         if (!bulkForm.title || bulkForm.title === invFormat || bulkForm.title === nameOnly) {
            bulkForm.title = newTitle;
         }
      }
   };

   const handleFileChange = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (input.files) {
         processFiles(input.files);
         input.value = ""; // allow re-selecting same file
      }
   };

   const handleDrop = (event: DragEvent) => {
      isDragging.value = false;
      if (event.dataTransfer?.files) {
         processFiles(event.dataTransfer.files);
      }
   };

   const removeFile = (index: number) => {
      const removed = files.value.splice(index, 1)[0];
      URL.revokeObjectURL(removed.preview);
      if (files.value.length === 0 && fileInput.value) {
         fileInput.value.value = "";
      }
   };

   // Build the multipart request for a single file upload
      // (used for the initial upload and for retries).
      const buildFormData = (fileItem: FileItem): FormData => {
         const formData = new FormData();
         formData.append("file", fileItem.file);
         formData.append("title", fileItem.title);
         formData.append("description", fileItem.description);
         formData.append("license", bulkForm.license);

         // Add Coordinates (Prioritize EXIF > Monument > None)
         if (fileItem.latitude && fileItem.longitude) {
            formData.append("lat", fileItem.latitude.toString());
            formData.append("lon", fileItem.longitude.toString());
         } else if (monument.value?.lat && monument.value?.lon) {
            formData.append("lat", monument.value.lat.toString());
            formData.append("lon", monument.value.lon.toString());
         }

         // Add Commons Category if available
         if (monument.value?.commonsCategory) {
            formData.append("categories", monument.value.commonsCategory);
         }

         // Add inventory number if available (used for the heritage template)
         if (monument.value?.inventory) {
            formData.append("inventory", monument.value.inventory);
         }

         // Add EXIF capture date if available (server falls back to upload date)
         if (fileItem.capturedAt) {
            formData.append("capturedAt", fileItem.capturedAt);
         }

         return formData;
      };

      interface UploadAttemptResult {
         ok: boolean;
         result?: UploadResult;
         code?: string;
         httpStatus?: number;
         message?: string;
      }

      // Single POST attempt against /upload. Never throws; returns a structured
      // outcome so callers can decide on retrying.
      const attemptUpload = async (fileItem: FileItem): Promise<UploadAttemptResult> => {
         const formData = buildFormData(fileItem);
         try {
            const response = await fetch("/upload", {
               method: "POST",
               body: formData, // Browser handles Content-Type boundaries
               signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
            });

            // Read response as text first to handle non-JSON errors (like Nginx 413)
            const responseText = await response.text();
            let responseData;
            try {
               responseData = JSON.parse(responseText);
            } catch (_e) {
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

            // The backend returns { filename: "...", url: "..." }
            return {
               ok: true,
               result: {
                  filename: responseData.filename,
                  url: responseData.url,
               },
            };
         } catch (e: any) {
            // Timeout/network errors: map to a stable transient code
            return {
               ok: false,
               code: e?.name === "TimeoutError" ? "timeout" : "http_error",
               httpStatus: 502,
               message: "",
            };
         }
      };

      // Uploads one file with auto-retry on transient failures.
      const uploadSingleFile = async (fileItem: FileItem): Promise<{
         ok: boolean;
         result?: UploadResult;
         failure?: UploadFailure;
      }> => {
         let last: UploadAttemptResult | null = null;
         for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            if (attempt > 0) await sleep(RETRY_DELAY_MS);
            last = await attemptUpload(fileItem);
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
      };

      // Process uploads sequentially; each file's outcome is recorded and a
      // failure does not abort the rest of the batch (partial-success UX).
      const handleUpload = async () => {
         if (!isValid.value) return;

         isUploading.value = true;
         uploadProgress.value = 0;
         currentFileIndex.value = 0;
         uploadFailures.value = [];

         // Apply bulk metadata if in bulk mode
         if (mode.value === "bulk") {
            files.value.forEach((f, index) => {
               // Only append number if there are multiple files
               f.title = files.value.length > 1 ? `${bulkForm.title} ${index + 1}` : bulkForm.title;
               f.description = bulkForm.description;
            });

            // Multi-file batches skip numbers already taken on Commons so the
            // upload never collides with an existing file (e.g. a previous
            // batch already created "Monument 1", so we start at "Monument 2").
            if (files.value.length > 1) {
               try {
                  const freeTitles = await nextFreeTitles(
                     bulkForm.title,
                     files.value.length,
                     async (candidates) => {
                        const response = await fetch("/upload/titles-exist", {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ titles: candidates }),
                           signal: AbortSignal.timeout(10000),
                        });
                        if (!response.ok) {
                           throw new Error(`titles-exist HTTP ${response.status}`);
                        }
                        const data = await response.json();
                        return new Set<string>(data.existing || []);
                     },
                  );
                  files.value.forEach((f, index) => {
                     f.title = freeTitles[index];
                  });
               } catch (error) {
                  // Fail the batch up-front when availability can't be checked:
                  // safer than uploading blindly against possibly-taken titles.
                  console.error("Failed to check title availability", error);
                  const detail =
                     error instanceof Error ? error.message : messageFor("title_check_failed", "");
                  uploadFailures.value = files.value.map((f) => ({
                     fileItem: f,
                     name: f.file.name,
                     code: "title_check_failed",
                     message: detail || messageFor("title_check_failed", ""),
                  }));
                  return;
               }
            }
         }

         try {
            for (let i = 0; i < files.value.length; i++) {
               currentFileIndex.value = i;
               const fileItem = files.value[i];

               const { ok, result, failure } = await uploadSingleFile(fileItem);
               if (ok && result) {
                  uploadResults.value.push(result);
               } else if (failure) {
                  uploadFailures.value.push(failure);
               }

               // Update progress
               uploadProgress.value = Math.round(((i + 1) / files.value.length) * 100);
            }
         } finally {
            uploadComplete.value = true;
            isUploading.value = false;
         }
      };

      // Re-attempts the failed files, keeping their existing titles/descriptions.
      const retryFailed = async () => {
         if (isRetrying.value || uploadFailures.value.length === 0) return;

         isRetrying.value = true;
         uploadProgress.value = 0;
         currentFileIndex.value = 0;
         const pending = [...uploadFailures.value];
         uploadFailures.value = [];

         try {
            for (let i = 0; i < pending.length; i++) {
               currentFileIndex.value = i;
               const { ok, result, failure } = await uploadSingleFile(pending[i].fileItem);
               if (ok && result) {
                  uploadResults.value.push(result);
               } else if (failure) {
                  uploadFailures.value.push(failure);
               }
               uploadProgress.value = Math.round(((i + 1) / pending.length) * 100);
            }
         } finally {
            isRetrying.value = false;
         }
      };

      return {
         fileInput,
         files,
         isUploading,
         uploadProgress,
         currentFileIndex,
         mode,
         uploadComplete,
         uploadResults,
         uploadFailures,
         isRetrying,
         uploadsEnabled,
         isDragging,
         localUploadEnabled,
         mediaWikiUrl,
         bulkForm,
         isValid,
         hasHeicFiles,
         licenseDescription,
         licenseUrl,
         open,
         resetForm,
         triggerFileInput,
         handleFileChange,
         handleDrop,
         removeFile,
         handleUpload,
         retryFailed,
      };
   }
