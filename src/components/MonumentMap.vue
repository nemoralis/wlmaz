<template>
  <div class="relative h-full w-full overflow-hidden">

    <div id="sidebar" class="leaflet-sidebar collapsed">
      <div class="leaflet-sidebar-tabs">

        <ul role="tablist">
          <li><a href="#home" role="tab"><i class="fa fa-bars"></i></a></li>
          <li :class="{ 'disabled': !selectedMonument }">
            <a href="#details" role="tab"><i class="fa fa-info"></i></a>
          </li>
        </ul>

        <ul role="tablist">

          <li>
            <a href="https://commons.wikimedia.org/wiki/Commons:Wiki_Loves_Monuments_2025_in_Azerbaijan" target="_blank"
              title="WLM Azerbaijan Page">
              <i class="fa fa-external-link-alt"></i>
            </a>
          </li>

          <li>
            <a href="https://github.com/nemoralis/wlmaz" target="_blank" rel="noopener noreferrer"
              title="View Source on GitHub">
              <i class="fa-brands fa-github"></i>
            </a>
          </li>

        </ul>
      </div>

      <div class="leaflet-sidebar-content">

        <div class="leaflet-sidebar-pane" id="home">
          <h1 class="text-2xl font-bold mb-4 text-gray-800 mt-4">WLM Azerbaijan</h1>
          <p class="text-gray-600 mb-4">
            Welcome! Click on any marker to view details or upload a photo.
          </p>

          <div class="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 class="font-bold text-gray-700 mb-2">Map Legend</h3>
            <div class="flex items-center gap-3 mb-2">
              <span class="w-4 h-4 rounded-full bg-[#34d399] border border-[#10b981]"></span>
              <span class="text-sm">Has Image</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-4 h-4 rounded-full bg-[#4285f4] border border-[#2a7ae2]"></span>
              <span class="text-sm">Needs Image</span>
            </div>
          </div>
        </div>

        <div class="leaflet-sidebar-pane" id="details">
          <h1 class="leaflet-sidebar-header">
            {{ selectedMonument ? 'Abidə detalları' : 'Abidə seç' }}
            <div class="leaflet-sidebar-close"><i class="fa fa-caret-left"></i></div>
          </h1>

          <div class="mt-4">
            <div v-if="selectedMonument">
              <div class="flex items-start justify-between gap-3 mb-1">

                <h2 class="text-xl font-bold text-gray-900 leading-tight">
                  {{ selectedMonument.itemLabel }}
                </h2>

                <a v-if="selectedMonument.item" :href="selectedMonument.item" target="_blank" rel="noopener noreferrer"
                  class="shrink-0 mt-1 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                  title="Edit this item on Wikidata">
                  <i class="fa-solid fa-pen text-xs"></i>
                </a>

              </div>

              <p v-if="selectedMonument.itemAltLabel" class="text-sm text-gray-500 italic mt-1">
                {{ selectedMonument.itemAltLabel }}
              </p>

              <div v-if="selectedMonument.inventory" class="mt-2 mb-3">
                <button @click="copyInventory(selectedMonument.inventory)"
                  class="group inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border transition-all duration-200 bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200 hover:border-gray-300 cursor-pointer"
                  :class="inventoryCopied ? 'bg-green-100 text-green-700 border-green-200' : ''"
                  title="Click to copy ID">
                  <span v-if="!inventoryCopied" class="flex items-center">
                    İnventar: {{ selectedMonument.inventory }}
                    <i class="fa fa-copy hidden group-hover:inline-block ml-1.5 text-[10px] text-gray-500"></i>
                  </span>

                  <span v-else class="flex items-center gap-1">
                    <i class="fa fa-check"></i> Kopiyalandı!
                  </span>
                </button>
              </div>

              <p v-if="selectedMonument.itemDescription"
                class="text-sm text-gray-700 mb-4 leading-relaxed border-l-4 border-blue-100 pl-3">
                {{ selectedMonument.itemDescription }}
              </p>

              <div class="mb-4 relative">

                <div v-if="selectedMonument.image">
                  <a :href="selectedMonument.image" target="_blank" rel="noopener">
                    <div v-if="imageLoading"
                      class="w-full h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center absolute top-0 left-0 z-10">
                      <i class="fa fa-image text-gray-300 text-3xl"></i>
                    </div>

                    <img :src="getOptimizedImage(selectedMonument.image)"
                      class="w-full h-auto max-h-[300px] object-cover rounded-lg shadow-sm border border-gray-200"
                      :class="{ 'opacity-0': imageLoading, 'opacity-100': !imageLoading }" alt="Monument" loading="lazy"
                      @load="imageLoading = false" />
                  </a>

                  <div class="text-right mt-1.5 min-h-4">
                    <transition name="fade">
                      <span v-if="imageCredit && !imageLoading" class="text-[10px] text-gray-500 block truncate">
                        <i class="fa-regular fa-copyright text-[9px] mr-0.5"></i>
                        {{ imageCredit.author }}
                        <span class="mx-1 text-gray-300">|</span>
                        {{ imageCredit.license }}
                      </span>
                    </transition>
                  </div>
                </div>

                <div v-else
                  class="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <i class="fa fa-camera text-2xl"></i>
                  <span class="text-sm font-medium">Şəkil yoxdur</span>
                </div>

              </div>
              <div class="flex gap-2 mb-4">
                <a v-if="selectedMonument.image" :href="getDescriptionPage(selectedMonument.image)" target="_blank"
                  rel="noopener noreferrer"
                  class="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-all text-xs font-semibold shadow-sm text-center"
                  title="Fayl detallarına bax">
                  <i class="fa-regular fa-file-image text-sm"></i>
                  <span>Fayla bax</span>
                </a>

                <a v-if="selectedMonument.commonsLink || selectedMonument.commonsCategory"
                  :href="getCategoryUrl(selectedMonument)" target="_blank" rel="noopener noreferrer"
                  class="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-blue-600 hover:border-blue-300 transition-all text-xs font-semibold shadow-sm text-center"
                  title="Bu abidənin bütün şəkillərinə bax">
                  <i class="fa-regular fa-images text-sm"></i>
                  <span>Bütün şəkillər</span>
                </a>
              </div>
              <div class="border-t border-gray-100 pt-4">

                <div v-if="auth.isAuthenticated">
                  <button @click="openUploadModal"
                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                    <i class="fa fa-upload"></i>
                    Şəkil yüklə
                  </button>
                </div>

                <div v-else class="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                  <p class="text-blue-800 font-medium mb-2">Şəkil yükləmək istəyirsiniz?</p>
                  <button @click="auth.login"
                    class="text-sm bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-md font-semibold hover:bg-blue-50 transition-colors w-full">
                    Daxil ol
                  </button>
                </div>
              </div>

              <div class="mt-8">
                <h3 class="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Metadata</h3>

                <div class="bg-gray-50 rounded border border-gray-200 text-sm">

                  <div class="p-2 border-b border-gray-200 flex justify-between items-center h-9"> <span
                      class="text-gray-500">Coordinates</span>

                    <div class="flex items-center gap-2">

                      <button @click="copyCoords(selectedMonument.lat!, selectedMonument.lon!)"
                        class="group font-mono text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-all text-xs cursor-pointer flex items-center gap-1.5"
                        title="Click to copy coordinates">
                        <span v-if="!coordsCopied" class="flex items-center gap-1">
                          {{ selectedMonument.lat?.toFixed(4) }}, {{ selectedMonument.lon?.toFixed(4) }}
                          <i
                            class="fa-regular fa-copy text-[10px] opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity"></i>
                        </span>

                        <span v-else class="flex items-center gap-1 text-green-600">
                          <i class="fa fa-check"></i> Copied!
                        </span>
                      </button>
                      <a :href="`https://www.google.com/maps?q=${selectedMonument.lat},${selectedMonument.lon}`"
                        target="_blank" rel="noopener noreferrer"
                        class="text-gray-400 hover:text-green-600 transition-colors" title="Open in Google Maps">
                        <i class="fa-solid fa-map-location-dot text-sm"></i>
                      </a>
                      <a :href="`https://www.google.com/maps/dir/?api=1&destination=${selectedMonument.lat},${selectedMonument.lon}`"
                        target="_blank" rel="noopener noreferrer"
                        class="text-gray-400 hover:text-blue-600 transition-colors"
                        title="Get Directions on Google Maps">
                        <i class="fa-solid fa-diamond-turn-right text-sm"></i>
                      </a>
                    </div>
                  </div>

                  <div v-if="selectedMonument.item" class="p-2 flex justify-between items-center">
                    <span class="text-gray-500 flex items-center gap-2">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Wikidata.svg/330px-Wikidata.svg.png"
                        class="w-5 h-auto opacity-60" alt="Wikidata" />
                      Vikidata
                    </span>

                    <a :href="selectedMonument.item" target="_blank" rel="noopener noreferrer"
                      class="text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold flex items-center gap-1 transition-colors">
                      Elementə bax
                      <i class="fa fa-external-link-alt"></i>
                    </a>
                  </div>
                  <div v-if="selectedMonument.azLink"
                    class="p-2 border-t border-gray-200 flex justify-between items-center">
                    <span class="text-gray-500 flex items-center gap-2">
                      <i class="fa-brands fa-wikipedia-w opacity-60"></i>
                      Vikipediya
                    </span>

                    <a :href="selectedMonument.azLink" target="_blank" rel="noopener noreferrer"
                      class="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1">
                      Məqaləni oxu
                      <i class="fa fa-external-link-alt"></i>
                    </a>
                  </div>

                </div>
              </div>

            </div>

            <div v-else class="flex flex-col items-center justify-center h-64 text-gray-400 text-center px-4">
              <i class="fa fa-map-marker-alt text-4xl mb-4 text-gray-300"></i>
              <p>Click on a blue or green marker on the map to see details here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div ref="mapContainer" class="h-full w-full z-0"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, ref, shallowRef, nextTick, watch } from "vue";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet-sidebar-v2";
import { LocateControl } from "leaflet.locatecontrol";
import { useAuthStore } from "../stores/auth";
import { MonumentProps } from "../types";

import {
  getMonumentIcon,
  getOptimizedImage,
  getDescriptionPage,
  getCategoryUrl
} from "../utils/monumentFormatters";
import { useWikiCredits } from "../composables/useWikiCredits";
import { useClipboard } from "../composables/useClipboard";
// CSS Imports
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

export default defineComponent({
  name: "MonumentMap",
  setup() {
    const auth = useAuthStore();
    const { imageCredit, fetchImageMetadata } = useWikiCredits(); // Use Composable

    const mapContainer = ref<HTMLElement | null>(null);
    const mapInstance = shallowRef<L.Map | null>(null);
    const sidebarInstance = shallowRef<L.Control | null>(null);
    const selectedMonument = ref<MonumentProps | null>(null);

    // Local state
    const imageLoading = ref(true);
    const { copied: inventoryCopied, copy: copyInventory } = useClipboard();

    // 2. Coordinates Copy Logic
    // Rename 'copied' to 'coordsCopied'
    const { copied: coordsCopied, copy: copyRawCoords } = useClipboard();

    watch(selectedMonument, (newVal) => {
      imageLoading.value = true;
      if (newVal?.image) {
        fetchImageMetadata(newVal.image);
      }
    });

    const copyCoords = (lat: number, lon: number) => {
      copyRawCoords(`${lat}, ${lon}`);
    };

    const openUploadModal = () => {
      console.log("Opening upload modal for", selectedMonument.value?.itemLabel);
      // TODO: Trigger upload modal
    };

    onMounted(async () => {
      if (!mapContainer.value) return;

      const map = L.map(mapContainer.value, {
        zoomControl: false
      }).setView([40.4093, 49.8671], 7);
      mapInstance.value = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      const sidebar = (L.control as any).sidebar({
        container: "sidebar",
        position: "left",
        autopan: true,
      }).addTo(map);

      sidebarInstance.value = sidebar;
      map.on('click', () => {
        sidebar.close();
      })

      try {
        const response = await fetch('/monuments.geojson');

        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.statusText}`);
        }

        const geoData = await response.json();
        const markers = L.markerClusterGroup({ showCoverageOnHover: false, chunkedLoading: true });

        L.geoJSON(geoData, {
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
              iconAnchor: [15, 15]
            });
            const marker = L.marker(latlng, { icon: customIcon });

            marker.on("click", async (e) => {
              L.DomEvent.stopPropagation(e);
              selectedMonument.value = props;
              await nextTick();
              sidebar.open("details");
            });

            return marker;
          },
        }).addTo(markers);

        map.addLayer(markers);
        new LocateControl({ keepCurrentZoomLevel: false, flyTo: true, position: 'topright' }).addTo(map);
      } catch (err) {
        throw err;
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
      openUploadModal
    };
  },
});
</script>

<style scoped>
.leaflet-sidebar {
  z-index: 2000;
}

.leaflet-sidebar-tabs li.disabled {
  opacity: 0.5;
  pointer-events: none;
}

img {
  max-width: 100%;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>