import { computed, onUnmounted, reactive, ref, watch, type Ref } from "vue";
import { extractExifData } from "@/composables/useExif.ts";
import type { MonumentProps } from "@/types";
import type {
   TitlesExistResponse,
   UploadConfigResponse,
   UploadStatusResponse,
} from "@/types/api.ts";
import { apiFetch } from "@/utils/apiClient.ts";
import {
   parseTitlesExistResponse,
   parseUploadConfigResponse,
   parseUploadStatusResponse,
} from "@/utils/apiGuards.ts";
import { getCanonicalId } from "@/utils/monumentFormatters.ts";
import { messageFor } from "@/utils/uploadErrors.ts";
import { nextFreeTitles } from "@/utils/uploadFileNames.ts";
import {
   isHeicFile,
   uploadSingleFile,
   type FileItem,
   type UploadFailure,
   type UploadResult,
} from "@/utils/uploadService.ts";

/**
 * The upload flow's single lifecycle value. `checking-titles` and `uploading`
 * are both "busy" (they show the progress overlay and block closing); keeping
 * them distinct makes the pre-flight title check a real state instead of an
 * unguarded prologue that could leave `isUploading` stuck.
 */
export type UploadPhase = "idle" | "checking-titles" | "uploading" | "complete" | "cancelled";

/**
 * Server-driven upload availability. The initial value is "checking", not
 * "enabled": if `/upload/status` cannot be reached the UI must fail closed
 * rather than offer an upload the server may reject.
 */
export type UploadAvailability = "checking" | "enabled" | "disabled" | "error";

/**
 * Encapsulates the file-selection and upload-to-Commons logic used by the
 * UploadModal, keyed off the currently selected monument.
 */
export function useImageUpload(monument: Ref<MonumentProps | null>) {
   const fileInput = ref<HTMLInputElement | null>(null);
   const files = ref<FileItem[]>([]);
   const phase = ref<UploadPhase>("idle");
   const uploadProgress = ref(0);
   const currentFileIndex = ref(0);
   const mode = ref<"bulk" | "individual">("bulk");
   const uploadResults = ref<UploadResult[]>([]);
   const uploadFailures = ref<UploadFailure[]>([]);
   const isRetrying = ref(false);
   const uploadAvailability = ref<UploadAvailability>("checking");
   const isDragging = ref(false);
   const abortController = ref<AbortController | null>(null);
   const isCancelled = ref(false);
   /** Latest status request; a stale failure must not overwrite a newer result. */
   let statusRequestId = 0;

   const uploadsEnabled = computed(() => uploadAvailability.value === "enabled");

   const isUploading = computed(
      () => phase.value === "checking-titles" || phase.value === "uploading",
   );
   const uploadComplete = computed(() => phase.value === "complete" || phase.value === "cancelled");
   const wasCancelled = computed(() => phase.value === "cancelled");
   const isBusy = computed(() => isUploading.value || isRetrying.value);
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
      const id = ++statusRequestId;
      uploadAvailability.value = "checking";

      try {
         const data = await apiFetch<UploadStatusResponse>("/upload/status", {
            parse: parseUploadStatusResponse,
            label: "upload status",
         });
         if (id === statusRequestId) {
            uploadAvailability.value = data.enabled ? "enabled" : "disabled";
         }
      } catch (e) {
         console.error("Failed to check status", e);
         // Unknown is not enabled: keep the upload action unavailable.
         if (id === statusRequestId) uploadAvailability.value = "error";
      }

      // Fetch server-driven upload config (safe info only: dev mode flag + wiki
      // URL). Prod always reports non-local; the bot password never leaves the server.
      try {
         const data = await apiFetch<UploadConfigResponse>("/upload/config", {
            parse: parseUploadConfigResponse,
            label: "upload config",
         });
         if (id === statusRequestId) {
            localUploadEnabled.value = data.localUploadEnabled;
            mediaWikiUrl.value = data.mediaWikiUrl;
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
      if (isBusy.value) return;
      files.value.forEach((f) => URL.revokeObjectURL(f.preview));
      files.value = [];
      bulkForm.title = "";
      bulkForm.description = "";
      bulkForm.license = "cc-by-sa-4.0";
      mode.value = "bulk";
      phase.value = "idle";
      isCancelled.value = false;
      abortController.value = null;
      uploadProgress.value = 0;
      currentFileIndex.value = 0;
      uploadResults.value = [];
      uploadFailures.value = [];
      isRetrying.value = false;
      if (fileInput.value) fileInput.value.value = "";
   };

   /** Called when the modal opens: refreshes status and pre-fills the title. */
   const open = () => {
      checkStatus();

      if (monument.value) {
         const name = monument.value.itemLabel || "";
         const inv = monument.value.inventory?.join(", ");

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
         const exif = await extractExifData(item.file);
         if (exif.year !== undefined) item.year = exif.year;
         if (exif.capturedAt) item.capturedAt = exif.capturedAt;
         if (exif.latitude) item.latitude = exif.latitude;
         if (exif.longitude) item.longitude = exif.longitude;
         updateBulkTitleWithYear();
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
         const invFormat = `${name} (${monument.value.inventory?.join(", ")})`;
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

   const cancelUpload = () => {
      if (!isBusy.value) return;
      isCancelled.value = true;
      abortController.value?.abort();
      abortController.value = null;
   };

   const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
   };

   watch(isBusy, (busy) => {
      if (busy) {
         window.addEventListener("beforeunload", beforeUnloadHandler);
      } else {
         window.removeEventListener("beforeunload", beforeUnloadHandler);
      }
   });

   onUnmounted(() => {
      window.removeEventListener("beforeunload", beforeUnloadHandler);
   });

   /** Extracts monument data as plain values for the upload service. */
   const monumentData = () => ({
      lat: monument.value?.lat,
      lon: monument.value?.lon,
      commonsCategory: monument.value?.commonsCategory,
      // Uploaded records are stored against the single canonical register id.
      inventory: getCanonicalId(monument.value?.inventory) || undefined,
   });

   // Process uploads sequentially; each file's outcome is recorded and a
   // failure does not abort the rest of the batch (partial-success UX).
   const handleUpload = async () => {
      if (!isValid.value || isBusy.value) return;

      const controller = new AbortController();
      phase.value = "checking-titles";
      isCancelled.value = false;
      abortController.value = controller;
      uploadProgress.value = 0;
      currentFileIndex.value = 0;
      uploadResults.value = [];
      uploadFailures.value = [];

      try {
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
                        const data = await apiFetch<TitlesExistResponse>("/upload/titles-exist", {
                           method: "POST",
                           headers: { "Content-Type": "application/json" },
                           body: JSON.stringify({ titles: candidates }),
                           parse: parseTitlesExistResponse,
                           timeoutMs: 10_000,
                           signal: controller.signal,
                           label: "titles-exist",
                        });
                        return new Set(data.existing);
                     },
                  );
                  files.value.forEach((f, index) => {
                     f.title = freeTitles[index];
                  });
               } catch (error) {
                  // Cancelling is not a failure; settle in `finally`.
                  if (isCancelled.value) return;

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

         if (isCancelled.value) return;

         phase.value = "uploading";
         const md = monumentData();
         const signal = controller.signal;
         for (let i = 0; i < files.value.length; i++) {
            if (isCancelled.value) break;
            currentFileIndex.value = i;
            const fileItem = files.value[i];

            const { ok, result, failure } = await uploadSingleFile(
               fileItem,
               bulkForm.license,
               md,
               signal,
            );
            if (ok && result) {
               uploadResults.value.push(result);
            } else if (failure) {
               uploadFailures.value.push(failure);
            }

            // Update progress
            uploadProgress.value = Math.round(((i + 1) / files.value.length) * 100);
         }
      } finally {
         abortController.value = null;
         // Every path — success, partial failure, title-check failure, cancel —
         // must settle the machine, otherwise the progress overlay cannot close.
         // Cancellation is a distinct terminal state so the results view can
         // say "stopped" instead of claiming a successful zero-file upload.
         phase.value = isCancelled.value ? "cancelled" : "complete";
      }
   };

   // Re-attempts the failed files, keeping their existing titles/descriptions.
   const retryFailed = async () => {
      if (isBusy.value || uploadFailures.value.length === 0) return;

      // A title-check failure has no upload to retry — the batch never started.
      // Re-run the full flow so titles are checked and renumbered again.
      if (uploadFailures.value.some((failure) => failure.code === "title_check_failed")) {
         await handleUpload();
         return;
      }

      const controller = new AbortController();
      isRetrying.value = true;
      isCancelled.value = false;
      // Leaving "cancelled" behind would keep the old terminal message while
      // this retry is running; the results overlay stays open either way.
      phase.value = "complete";
      abortController.value = controller;
      uploadProgress.value = 0;
      currentFileIndex.value = 0;
      const pending = [...uploadFailures.value];
      uploadFailures.value = [];

      const md = monumentData();
      try {
         for (let i = 0; i < pending.length; i++) {
            if (isCancelled.value) {
               // Put the untouched files back so they can still be retried.
               uploadFailures.value.push(...pending.slice(i));
               break;
            }
            currentFileIndex.value = i;
            const { ok, result, failure } = await uploadSingleFile(
               pending[i].fileItem,
               bulkForm.license,
               md,
               controller.signal,
            );
            if (ok && result) {
               uploadResults.value.push(result);
            } else if (failure) {
               uploadFailures.value.push(failure);
            }
            uploadProgress.value = Math.round(((i + 1) / pending.length) * 100);
         }
      } finally {
         abortController.value = null;
         phase.value = isCancelled.value ? "cancelled" : "complete";
         isRetrying.value = false;
      }
   };

   return {
      fileInput,
      files,
      phase,
      isUploading,
      isBusy,
      isCancelled,
      uploadProgress,
      currentFileIndex,
      mode,
      uploadComplete,
      wasCancelled,
      uploadResults,
      uploadFailures,
      isRetrying,
      uploadsEnabled,
      uploadAvailability,
      checkStatus,
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
      cancelUpload,
      retryFailed,
   };
}
