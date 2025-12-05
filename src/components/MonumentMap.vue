<template>
   <div class="relative h-full w-full overflow-hidden">
      <div id="sidebar" class="leaflet-sidebar collapsed">
         <div class="leaflet-sidebar-tabs">
            <ul role="tablist">
               <li>
                  <a href="#home" role="tab"><i class="fa fa-info"></i></a>
               </li>
               <li :class="{ disabled: !selectedMonument }">
                  <a href="#details" role="tab"><i class="fa fa-landmark"></i></a>
               </li>
            </ul>

            <ul role="tablist">
               <li>
                  <a
                     href="https://commons.wikimedia.org/wiki/Commons:Wiki_Loves_Monuments_2025_in_Azerbaijan"
                     target="_blank"
                     title="WLM Azerbaijan Page"
                  >
                     <i class="fa fa-external-link-alt"></i>
                  </a>
               </li>
               <li>
                  <a
                     href="https://github.com/nemoralis/wlmaz"
                     target="_blank"
                     rel="noopener noreferrer"
                     title="View Source on GitHub"
                  >
                     <i class="fa-brands fa-github"></i>
                  </a>
               </li>
            </ul>
         </div>

         <div class="leaflet-sidebar-content">
            <div class="leaflet-sidebar-pane" id="home">
               <h1 class="mt-4 mb-4 text-2xl font-bold text-gray-800">
                  Viki Abidələri Sevir Azərbaycan
               </h1>

               <!-- Search Box -->
               <div class="mb-6">
                  <div class="relative">
                     <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Abidə axtar (Ad, İnventar)..."
                        class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-sm shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                     />
                     <i class="fa fa-search absolute left-3 top-2.5 text-gray-400"></i>
                     <button
                        v-if="searchQuery"
                        @click="searchQuery = ''"
                        class="absolute right-3 top-2.5 cursor-pointer text-gray-400 hover:text-gray-600"
                     >
                        <i class="fa fa-times"></i>
                     </button>
                  </div>

                  <!-- Search Results -->
                  <div
                     v-if="searchQuery"
                     class="absolute left-0 right-0 z-50 mt-1 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl"
                     style="margin: 0 10px"
                  >
                     <div
                        v-if="searchResults.length === 0"
                        class="p-4 text-center text-sm text-gray-500"
                     >
                        Nəticə tapılmadı
                     </div>
                     <ul v-else class="divide-y divide-gray-100">
                        <li
                           v-for="result in searchResults"
                           :key="result.item.properties.id"
                           @click="flyToMonument(result.item)"
                           class="cursor-pointer px-4 py-3 transition-colors hover:bg-blue-50"
                        >
                           <div class="font-medium text-gray-800">
                              {{ result.item.properties.itemLabel }}
                           </div>
                           <div class="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                              <span
                                 v-if="result.item.properties.inventory"
                                 class="rounded bg-gray-100 px-1.5 py-0.5 font-mono"
                              >
                                 {{ result.item.properties.inventory }}
                              </span>
                              <span v-if="result.item.properties.image" class="text-green-600">
                                 <i class="fa fa-image"></i> Şəkilli
                              </span>
                           </div>
                        </li>
                     </ul>
                  </div>
               </div>

               <div class="mb-6 grid grid-cols-3 gap-2 text-center">
                  <div class="rounded-lg border border-blue-100 bg-blue-50 p-2">
                     <div class="text-xl font-bold text-blue-700">{{ stats.total }}</div>
                     <div class="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
                        Cəmi
                     </div>
                  </div>
                  <div class="rounded-lg border border-green-100 bg-green-50 p-2">
                     <div class="text-xl font-bold text-green-700">{{ stats.withImage }}</div>
                     <div class="text-[10px] font-bold tracking-wider text-green-600 uppercase">
                        Şəkilli
                     </div>
                  </div>
                  <div class="rounded-lg border border-red-100 bg-red-50 p-2">
                     <div class="text-xl font-bold text-red-700">
                        {{ stats.total - stats.withImage }}
                     </div>
                     <div class="text-[10px] font-bold tracking-wider text-red-600 uppercase">
                        Şəkilsiz
                     </div>
                  </div>
               </div>

               <!-- Filter Toggle -->
               <div class="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <span class="text-sm font-medium text-gray-700">Yalnız şəkilsizləri göstər</span>
                  <button
                     @click="toggleNeedsPhoto"
                     class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
                     :class="needsPhotoOnly ? 'bg-blue-600' : 'bg-gray-200'"
                  >
                     <span
                        class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                        :class="needsPhotoOnly ? 'translate-x-5' : 'translate-x-0'"
                     ></span>
                  </button>
               </div>

               <div class="mb-6">
                  <div class="mb-1 flex justify-between text-xs font-medium text-gray-500">
                     <span>Gedişat</span>
                     <span>{{ Math.round((stats.withImage / stats.total) * 100) || 0 }}%</span>
                  </div>
                  <div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
                     <div
                        class="h-2.5 rounded-full bg-green-500 transition-all duration-1000 ease-out"
                        :style="{ width: `${(stats.withImage / stats.total) * 100}%` }"
                     ></div>
                  </div>
               </div>

               <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h3 class="mb-3 font-bold text-gray-700">Xəritə Legenda</h3>
                  <div class="space-y-3">
                     <div class="flex items-center gap-3">
                        <div
                           class="h-[30px] w-[30px] rounded-full border-2 border-white shadow-sm"
                           style="background-color: #ef4444"
                        ></div>
                        <span class="text-sm font-medium text-gray-600">Şəkli yoxdur</span>
                     </div>
                     <div class="flex items-center gap-3">
                        <div
                           class="h-[30px] w-[30px] rounded-full border-2 border-white shadow-sm"
                           style="background-color: #10b981"
                        ></div>
                        <span class="text-sm font-medium text-gray-600">Şəkli var</span>
                     </div>
                  </div>
               </div>
            </div>

            <div class="leaflet-sidebar-pane" id="details">
               <h1 class="leaflet-sidebar-header">
                  {{ selectedMonument ? "Abidə detalları" : "Abidə seç" }}
                  <div class="flex items-center">
                     <button
                        v-if="selectedMonument"
                        @click="shareMonument"
                        class="mr-4 text-white/80 transition-colors hover:text-white"
                        title="Paylaş"
                     >
                        <i class="fa-solid fa-share-nodes"></i>
                     </button>

                     <div class="leaflet-sidebar-close">
                        <i class="fa-solid fa-times"></i>
                     </div>
                  </div>
               </h1>

               <div class="mt-4">
                  <div v-if="selectedMonument">
                     <div class="mb-1 flex items-start justify-between gap-3">
                        <h2 class="text-xl leading-tight font-bold text-gray-900">
                           {{ selectedMonument.itemLabel }}
                        </h2>

                        <a
                           v-if="selectedMonument.item"
                           :href="selectedMonument.item"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="mt-1 shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                           title="Edit this item on Wikidata"
                        >
                           <i class="fa-solid fa-pen text-xs"></i>
                        </a>
                     </div>

                     <p
                        v-if="selectedMonument.itemAltLabel"
                        class="mt-1 text-sm text-gray-500 italic"
                     >
                        {{ selectedMonument.itemAltLabel }}
                     </p>

                     <div v-if="selectedMonument.inventory" class="mt-2 mb-3">
                        <button
                           @click="copyInventory(selectedMonument.inventory)"
                           class="group inline-flex cursor-pointer items-center rounded border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800 transition-all duration-200 hover:border-gray-300 hover:bg-gray-200"
                           :class="
                              inventoryCopied ? 'border-green-200 bg-green-100 text-green-700' : ''
                           "
                           title="Click to copy ID"
                        >
                           <span v-if="!inventoryCopied" class="flex items-center">
                              İnventar: {{ selectedMonument.inventory }}
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
                        v-if="selectedMonument.itemDescription"
                        class="mb-4 border-l-4 border-blue-100 pl-3 text-sm leading-relaxed text-gray-700"
                     >
                        {{ selectedMonument.itemDescription }}
                     </p>

                     <div
                        class="relative mb-4 h-64 w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
                     >
                        <div v-if="selectedMonument.image" class="h-full w-full">
                           <a
                              :href="getDescriptionPage(selectedMonument.image)"
                              target="_blank"
                              rel="noopener"
                           >
                              <div
                                 v-if="imageLoading"
                                 class="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-100 text-gray-400"
                              >
                                 <div
                                    class="mb-2 h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"
                                 ></div>
                                 <span class="text-xs font-medium">Yüklənir...</span>
                              </div>

                              <img
                                 :src="getOptimizedImage(selectedMonument.image)"
                                 class="h-full w-full object-cover transition-opacity duration-500"
                                 :class="{
                                    'opacity-0': imageLoading,
                                    'opacity-100': !imageLoading,
                                 }"
                                 alt="Monument"
                                 loading="lazy"
                                 @load="imageLoading = false"
                              />
                           </a>

                           <div
                              v-if="!imageLoading"
                              class="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/70 to-transparent p-2 text-right"
                           >
                              <transition name="fade">
                                 <span
                                    v-if="imageCredit"
                                    class="block truncate text-[10px] text-white/90"
                                 >
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

                     <div class="mb-4 flex gap-2">
                        <a
                           v-if="selectedMonument.image"
                           :href="getDescriptionPage(selectedMonument.image)"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-gray-50 hover:text-blue-600"
                           title="Fayl detallarına bax"
                        >
                           <i class="fa-regular fa-file-image text-sm"></i>
                           <span>Fayla bax</span>
                        </a>

                        <a
                           v-if="selectedMonument.commonsLink || selectedMonument.commonsCategory"
                           :href="getCategoryUrl(selectedMonument)"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-center text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-blue-300 hover:bg-gray-50 hover:text-blue-600"
                           title="Bu abidənin bütün şəkillərinə bax"
                        >
                           <i class="fa-regular fa-images text-sm"></i>
                           <span>Bütün şəkillər</span>
                        </a>
                     </div>

                     <div class="border-t border-gray-100 pt-4">
                        <div v-if="auth.isAuthenticated">
                           <button
                              @click="openUploadModal"
                              class="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
                           >
                              <i class="fa fa-upload"></i>
                              Şəkil yüklə
                           </button>
                           <p class="mt-2 text-center text-xs text-gray-500">
                              Uploads are licensed under CC BY-SA 4.0
                           </p>
                        </div>

                        <div
                           v-else
                           class="rounded-lg border border-blue-100 bg-blue-50 p-4 text-center"
                        >
                           <p class="mb-2 font-medium text-blue-800">
                              Şəkil yükləmək istəyirsiniz?
                           </p>
                           <button
                              @click="auth.login"
                              class="w-full rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                           >
                              Daxil ol
                           </button>
                        </div>
                     </div>

                     <div class="mt-8">
                        <h3 class="mb-2 text-sm font-bold tracking-wide text-gray-900 uppercase">
                           Metadata
                        </h3>
                        <div class="rounded border border-gray-200 bg-gray-50 text-sm">
                           <div
                              class="flex h-9 items-center justify-between border-b border-gray-200 p-2"
                           >
                              <span class="text-gray-500">Coordinates</span>
                              <div class="flex items-center gap-2">
                                 <button
                                    @click="
                                       copyCoords(selectedMonument.lat!, selectedMonument.lon!)
                                    "
                                    class="group flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-600"
                                    title="Click to copy coordinates"
                                 >
                                    <span v-if="!coordsCopied" class="flex items-center gap-1">
                                       {{ selectedMonument.lat?.toFixed(4) }},
                                       {{ selectedMonument.lon?.toFixed(4) }}
                                       <i
                                          class="fa-regular fa-copy text-[10px] text-gray-400 opacity-0 transition-opacity group-hover:opacity-100"
                                       ></i>
                                    </span>
                                    <span v-else class="flex items-center gap-1 text-green-600">
                                       <i class="fa fa-check"></i> Copied!
                                    </span>
                                 </button>
                                 <a
                                    :href="`https://www.google.com/maps?q=${selectedMonument.lat},${selectedMonument.lon}`"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-400 transition-colors hover:text-green-600"
                                    title="Open in Google Maps"
                                 >
                                    <i class="fa-solid fa-map-location-dot text-sm"></i>
                                 </a>
                                 <a
                                    :href="`https://www.google.com/maps/dir/?api=1&destination=${selectedMonument.lat},${selectedMonument.lon}`"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="text-gray-400 transition-colors hover:text-blue-600"
                                    title="Get Directions on Google Maps"
                                 >
                                    <i class="fa-solid fa-diamond-turn-right text-sm"></i>
                                 </a>
                              </div>
                           </div>

                           <div
                              v-if="selectedMonument.item"
                              class="flex items-center justify-between p-2"
                           >
                              <span class="flex items-center gap-2 text-gray-500">
                                 <img
                                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Wikidata.svg/330px-Wikidata.svg.png"
                                    class="h-auto w-5 opacity-60"
                                    alt="Wikidata"
                                 />
                                 Vikidata
                              </span>
                              <a
                                 :href="selectedMonument.item"
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 class="flex items-center gap-1 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-800 hover:underline"
                              >
                                 Elementə bax
                                 <i class="fa fa-external-link-alt"></i>
                              </a>
                           </div>

                           <div
                              v-if="selectedMonument.azLink"
                              class="flex items-center justify-between border-t border-gray-200 p-2"
                           >
                              <span class="flex items-center gap-2 text-gray-500">
                                 <i class="fa-brands fa-wikipedia-w opacity-60"></i>
                                 Vikipediya
                              </span>
                              <a
                                 :href="selectedMonument.azLink"
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

                  <div
                     v-else
                     class="flex h-64 flex-col items-center justify-center px-4 text-center text-gray-400"
                  >
                     <i class="fa fa-map-marker-alt mb-4 text-4xl text-gray-300"></i>
                     <p>Click on a blue or green marker on the map to see details here.</p>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div ref="mapContainer" class="z-0 h-full w-full"></div>
   </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, shallowRef, nextTick, watch, computed } from "vue";
import L from "leaflet";
import Fuse from "fuse.js";
import "leaflet.markercluster";
import { LocateControl } from "leaflet.locatecontrol";
import { useAuthStore } from "../stores/auth";
import { MonumentProps } from "../types";
import type { FeatureCollection } from "geojson";
import DataWorker from "../workers/data.worker?worker";

// Sidebar & Plugins
import "leaflet-sidebar-v2/js/leaflet-sidebar.js";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";

// Utils
import {
   getMonumentIcon,
   getOptimizedImage,
   getDescriptionPage,
   getCategoryUrl,
} from "../utils/monumentFormatters";
import { useWikiCredits } from "../composables/useWikiCredits";
import { useClipboard } from "../composables/useClipboard";

// CSS
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default defineComponent({
   name: "MonumentMap",
   setup() {
      const auth = useAuthStore();
      const { imageCredit, fetchImageMetadata } = useWikiCredits();
      const { copied: inventoryCopied, copy: copyInventory } = useClipboard();
      const { copied: coordsCopied, copy: copyRawCoords } = useClipboard();
      const copyCoords = (lat: number, lon: number) => copyRawCoords(`${lat}, ${lon}`);

      const mapContainer = ref<HTMLElement | null>(null);
      const mapInstance = shallowRef<L.Map | null>(null);
      const sidebarInstance = shallowRef<L.Control | null>(null);
      const selectedMonument = ref<MonumentProps | null>(null);
      const imageLoading = ref(true);
      const stats = ref({ total: 0, withImage: 0 });
      const activeMarkerLayer = shallowRef<L.Marker | null>(null);
      const markerLookup = new Map<string, L.Marker>();
      let markersGroup: L.MarkerClusterGroup | null = null;
      let allMarkers: L.Marker[] = [];

      // Filter
      const needsPhotoOnly = ref(false);

      const toggleNeedsPhoto = () => {
         needsPhotoOnly.value = !needsPhotoOnly.value;
         updateMapFilter();
      };

      const updateMapFilter = () => {
         if (!markersGroup) return;
         
         markersGroup.clearLayers();

         if (needsPhotoOnly.value) {
            const filtered = allMarkers.filter((m: any) => !m.feature.properties.image);
            markersGroup.addLayers(filtered);
         } else {
            markersGroup.addLayers(allMarkers);
         }
      };

      // Search
      const searchQuery = ref("");
      const debouncedSearchQuery = ref("");
      const fuse = shallowRef<Fuse<any> | null>(null);
      let searchTimeout: ReturnType<typeof setTimeout>;

      watch(searchQuery, (newVal) => {
         clearTimeout(searchTimeout);
         searchTimeout = setTimeout(() => {
            debouncedSearchQuery.value = newVal;
         }, 300);
      });

      const searchResults = computed(() => {
         if (!debouncedSearchQuery.value || !fuse.value) return [];
         return fuse.value.search(debouncedSearchQuery.value).slice(0, 50);
      });

      const flyToMonument = (feature: any) => {
         const { inventory } = feature.properties;
         if (inventory && markerLookup.has(inventory)) {
            const marker = markerLookup.get(inventory)!;
            selectMonument(marker);
            searchQuery.value = "";
         }
      };

      // Watcher
      watch(selectedMonument, (newVal) => {
         const url = new URL(window.location.href);
         if (newVal && newVal.itemLabel) {
            document.title = `${newVal.itemLabel} | Viki Abidələri Sevir`;
            if (newVal.inventory) {
               url.searchParams.set("inventory", newVal.inventory);
               window.history.replaceState({}, "", url);
            }
            imageLoading.value = true;
            if (newVal.image) fetchImageMetadata(newVal.image);
         } else {
            document.title = "Viki Abidələri Sevir Azərbaycan";
            url.searchParams.delete("inventory");
            window.history.replaceState({}, "", url);
         }
      });

      const highlightMarker = (marker: L.Marker | null) => {
         if (activeMarkerLayer.value) {
            const el = activeMarkerLayer.value.getElement();
            el?.querySelector(".marker-pin")?.classList.remove("selected-highlight");
         }
         if (marker) {
            const el = marker.getElement();
            el?.querySelector(".marker-pin")?.classList.add("selected-highlight");
            activeMarkerLayer.value = marker;
         } else {
            activeMarkerLayer.value = null;
         }
      };

      const selectMonument = async (marker: L.Marker) => {
         if (!marker || !markersGroup) return;
         (markersGroup as any).zoomToShowLayer(marker, async () => {
            // Center map on marker
            mapInstance.value?.flyTo(marker.getLatLng(), 16);

            highlightMarker(marker);
            const props = (marker as any).feature.properties;
            selectedMonument.value = props;
            await nextTick();
            (sidebarInstance.value as any)?.open("details");
         });
      };

      const shareMonument = async () => {
         if (!selectedMonument.value) return;

         const url = window.location.href;
         const title = selectedMonument.value.itemLabel || "Abidə";
         const text = `Viki Abidələri Sevir: ${title}`;

         // Use Native Share if supported (Mobile)
         if (navigator.share) {
            try {
               await navigator.share({ title, text, url });
            } catch (err) {
               console.log("Share cancelled");
            }
         } else {
            // Fallback: Copy URL to clipboard
            await navigator.clipboard.writeText(url);
            alert("Link kopyalandı!"); // Or use a toast notification
         }
      };

      const openUploadModal = () => {
         console.log("Opening upload modal for", selectedMonument.value?.itemLabel);
      };

      onMounted(async () => {
         if (!mapContainer.value) return;

         // 1. Layers
         const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
         });
         const googleSatLayer = L.tileLayer("https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
            maxZoom: 20,
            attribution: "© Google",
         });
         const googleHybridLayer = L.tileLayer(
            "https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
            {
               maxZoom: 20,
               attribution: "© Google",
            },
         );

         // 2. Map
         const map = L.map(mapContainer.value, {
            zoomControl: false,
            layers: [osmLayer],
         }).setView([40.4093, 49.8671], 7);

         mapInstance.value = map;

         // 3. Layer Control
         const baseMaps = {
            Xəritə: osmLayer,
            "Peyk (Google)": googleSatLayer,
            "Hibrid (Google)": googleHybridLayer,
         };

         const layerControl = L.control
            .layers(baseMaps, undefined, { position: "topright" })
            .addTo(map);

         // Style the layer button
         const toggleBtn = layerControl
            .getContainer()
            ?.querySelector(".leaflet-control-layers-toggle");
         if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fa-solid fa-layer-group text-gray-600 text-sm"></i>';
         }

         L.control.zoom({ position: "topright" }).addTo(map);

         // 4. Sidebar
         const sidebar = (L.control as any)
            .sidebar({
               container: "sidebar",
               position: "left",
               autopan: true,
            })
            .addTo(map);

         sidebarInstance.value = sidebar;

         // Map Events
         map.on("click", () => {
            sidebar.close();
            highlightMarker(null);
         });

         sidebar.on("content", (e: any) => {
            if (e.id !== "details") {
               highlightMarker(null);
               selectedMonument.value = null;
               const url = new URL(window.location.href);
               url.searchParams.delete("inventory");
               window.history.replaceState({}, "", url);
            }
         });

         try {
            const worker = new DataWorker();
            worker.postMessage({ type: "INIT" });

            worker.onmessage = (e) => {
               if (e.data.type === "DATA_READY") {
                  const { geoData, fuseIndex } = e.data;
                  const allFeatures = geoData.features;

                  // Reconstruct Fuse with pre-computed index
                  const myIndex = Fuse.parseIndex(fuseIndex);
                  fuse.value = new Fuse(
                     allFeatures,
                     {
                        keys: [
                           "properties.itemLabel",
                           "properties.inventory",
                           "properties.itemAltLabel",
                        ],
                        threshold: 0.3,
                        ignoreLocation: true,
                     },
                     myIndex,
                  );

                  stats.value.total = allFeatures.length;
                  stats.value.withImage = allFeatures.filter((f: any) => f.properties.image).length;
                  markersGroup = L.markerClusterGroup({
                     showCoverageOnHover: false,
                     chunkedLoading: true,
                  });

                  const geoJsonLayer = L.geoJSON(geoData, {
                     pointToLayer: (feature, latlng) => {
                        const props = feature.properties as MonumentProps;
                        props.lat = latlng.lat;
                        props.lon = latlng.lng;

                        const hasImage = !!props.image;
                        const faIcon = getMonumentIcon(props.itemLabel);
                        const bgClass = hasImage ? "marker-has-image" : "marker-needs-image";

                        const customIcon = L.divIcon({
                           className: "custom-div-icon",
                           html: `<div class="marker-pin ${bgClass}">
                          <i class="fa-solid ${faIcon} text-white text-[14px]"></i>
                        </div>`,
                           iconSize: [30, 30],
                           iconAnchor: [15, 15],
                        });

                        const marker = L.marker(latlng, { icon: customIcon });
                        if (props.inventory) markerLookup.set(props.inventory, marker);

                        marker.on("click", (e) => {
                           L.DomEvent.stopPropagation(e);
                           selectMonument(marker);
                        });

                        return marker;
                     },
                  });

                  allMarkers = geoJsonLayer.getLayers() as L.Marker[];
                  markersGroup.addLayers(allMarkers);

                  map.addLayer(markersGroup);

                  new LocateControl({
                     keepCurrentZoomLevel: false,
                     flyTo: true,
                     position: "topright",
                  }).addTo(map);

                  const urlParams = new URLSearchParams(window.location.search);
                  const targetId = urlParams.get("inventory");

                  if (targetId && markerLookup.has(targetId)) {
                     const targetMarker = markerLookup.get(targetId)!;
                     selectMonument(targetMarker);
                  } else {
                     sidebar.open("home");
                  }
               } else if (e.data.type === "ERROR") {
                  console.error("Worker Error:", e.data.error);
               }
            };
         } catch (err) {
            console.error(err);
         }
      });

      onUnmounted(() => {
         if (mapInstance.value) {
            mapInstance.value.remove();
            mapInstance.value = null;
         }
      });

      return {
         mapContainer,
         auth,
         selectedMonument,
         imageLoading,
         inventoryCopied,
         copyInventory,
         coordsCopied,
         copyCoords,
         getOptimizedImage,
         getDescriptionPage,
         getCategoryUrl,
         imageCredit,
         openUploadModal,
         shareMonument,
         stats,
         searchQuery,
         searchResults,
         flyToMonument,
         needsPhotoOnly,
         toggleNeedsPhoto,
      };
   },
});
</script>
<style scoped>
/* 1. LAYOUT */
/* 1. LAYOUT & Z-INDEX (CRITICAL FIXES) */
:deep(.leaflet-sidebar) {
   position: absolute !important;
   /* Anchor top and bottom to fill parent exactly */
   top: 0;
   bottom: 0;
   height: auto !important; /* Disable fixed height */
   z-index: 2000 !important;
}
:deep(.leaflet-sidebar-tabs li.disabled) {
   opacity: 0.5;
   pointer-events: none;
}

img {
   max-width: 100%;
}

/* 2. MOBILE */
@media (max-width: 768px) {
   :deep(.leaflet-sidebar) {
      width: 40px !important;
      max-width: 40px !important;
   }
   :deep(.leaflet-sidebar:not(.collapsed)) {
      width: 100% !important;
      max-width: 100% !important;
   }

   :deep(.leaflet-sidebar-content) {
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
      padding-bottom: calc(80px + env(safe-area-inset-bottom)) !important;
      touch-action: pan-y !important;
      pointer-events: auto !important;
   }
}
/* 3. MARKERS */
:deep(.marker-pin) {
   width: 30px;
   height: 30px;
   border-radius: 50%;
   display: flex;
   align-items: center;
   justify-content: center;
   border: 2px solid white;
   box-shadow: 0 3px 6px rgba(0, 0, 0, 0.4);
   transition: all 0.2s ease;
}
:deep(.marker-pin:hover) {
   transform: scale(1.15);
   z-index: 1000 !important;
   cursor: pointer;
}
:deep(.marker-has-image) {
   background-color: #10b981;
}
:deep(.marker-needs-image) {
   background-color: #ef4444;
}
:deep(.marker-pin.selected-highlight) {
   border-color: #fbbf24 !important;
   box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.5) !important;
   transform: scale(1.3) !important;
   z-index: 9999 !important;
}

/* 4. THEME (Red) */
:deep(.leaflet-sidebar-header) {
   background-color: #8f0000 !important;
   color: white !important;
}
:deep(.leaflet-sidebar-close) {
   color: white !important;
   display: flex;
   align-items: center;
   justify-content: center;
}
:deep(.leaflet-sidebar-tabs > ul > li.active > a) {
   background-color: #8f0000 !important;
   color: white;
}

/* 5. CONTROLS */
:deep(.leaflet-control-layers-toggle) {
   background-image: none !important;
   width: 30px !important;
   height: 30px !important;
   background-color: white;
   border-radius: 4px;
   display: flex;
   align-items: center;
   justify-content: center;
   transition: background-color 0.1s;
}
:deep(.leaflet-control-layers-toggle:hover) {
   background-color: #f4f4f4;
}

:deep(.leaflet-control-layers-expanded) {
   padding: 12px !important;
   background: white;
   border-radius: 8px;
   box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15) !important;
   border: none !important;
   min-width: 160px;
   font-family: inherit;
}

:deep(.leaflet-control-layers label) {
   display: flex;
   align-items: center;
   margin-bottom: 8px;
   cursor: pointer;
   font-size: 13px;
   color: #374151;
}
:deep(.leaflet-control-layers label:hover) {
   color: #2563eb;
}
:deep(.leaflet-control-layers input[type="radio"]) {
   accent-color: #2563eb;
   width: 15px;
   height: 15px;
   margin-right: 10px;
   cursor: pointer;
}

:deep(.leaflet-control-layers),
:deep(.leaflet-control-zoom) {
   border: 2px solid rgba(0, 0, 0, 0.2) !important;
   border-radius: 4px;
   box-shadow: none !important;
   margin-right: 10px !important;
   margin-top: 10px !important;
}
:deep(.leaflet-control-layers.leaflet-control-layers-expanded) {
   border: none !important;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
   transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
   opacity: 0;
}
</style>
