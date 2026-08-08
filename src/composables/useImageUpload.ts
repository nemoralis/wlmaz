import { computed, reactive, ref, type Ref } from "vue";
import type { MonumentProps } from "../types";

export interface FileItem {
   id: string;
   file: File;
   preview: string;
   title: string;
   description: string;
   year?: number;
   latitude?: number;
   longitude?: number;
}

export interface UploadResult {
   filename: string;
   url: string;
}

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
   const uploadsEnabled = ref(true);
   const isDragging = ref(false);

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
                  item.year = date.getFullYear();
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

   const handleUpload = async () => {
      if (!isValid.value) return;

      isUploading.value = true;
      uploadProgress.value = 0;
      currentFileIndex.value = 0;

      // Apply bulk metadata if in bulk mode
      if (mode.value === "bulk") {
         files.value.forEach((f, index) => {
            // Only append number if there are multiple files
            f.title = files.value.length > 1 ? `${bulkForm.title} ${index + 1}` : bulkForm.title;
            f.description = bulkForm.description;
         });
      }

      // Process uploads sequentially
      try {
         for (let i = 0; i < files.value.length; i++) {
            currentFileIndex.value = i;
            const fileItem = files.value[i];

            // Create FormData
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

            // Send request
            const response = await fetch("/upload", {
               method: "POST",
               body: formData, // Browser handles Content-Type boundaries
            });

            // Read response as text first to handle non-JSON errors (like Nginx 413)
            const responseText = await response.text();
            let responseData;
            try {
               responseData = JSON.parse(responseText);
            } catch (_e) {
               throw new Error(
                  "Server returned an invalid response. This often happens if the file is too large for the server's Nginx configuration (client_max_body_size).",
               );
            }

            if (!response.ok) {
               throw new Error(responseData.error || `Upload failed for ${fileItem.file.name}`);
            }

            // The backend now returns { filename: "...", url: "..." }
            uploadResults.value.push({
               filename: responseData.filename,
               url: responseData.url,
            });

            // Update progress
            uploadProgress.value = Math.round(((i + 1) / files.value.length) * 100);
         }

         uploadComplete.value = true;
      } catch (error: any) {
         console.error("Upload failed", error);
         alert(`Error: ${error.message}`);
      } finally {
         isUploading.value = false;
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
      uploadsEnabled,
      isDragging,
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
   };
}
