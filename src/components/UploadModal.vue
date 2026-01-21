<template>
   <Teleport to="body">
      <Transition name="modal">
         <div
            v-if="isOpen"
            class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
            @click.self="closeModal"
         >
            <div
               ref="modalContainer"
               role="dialog"
               aria-modal="true"
               aria-labelledby="upload-modal-title"
               class="relative flex h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/20 bg-white/95 shadow-2xl backdrop-blur-sm md:flex-row"
            >
               <!-- Close Button (Mobile) -->
               <button
                  aria-label="Modulu bağla"
                  class="absolute top-4 right-4 z-10 rounded-full bg-white/80 p-2 text-gray-500 hover:bg-gray-100 md:hidden"
                  @click="closeModal"
               >
                  <font-awesome-icon :icon="['fas', 'times']" class="text-xl" aria-hidden="true" />
               </button>

               <!-- Hidden title for screen readers -->
               <h2 id="upload-modal-title" class="sr-only">Şəkil yüklə</h2>

               <!-- UPLOAD PROGRESS OVERLAY -->
               <div
                  v-if="isUploading"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                  class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
               >
                  <div class="w-full max-w-sm px-6 text-center">
                     <!-- Spinner -->
                     <div class="mb-6 inline-block">
                        <font-awesome-icon
                           :icon="['fas', 'circle-notch']"
                           spin
                           class="text-4xl text-blue-600"
                           aria-hidden="true"
                        />
                     </div>

                     <h3 class="mb-2 text-xl font-bold text-gray-900">Yüklənir...</h3>
                     <p class="mb-6 text-sm text-gray-500">
                        {{ currentFileIndex + 1 }} / {{ files.length }} şəkil yüklənir
                     </p>

                     <!-- Progress Bar -->
                     <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                           class="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                           :style="{ width: `${uploadProgress}%` }"
                           role="progressbar"
                           :aria-valuenow="uploadProgress"
                           aria-valuemin="0"
                           aria-valuemax="100"
                        ></div>
                     </div>
                     <div class="mt-2 text-right text-xs font-medium text-gray-400">
                        {{ uploadProgress }}%
                     </div>
                     <span class="sr-only">Yükləmə: {{ uploadProgress }}%</span>
                  </div>
               </div>

               <!-- SUCCESS VIEW -->
               <div
                  v-if="uploadComplete"
                  class="flex h-full w-full flex-col items-center justify-center bg-white p-8 text-center"
               >
                  <div
                     class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100"
                  >
                     <font-awesome-icon :icon="['fas', 'check']" class="text-4xl text-green-600" />
                  </div>
                  <h3 class="mb-2 text-2xl font-bold text-gray-900">Uğurla yükləndi!</h3>
                  <p class="mb-8 text-gray-500">
                     {{ uploadResults.length }} fayl Vikianbara yükləndi.
                  </p>

                  <div
                     class="mb-8 w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-left"
                  >
                     <div class="max-h-60 overflow-y-auto">
                        <div
                           v-for="(res, idx) in uploadResults"
                           :key="idx"
                           class="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 last:border-0 hover:bg-gray-50"
                        >
                           <div class="flex items-center truncate">
                              <font-awesome-icon
                                 :icon="['far', 'image']"
                                 class="mr-3 text-gray-400"
                              />
                              <span
                                 class="truncate text-sm font-medium text-gray-700"
                                 :title="res.filename"
                              >
                                 {{ stripExtension(res.filename) }}
                              </span>
                           </div>
                           <a
                              :href="res.url"
                              target="_blank"
                              class="ml-4 flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                           >
                              Bax
                              <font-awesome-icon
                                 :icon="['fas', 'external-link-alt']"
                                 class="ml-1 text-xs"
                              />
                           </a>
                        </div>
                     </div>
                  </div>

                  <div class="flex space-x-4">
                     <button
                        class="rounded-lg px-6 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                        @click="closeModal"
                     >
                        Bağla
                     </button>
                     <button
                        class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                        @click="resetForm"
                     >
                        Yeni Yükləmə
                     </button>
                  </div>
               </div>

               <!-- DISABLED STATE (Full Modal) -->
               <div
                  v-if="!uploadsEnabled"
                  class="flex h-full w-full flex-col items-center justify-center p-8 text-center"
               >
                  <div class="mb-6 rounded-full bg-red-100 p-6">
                     <font-awesome-icon :icon="['fas', 'ban']" class="text-5xl text-red-600" />
                  </div>
                  <h3 class="mb-3 text-2xl font-bold text-gray-900">Yükləmələr dayandırılıb</h3>
                  <p class="mb-8 max-w-md text-gray-600">
                     Vikianbara yükləmə xidməti müvəqqəti olaraq dayandırılıb. Zəhmət olmasa daha
                     sonra cəhd edin.
                  </p>
                  <button
                     class="rounded-lg bg-gray-100 px-8 py-3 font-medium text-gray-700 hover:bg-gray-200"
                     @click="closeModal"
                  >
                     Bağla
                  </button>
               </div>

               <!-- Left Side: Image Previews (Scrollable Grid) -->
               <div
                  v-else-if="!uploadComplete"
                  class="relative flex w-full flex-col bg-gray-50 md:w-5/12"
               >
                  <div class="flex items-center justify-between p-4 pb-2 md:hidden">
                     <h3 class="font-bold text-gray-900">Şəkillər ({{ files.length }})</h3>
                  </div>

                  <!-- Drop Zone / List -->
                  <div
                     class="flex grow flex-col overflow-y-auto p-4"
                     @dragover.prevent="isDragging = true"
                     @dragleave.prevent="isDragging = false"
                     @drop.prevent="handleDrop"
                  >
                     <!-- Empty State -->
                     <div
                        v-if="files.length === 0"
                        class="flex grow flex-col items-center justify-center rounded-xl border-3 border-dashed p-8 text-center transition-colors"
                        :class="[
                           isDragging
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-100',
                        ]"
                        @click="triggerFileInput"
                     >
                        <font-awesome-icon
                           :icon="['fas', 'cloud-arrow-up']"
                           class="mb-4 text-4xl text-blue-500"
                        />
                        <p class="text-sm font-medium">Şəkilləri buraya atın</p>
                        <p class="my-2 text-xs text-gray-400">- və ya -</p>
                        <button class="text-sm font-semibold text-blue-600 hover:underline">
                           Faylları seçin
                        </button>
                        <p class="mt-4 text-xs text-gray-400">PNG, JPG (max 20MB)</p>
                     </div>

                     <!-- File Grid -->
                     <div v-else class="space-y-4">
                        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-2">
                           <div
                              v-for="(file, index) in files"
                              :key="file.id"
                              class="group relative aspect-square overflow-hidden rounded-lg bg-gray-200"
                           >
                              <div
                                 v-if="!file.preview"
                                 class="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400"
                              >
                                 <font-awesome-icon
                                    :icon="['fas', 'circle-notch']"
                                    spin
                                    class="text-2xl"
                                 />
                              </div>
                              <img
                                 v-else
                                 :src="file.preview"
                                 class="h-full w-full object-cover transition-opacity duration-300"
                                 alt="Preview"
                              />
                              <div
                                 class="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20"
                              >
                                 <button
                                    class="absolute top-1 right-1 rounded-full bg-red-500 p-1.5 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-red-600"
                                    @click="removeFile(index)"
                                 >
                                    <font-awesome-icon :icon="['fas', 'times']" class="text-xs" />
                                 </button>
                              </div>
                              <div
                                 class="absolute bottom-0 left-0 w-full truncate bg-black/50 px-2 py-1 text-[10px] text-white"
                              >
                                 {{ file.file.name }}
                              </div>
                           </div>

                           <!-- Add More Button -->
                           <button
                              class="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                              @click="triggerFileInput"
                           >
                              <font-awesome-icon
                                 :icon="['fas', 'plus']"
                                 class="mb-1 text-2xl text-gray-400"
                              />
                              <span class="text-xs text-gray-500">Əlavə et</span>
                           </button>
                        </div>
                     </div>
                  </div>

                  <div
                     v-if="files.length > 0"
                     class="border-t border-gray-200 p-3 text-center text-xs text-gray-500"
                  >
                     {{ files.length }} şəkil seçilib
                  </div>

                  <label for="file-upload" class="sr-only">Fayl seçin</label>
                  <input
                     id="file-upload"
                     ref="fileInput"
                     type="file"
                     accept="image/*,.heic,.heif"
                     multiple
                     class="hidden"
                     @change="handleFileChange"
                  />
               </div>

               <!-- Right Side: Config Form -->
               <div v-if="!uploadComplete && uploadsEnabled" class="flex w-full flex-col md:w-7/12">
                  <!-- Header -->
                  <div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                     <div>
                        <h3 class="text-xl font-bold text-gray-900">Məlumatları daxil edin</h3>
                        <p v-if="monument" class="text-xs font-medium text-blue-600">
                           Seçilən abidə: {{ monument.itemLabel }}
                        </p>
                     </div>
                     <button
                        aria-label="Modulu bağla"
                        class="hidden rounded-full text-gray-400 hover:text-gray-600 md:block"
                        @click="closeModal"
                     >
                        <font-awesome-icon
                           :icon="['fas', 'times']"
                           class="text-xl"
                           aria-hidden="true"
                        />
                     </button>
                  </div>

                  <!-- Warnings -->
                  <div v-if="hasHeicFiles" class="px-6 pt-4">
                     <div
                        class="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700"
                     >
                        <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="mr-1" />
                        HEIC fayllarını Vikianbara yükləmək mümkün olmadığı üçün onlar avtomatik
                        olaraq
                        <strong>JPG</strong> formatına çevriləcək.
                     </div>
                  </div>

                  <!-- Mode Switcher -->
                  <div v-if="files.length > 1" class="px-6 py-3">
                     <div class="flex rounded-lg bg-gray-100 p-1">
                        <button
                           class="flex-1 rounded-md py-1.5 text-sm font-medium transition-all"
                           :class="
                              mode === 'bulk'
                                 ? 'bg-white text-blue-600 shadow-sm'
                                 : 'text-gray-500 hover:text-gray-700'
                           "
                           @click="mode = 'bulk'"
                        >
                           Eyni Məlumat
                        </button>
                        <button
                           class="flex-1 rounded-md py-1.5 text-sm font-medium transition-all"
                           :class="
                              mode === 'individual'
                                 ? 'bg-white text-blue-600 shadow-sm'
                                 : 'text-gray-500 hover:text-gray-700'
                           "
                           @click="mode = 'individual'"
                        >
                           Fərdi ({{ files.length }})
                        </button>
                     </div>
                  </div>

                  <!-- Content Area (Scrollable) -->
                  <div class="flex-1 overflow-y-auto px-6 py-4">
                     <!-- Zero State Hint -->
                     <div
                        v-if="files.length === 0"
                        class="flex h-full flex-col items-center justify-center text-gray-400"
                     >
                        <font-awesome-icon
                           :icon="['fas', 'pen-to-square']"
                           class="mb-3 text-3xl opacity-20"
                        />
                        <p>Şəkil seçdikdən sonra məlumatları burada doldurun.</p>
                     </div>

                     <form v-else class="space-y-6" @submit.prevent>
                        <!-- BULK MODE -->
                        <div v-if="mode === 'bulk'" class="space-y-4">
                           <div
                              v-if="files.length > 1"
                              class="rounded-lg bg-blue-50 p-3 text-sm text-blue-700"
                           >
                              <font-awesome-icon :icon="['fas', 'info-circle']" class="mr-1" />
                              Bu məlumatlar <strong>{{ files.length }}</strong> şəkilin hamısına
                              tətbiq olunacaq.
                           </div>
                           <div>
                              <label
                                 for="bulk-title"
                                 class="mb-1 block text-sm font-medium text-gray-700"
                                 >Başlıq (Ortaq)</label
                              >
                              <input
                                 id="bulk-title"
                                 v-model="bulkForm.title"
                                 type="text"
                                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                 placeholder="Məs: Qız Qalası ümumi görünüş"
                              />
                              <p v-if="files.length > 1" class="mt-1 text-xs text-gray-500">
                                 <font-awesome-icon
                                    :icon="['fas', 'sort-numeric-down']"
                                    class="mr-1"
                                 />
                                 Fayl adları avtomatik nömrələnəcək (Məs: "{{
                                    bulkForm.title || "Başlıq"
                                 }}
                                 1", "{{ bulkForm.title || "Başlıq" }} 2")
                              </p>
                              <p v-else class="mt-1 text-xs text-gray-500">
                                 <font-awesome-icon
                                    :icon="['fas', 'file-signature']"
                                    class="mr-1"
                                 />
                                 Bu başlıq fayl adı kimi istifadə olunacaq.
                              </p>
                           </div>
                           <div>
                              <label class="mb-1 block text-sm font-medium text-gray-700"
                                 >Lisenziya</label
                              >
                              <select
                                 v-model="bulkForm.license"
                                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                              >
                                 <option value="cc-by-sa-4.0">CC BY-SA 4.0 (Tövsiyə olunur)</option>
                                 <option value="cc-by-4.0">CC BY 4.0</option>
                                 <option value="cc0">CC0 (İctimai varidat)</option>
                              </select>
                              <p class="mt-1 text-xs text-gray-500">
                                 <font-awesome-icon :icon="['fas', 'info-circle']" class="mr-1" />
                                 {{ licenseDescription }}
                                 <a
                                    :href="licenseUrl"
                                    target="_blank"
                                    class="ml-1 text-blue-600 hover:text-blue-800 hover:underline"
                                    >(Ətraflı)</a
                                 >
                              </p>
                           </div>
                           <div>
                              <label
                                 for="bulk-description"
                                 class="mb-1 block text-sm font-medium text-gray-700"
                                 >Təsvir (Ortaq)</label
                              >
                              <textarea
                                 id="bulk-description"
                                 v-model="bulkForm.description"
                                 rows="4"
                                 class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                 placeholder="Bütün şəkillər üçün ümumi təsvir..."
                              ></textarea>
                           </div>
                        </div>

                        <!-- INDIVIDUAL MODE -->
                        <div v-else class="space-y-6">
                           <div
                              v-for="(file, idx) in files"
                              :key="file.id"
                              class="relative rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
                           >
                              <div class="mb-3 flex items-start gap-3">
                                 <img
                                    :src="file.preview"
                                    class="h-12 w-12 rounded bg-gray-100 object-cover shadow-sm"
                                 />
                                 <div class="min-w-0 flex-1">
                                    <h4
                                       class="truncate text-sm font-medium text-gray-900"
                                       :title="file.file.name"
                                    >
                                       {{ file.file.name }}
                                    </h4>
                                    <p class="text-xs text-gray-400">
                                       {{ (file.file.size / 1024 / 1024).toFixed(2) }} MB
                                    </p>
                                 </div>
                                 <div class="text-xs text-gray-400">#{{ idx + 1 }}</div>
                              </div>

                              <div class="space-y-3">
                                 <div>
                                    <input
                                       v-model="file.title"
                                       type="text"
                                       class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                       placeholder="Başlıq..."
                                    />
                                 </div>
                                 <div>
                                    <textarea
                                       v-model="file.description"
                                       rows="2"
                                       class="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                       placeholder="Təsvir..."
                                    ></textarea>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </form>
                  </div>

                  <!-- Footer -->
                  <div class="border-t border-gray-100 p-6">
                     <div class="flex justify-end space-x-3">
                        <button
                           type="button"
                           class="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                           @click="closeModal"
                        >
                           İmtina
                        </button>
                        <button
                           type="button"
                           :disabled="
                              !isValid || isUploading || files.length === 0 || !uploadsEnabled
                           "
                           class="flex min-w-[120px] items-center justify-center rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:from-blue-700 hover:to-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                           @click="handleUpload"
                        >
                           <template v-if="isUploading">
                              <font-awesome-icon
                                 :icon="['fas', 'circle-notch']"
                                 spin
                                 class="mr-2"
                              />
                              Yüklənir...
                           </template>
                           <span v-else>Yüklə ({{ files.length }})</span>
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </Transition>
   </Teleport>
</template>

<script lang="ts">
import { computed, defineComponent, reactive, ref, toRef, watch } from "vue";
import { useFocusTrap } from "../composables/useFocusTrap";
import type { MonumentProps } from "../types";

interface FileItem {
   id: string;
   file: File;
   preview: string;
   title: string;
   description: string;
   year?: number;
   latitude?: number;
   longitude?: number;
}

interface UploadResult {
   filename: string;
   url: string;
}

export default defineComponent({
   name: "UploadModal",
   props: {
      isOpen: {
         type: Boolean,
         required: true,
      },
      monument: {
         type: Object as () => MonumentProps | null,
         default: null,
      },
   },
   emits: ["close"],
   setup(props, { emit }) {
      const modalContainer = ref<HTMLElement | null>(null);
      const isOpen = toRef(props, "isOpen");

      // Initialize focus trap
      useFocusTrap(modalContainer, isOpen);

      const isDragging = ref(false);
      const fileInput = ref<HTMLInputElement | null>(null);
      const files = ref<FileItem[]>([]);
      const isUploading = ref(false);
      const uploadProgress = ref(0);
      const currentFileIndex = ref(0);
      const mode = ref<"bulk" | "individual">("bulk");
      const uploadComplete = ref(false);
      const uploadResults = ref<UploadResult[]>([]);
      const uploadsEnabled = ref(true);

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

      // Watch for opening to pre-fill data
      watch(
         () => props.isOpen,
         (newVal) => {
            if (newVal) {
               checkStatus();

               if (props.monument) {
                  // Pre-fill title if monument is provided
                  const name = props.monument.itemLabel || "";
                  const inv = props.monument.inventory;

                  // Default to Inventory format first, will be updated to Year format if EXIF exists
                  if (name && inv) {
                     bulkForm.title = `${name} (${inv})`;
                  } else if (name) {
                     bulkForm.title = name;
                  }
               }
            }
         },
      );

      const isValid = computed(() => {
         if (files.value.length === 0) return false;

         if (mode.value === "bulk") {
            return bulkForm.title.trim() && bulkForm.description.trim();
         } else {
            // Check if ALL individual files have titles
            // Description can be optional for some flows, but let's enforce title
            return files.value.every((f) => f.title.trim().length > 0);
         }
      });

      const hasHeicFiles = computed(() => {
         return files.value.some(
            (f) =>
               f.file.name.toLowerCase().endsWith(".heic") ||
               f.file.type === "image/heic" ||
               f.file.type === "image/heif",
         );
      });

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

      const closeModal = () => {
         if (isUploading.value) return;
         resetForm();
         emit("close");
      };

      const resetForm = () => {
         files.value.forEach((f) => URL.revokeObjectURL(f.preview));
         files.value = [];
         bulkForm.title = "";
         bulkForm.description = "";
         bulkForm.description = "";
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

      const triggerFileInput = () => {
         fileInput.value?.click();
      };

      const processFiles = (newFiles: FileList | File[]) => {
         const incoming = Array.from(newFiles);

         const validFiles = incoming.filter((file) => {
            const isHeic =
               file.name.toLowerCase().endsWith(".heic") ||
               file.type === "image/heic" ||
               file.type === "image/heif";
            return file.type.startsWith("image/") || isHeic;
         });

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
         if (!props.monument || mode.value !== "bulk") return;

         // Find the first available year
         const firstYear = files.value.find((f) => f.year)?.year;

         if (firstYear) {
            const name = props.monument.itemLabel || "Abidə";
            // Pattern: Name (Year)
            const newTitle = `${name} (${firstYear})`;

            // Only update if the user hasn't heavily customized the title
            // OR if it currently matches the default Inventory format
            const invFormat = `${name} (${props.monument.inventory})`;
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
               } else if (props.monument?.lat && props.monument?.lon) {
                  formData.append("lat", props.monument.lat.toString());
                  formData.append("lon", props.monument.lon.toString());
               }

               // Add Commons Category if available
               if (props.monument?.commonsCategory) {
                  formData.append("categories", props.monument.commonsCategory);
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
         modalContainer,
         isDragging,
         fileInput,
         files,
         mode,
         bulkForm,
         isUploading,
         isValid,
         triggerFileInput,
         handleFileChange,
         handleDrop,
         removeFile,
         closeModal,
         handleUpload,
         uploadComplete,
         uploadResults,
         resetForm,
         currentFileIndex,
         uploadProgress,
         stripExtension: (name: string) => name.replace(/\.[^/.]+$/, ""),
         licenseDescription,
         licenseUrl,
         hasHeicFiles,
         uploadsEnabled,
      };
   },
});
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
   transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
   opacity: 0;
}

/* Custom scrollbar for better look in modal */
::-webkit-scrollbar {
   width: 6px;
   height: 6px;
}
::-webkit-scrollbar-track {
   background: transparent;
}
::-webkit-scrollbar-thumb {
   background: #cbd5e1;
   border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
   background: #94a3b8;
}
</style>
