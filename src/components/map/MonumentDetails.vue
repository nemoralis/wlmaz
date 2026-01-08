<template>
   <div class="animate-slide-in relative">
      <!-- 1. HERO IMAGE or HEADER -->
      <div v-if="monument" class="-mx-4 -mt-4 mb-6">
         <!-- Case A: Hero Image -->
         <div v-if="monument.image" class="group relative h-64 w-full overflow-hidden bg-gray-100">
            <a :href="getDescriptionPage(monument.image)" target="_blank" rel="noopener">
               <div
                  v-if="imageLoading"
                  class="absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-gray-200"
               >
                  <i class="fa-regular fa-image text-4xl text-gray-300"></i>
               </div>
               <img
                  :src="getOptimizedImage(monument.image)"
                  :srcset="getSrcSet(monument.image, [320, 500, 800])"
                  alt="Monument Hero"
                  class="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  :class="{ 'opacity-0': imageLoading, 'opacity-100': !imageLoading }"
                  @load="onImageLoad"
               />
               <!-- Gradient Overlay -->
               <div
                  class="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-90 transition-opacity group-hover:opacity-100"
               ></div>
            </a>

            <!-- Top Actions Overlay -->
            <div class="absolute top-0 right-0 left-0 flex items-start justify-end p-4">
               <div class="flex gap-2">
                  <button
                     class="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all"
                     :class="
                        linkCopied
                           ? 'scale-110 bg-green-500 text-white'
                           : 'bg-black/40 text-white hover:bg-white hover:text-black'
                     "
                     title="Share"
                     @click="$emit('share')"
                  >
                     <i
                        class="fa-solid text-sm"
                        :class="linkCopied ? 'fa-check' : 'fa-share-nodes'"
                     ></i>
                  </button>
                  <button
                     class="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
                     title="Close"
                     @click="$emit('close')"
                  >
                     <i class="fa-solid fa-times text-sm"></i>
                  </button>
               </div>
            </div>

            <!-- Image Credits (Bottom Right) -->
            <div class="absolute right-0 bottom-0 left-0 p-4 text-right">
               <transition name="fade">
                  <span v-if="imageCredit" class="block truncate text-[10px] text-white/80">
                     <i class="fa-regular fa-copyright mr-1"></i>
                     {{ imageCredit.author }}
                  </span>
               </transition>
            </div>
         </div>

         <!-- Case B: No Image Header -->
         <div
            v-else
            class="relative flex h-64 w-full flex-col items-center justify-center bg-gray-200"
         >
            <!-- Top Actions Overlay -->
            <div class="absolute top-0 right-0 left-0 flex items-start justify-end p-4">
               <div class="flex gap-2">
                  <button
                     class="flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all"
                     :class="
                        linkCopied
                           ? 'scale-110 bg-green-500 text-white'
                           : 'bg-black/10 text-gray-600 hover:bg-white hover:text-black'
                     "
                     title="Share"
                     @click="$emit('share')"
                  >
                     <i
                        class="fa-solid text-sm"
                        :class="linkCopied ? 'fa-check' : 'fa-share-nodes'"
                     ></i>
                  </button>
                  <button
                     class="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-gray-600 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
                     title="Close"
                     @click="$emit('close')"
                  >
                     <i class="fa-solid fa-times text-sm"></i>
                  </button>
               </div>
            </div>

            <!-- Placeholder Content -->
            <div class="flex flex-col items-center text-gray-400">
               <i class="fa-solid fa-camera-slash mb-2 text-4xl"></i>
               <span class="font-medium text-gray-500">Şəkil yoxdur</span>
            </div>
         </div>
      </div>

      <!-- Header with Close Button for Empty State -->
      <div v-else class="mb-4 flex items-center justify-between text-gray-400">
         <span class="text-xs font-semibold tracking-wider uppercase">Məlumat paneli</span>
         <button class="hover:text-gray-600" @click="$emit('close')">
            <i class="fa-solid fa-times text-lg"></i>
         </button>
      </div>

      <!-- 2. CONTENT BODY -->
      <div v-if="monument">
         <!-- Title Section -->
         <div class="mb-6">
            <h2 class="mb-2 text-2xl leading-tight font-bold text-gray-900">
               {{ monument.itemLabel }}
            </h2>
            <p v-if="monument.itemAltLabel" class="text-sm text-gray-500 italic">
               {{ monument.itemAltLabel }}
            </p>

            <!-- Inventory Badge -->
            <div v-if="monument.inventory" class="mt-3 flex items-center gap-3">
               <button
                  class="group flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-200"
                  :class="{ '!bg-green-100 !text-green-700': inventoryCopied }"
                  title="Copy Inventory ID"
                  @click="$emit('copy-inventory', monument.inventory)"
               >
                  <span>#{{ monument.inventory }}</span>
                  <i
                     class="fa-solid text-[10px] opacity-40 transition-opacity group-hover:opacity-100"
                     :class="inventoryCopied ? 'fa-check opacity-100' : 'fa-copy'"
                  ></i>
               </button>

               <!-- Action Links Row -->
               <div class="flex items-center gap-1">
                  <a
                     v-if="monument.item"
                     :href="monument.item"
                     target="_blank"
                     class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                     title="Edit on Wikidata"
                  >
                     <CdxIcon :icon="cdxIconLogoWikidata" class="h-4.5 w-3.5 opacity-60" />
                  </a>
               </div>
            </div>
         </div>

         <!-- Description -->
         <div v-if="monument.itemDescription" class="mb-8 text-sm leading-relaxed text-gray-600">
            {{ monument.itemDescription }}
         </div>

         <!-- 3. ACTION GRID (Modern Buttons) -->
         <div class="mb-8 grid grid-cols-2 gap-3">
            <a
               v-if="monument.image"
               :href="getDescriptionPage(monument.image)"
               target="_blank"
               :class="
                  monument.commonsLink || monument.commonsCategory ? 'col-span-1' : 'col-span-2'
               "
               class="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
               <i class="fa-solid fa-expand text-gray-400"></i>
               Fayla bax
            </a>
            <a
               v-if="monument.commonsLink || monument.commonsCategory"
               :href="getCategoryUrl(monument)"
               target="_blank"
               :class="monument.image ? 'col-span-1' : 'col-span-2'"
               class="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
            >
               <i class="fa-regular fa-images text-gray-400"></i>
               Qalereya
            </a>

            <!-- Primary Action -->
            <button
               v-if="isAuthenticated"
               class="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]"
               @click="$emit('open-upload')"
            >
               <i class="fa-solid fa-camera"></i>
               Yeni şəkil yüklə
            </button>
            <button
               v-else
               class="col-span-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 py-3 text-sm font-bold text-blue-600 transition-colors hover:border-blue-300 hover:bg-blue-100"
               @click="$emit('login')"
            >
               <i class="fa-solid fa-right-to-bracket"></i>
               Şəkil yükləmək üçün daxil ol
            </button>
         </div>

         <!-- 4. INFO CHIPS (Metadata) -->
         <div>
            <h3 class="mb-3 text-xs font-bold tracking-wider text-gray-400 uppercase">
               Məlumat & Keçidlər
            </h3>

            <div class="flex flex-wrap gap-2">
               <!-- GPS Chip -->
               <div
                  v-if="monument.lat && monument.lon"
                  class="flex items-center rounded-full border border-gray-200 bg-white py-1 pr-1 pl-1 shadow-xs transition-colors"
                  :class="{ '!border-green-200 !bg-green-50': coordsCopied }"
               >
                  <button
                     class="flex cursor-pointer items-center gap-2 rounded-full px-2 py-0.5 text-xs font-medium text-gray-600 transition-all hover:bg-gray-100"
                     :class="{ '!bg-green-100 !text-green-700': coordsCopied }"
                     title="Kliklə və kopyala"
                     @click="$emit('copy-coords', monument.lat, monument.lon)"
                  >
                     <i
                        class="fa-solid transition-colors"
                        :class="
                           coordsCopied ? 'fa-check text-green-600' : 'fa-location-dot text-red-500'
                        "
                     ></i>
                     <span>{{ monument.lat.toFixed(4) }}, {{ monument.lon.toFixed(4) }}</span>
                  </button>

                  <div class="flex items-center gap-0.5 border-l border-gray-200 pl-1">
                     <a
                        :href="`https://www.google.com/maps?q=${monument.lat},${monument.lon}`"
                        target="_blank"
                        class="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-500"
                        title="Google Maps"
                     >
                        <i class="fa-solid fa-map"></i>
                     </a>

                     <a
                        :href="`https://www.google.com/maps/dir/?api=1&destination=${monument.lat},${monument.lon}`"
                        target="_blank"
                        class="flex h-6 w-6 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-500"
                        title="Yol tərifi"
                     >
                        <i class="fa-solid fa-diamond-turn-right"></i>
                     </a>
                  </div>
               </div>

               <!-- Wikipedia Chip -->
               <a
                  v-if="monument.azLink"
                  :href="monument.azLink"
                  target="_blank"
                  class="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 shadow-xs transition-colors hover:border-gray-300 hover:shadow-sm"
               >
                  <i class="fa-brands fa-wikipedia-w text-sm opacity-75"></i>
                  <span class="text-xs font-semibold text-gray-700">Wikipedia</span>
                  <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-gray-400"></i>
               </a>
            </div>
         </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex h-96 flex-col items-center justify-center text-center">
         <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <i class="fa-solid fa-map-location-dot text-2xl text-blue-500"></i>
         </div>
         <h3 class="mb-2 text-lg font-bold text-gray-800">Abidə Seçin</h3>
         <p class="max-w-[200px] text-sm text-gray-500">
            Detalları görmək üçün xəritədəki işarələrdən birinə klikləyin.
         </p>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import { CdxIcon } from "@wikimedia/codex";
import { cdxIconLogoWikidata } from "@wikimedia/codex-icons";
import type { MonumentProps } from "@/types";
import {
   getCategoryUrl,
   getDescriptionPage,
   getOptimizedImage,
   getSrcSet,
} from "@/utils/monumentFormatters";

interface Props {
   monument: MonumentProps | null;
   imageCredit: { author: string; license: string } | null;
   isAuthenticated: boolean;
   inventoryCopied: boolean;
   coordsCopied: boolean;
   linkCopied: boolean;
}

const props = defineProps<Props>();

defineEmits<{
   "open-upload": [];
   share: [];
   "copy-inventory": [inventory: string];
   "copy-coords": [lat: number, lon: number];
   login: [];
   close: [];
}>();

const imageLoading = ref(true);

const onImageLoad = () => {
   imageLoading.value = false;
};

// Reset image loading state when monument changes
watch(
   () => props.monument,
   () => {
      imageLoading.value = true;
   },
);
</script>

<style scoped>
@keyframes slideIn {
   from {
      opacity: 0;
      transform: translateX(20px);
   }
   to {
      opacity: 1;
      transform: translateX(0);
   }
}

.animate-slide-in {
   animation: slideIn 0.3s ease-out forwards;
}
</style>
