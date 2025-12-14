<template>
   <div class="animate-slide-in">
      <h1 class="leaflet-sidebar-header">
         {{ monument ? "Abidə detalları" : "Abidə seç" }}
         <div class="flex items-center">
            <button
               v-if="monument"
               aria-label="Abidə linkini paylaş"
               class="mr-4 text-white/80 transition-colors hover:text-white"
               title="Paylaş"
               @click="$emit('share')"
            >
               <i class="fa-solid fa-share-nodes" aria-hidden="true"></i>
            </button>

            <div class="leaflet-sidebar-close" @click="$emit('close')">
               <i class="fa-solid fa-times"></i>
            </div>
         </div>
      </h1>

      <div class="mt-4">
         <div v-if="monument">
            <!-- Monument Header -->
            <div class="mb-1 flex items-start justify-between gap-3">
               <h2 class="text-xl leading-tight font-bold text-gray-900">
                  {{ monument.itemLabel }}
               </h2>

               <div class="flex shrink-0 items-center gap-1">
                  <a
                     v-if="monument.item"
                     :href="monument.item"
                     target="_blank"
                     rel="noopener noreferrer"
                     class="mt1 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                     title="Edit this item on Wikidata"
                  >
                     <i class="fa-solid fa-pen text-xs"></i>
                  </a>
                  <button
                     class="mt-1 rounded-full p-1.5 transition-colors hover:bg-blue-50 hover:text-blue-600"
                     :class="linkCopied ? 'bg-green-50 text-green-600' : 'text-gray-400'"
                     title="Paylaş"
                     @click="$emit('share')"
                  >
                     <i
                        class="fa-solid text-xs"
                        :class="linkCopied ? 'fa-check' : 'fa-share-nodes'"
                     ></i>
                  </button>
               </div>
            </div>

            <p v-if="monument.itemAltLabel" class="mt-1 text-sm text-gray-500 italic">
               {{ monument.itemAltLabel }}
            </p>

            <!-- Inventory Badge -->
            <div v-if="monument.inventory" class="mt-2 mb-3">
               <button
                  class="group inline-flex cursor-pointer items-center rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 transition-all duration-200 hover:border-gray-300 hover:bg-gray-200"
                  :class="inventoryCopied ? 'border-green-200 bg-green-100 text-green-700' : ''"
                  title="Click to copy ID"
                  @click="$emit('copy-inventory', monument.inventory)"
               >
                  <span v-if="!inventoryCopied" class="flex items-center">
                     İnventar: {{ monument.inventory }}
                     <i
                        class="fa fa-copy ml-1.5 hidden text-[10px] text-gray-500 group-hover:inline-block"
                     ></i>
                  </span>
                  <span v-else class="flex items-center gap-1">
                     <i class="fa fa-check"></i> Kopiyalandı!
                  </span>
               </button>
            </div>

            <p
               v-if="monument.itemDescription"
               class="mb-4 border-l-4 border-blue-100 pl-3 text-sm leading-relaxed text-gray-700"
            >
               {{ monument.itemDescription }}
            </p>

            <!-- Monument Image -->
            <div
               class="relative mb-4 h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
            >
               <div v-if="monument.image" class="h-full w-full">
                  <a :href="getDescriptionPage(monument.image)" target="_blank" rel="noopener">
                     <div
                        v-if="imageLoading"
                        class="absolute inset-0 z-10 flex animate-pulse items-center justify-center bg-gray-200"
                        aria-hidden="true"
                     >
                        <i class="fa-regular fa-image text-4xl text-gray-300"></i>
                     </div>

                     <img
                        :src="getOptimizedImage(monument.image)"
                        :srcset="getSrcSet(monument.image, [320, 500, 800, 1024])"
                        sizes="(max-width: 768px) 100vw, 400px"
                        class="h-full w-full object-cover transition-opacity duration-500"
                        :class="{
                           'opacity-0': imageLoading,
                           'opacity-100': !imageLoading,
                        }"
                        alt="Monument"
                        loading="lazy"
                        @load="onImageLoad"
                     />
                  </a>

                  <div
                     v-if="!imageLoading"
                     class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/70 to-transparent p-2 text-right"
                  >
                     <transition name="fade">
                        <span v-if="imageCredit" class="block truncate text-[10px] text-white/90">
                           <i class="fa-regular fa-copyright mr-0.5 text-[9px]"></i>
                           {{ imageCredit.author }}
                           <span class="mx-1 opacity-50">|</span>
                           {{ imageCredit.license }}
                        </span>
                     </transition>
                  </div>
               </div>

               <div
                  v-else
                  class="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400"
               >
                  <i class="fa fa-camera text-3xl opacity-50"></i>
                  <span class="text-sm font-medium">Şəkil yoxdur</span>
               </div>
            </div>

            <!-- Action Buttons -->
            <div class="mb-4 flex gap-2">
               <a
                  v-if="monument.image"
                  :href="getDescriptionPage(monument.image)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-gray-50 hover:text-blue-600"
                  title="Fayl detallarına bax"
               >
                  <i class="fa-solid fa-file-image text-sm"></i>
                  <span>Fayla bax</span>
               </a>

               <a
                  v-if="monument.commonsLink || monument.commonsCategory"
                  :href="getCategoryUrl(monument)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-gray-50 hover:text-blue-600"
                  title="Bu abidənin bütün şəkillər inə bax"
               >
                  <i class="fa-solid fa-images text-sm"></i>
                  <span>Bütün şəkillər</span>
               </a>
            </div>

            <!-- Upload Section -->
            <div class="border-t border-gray-100 pt-4">
               <div v-if="isAuthenticated">
                  <button
                     class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
                     @click="$emit('open-upload')"
                  >
                     <i class="fa fa-upload"></i>
                     Şəkil yüklə
                  </button>
               </div>

               <div v-else class="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
                  <p class="mb-2 font-medium text-blue-800">Şəkil yükləmək istəyirsiniz?</p>
                  <button
                     class="w-full rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                     @click="$emit('login')"
                  >
                     Daxil ol
                  </button>
               </div>
            </div>

            <!-- Metadata Section -->
            <div class="mt-8">
               <h3 class="mb-2 text-sm font-bold tracking-wide text-gray-900 uppercase">
                  Metadata
               </h3>
               <div class="rounded border border-gray-200 bg-gray-50 text-sm">
                  <!-- Coordinates -->
                  <div
                     v-if="monument.lat && monument.lon"
                     class="flex h-9 items-center justify-between border-b border-gray-200 p-2"
                  >
                     <span class="text-gray-500">Coordinates</span>
                     <div class="flex items-center gap-2">
                        <button
                           class="group flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-600"
                           title="Click to copy coordinates"
                           @click="$emit('copy-coords', monument.lat!, monument.lon!)"
                        >
                           <span v-if="!coordsCopied" class="flex items-center gap-1">
                              {{ monument.lat?.toFixed(4) }}, {{ monument.lon?.toFixed(4) }}
                              <i
                                 class="fa-regular fa-copy text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                              ></i>
                           </span>
                           <span v-else class="flex items-center gap-1 text-green-600">
                              <i class="fa fa-check"></i> Copied!
                           </span>
                        </button>
                        <a
                           :href="`https://www.google.com/maps?q=${monument.lat},${monument.lon}`"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="text-gray-400 transition-colors hover:text-green-600"
                           title="Open in Google Maps"
                        >
                           <i class="fa-solid fa-map-location-dot text-sm"></i>
                        </a>
                        <a
                           :href="`https://www.google.com/maps/dir/?api=1&destination=${monument.lat},${monument.lon}`"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="text-gray-400 transition-colors hover:text-blue-600"
                           title="Get Directions on Google Maps"
                        >
                           <i class="fa-solid fa-diamond-turn-right text-sm"></i>
                        </a>
                     </div>
                  </div>

                  <!-- Wikidata -->
                  <div v-if="monument.item" class="flex items-center justify-between p-2">
                     <span class="flex items-center gap-2 text-gray-500">
                        <CdxIcon :icon="cdxIconLogoWikidata" class="w-5 h-5 opacity-60" />
                        Vikidata
                     </span>
                     <a
                        :href="monument.item"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                     >
                        Elementə bax
                        <i class="fa fa-external-link-alt"></i>
                     </a>
                  </div>

                  <!-- Wikipedia -->
                  <div
                     v-if="monument.azLink"
                     class="flex items-center justify-between border-t border-gray-200 p-2"
                  >
                     <span class="flex items-center gap-2 text-gray-500">
                        <CdxIcon :icon="cdxIconLogoWikipedia" class="w-5 h-5 opacity-60" />
                        Vikipediya
                     </span>
                     <a
                        :href="monument.azLink"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                     >
                        Məqaləni oxu
                        <i class="fa fa-external-link-alt"></i>
                     </a>
                  </div>
               </div>
            </div>
         </div>

         <!-- Empty State -->
         <div
            v-else
            class="flex h-64 flex-col items-center justify-center px-4 text-center text-gray-400"
         >
            <i class="fa fa-map-marker-alt mb-4 text-4xl text-gray-300"></i>
            <p>Click on a blue or green marker on the map to see details here.</p>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { ref, watch } from "vue";
import type { MonumentProps } from "@/types";
import { CdxIcon } from '@wikimedia/codex';
import { cdxIconLogoWikipedia, cdxIconLogoWikidata } from '@wikimedia/codex-icons';
import {
   getOptimizedImage,
   getSrcSet,
   getDescriptionPage,
   getCategoryUrl,
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
