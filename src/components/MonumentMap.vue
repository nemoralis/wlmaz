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
              <h2 class="text-xl font-bold text-gray-900 mb-1">{{ selectedMonument.itemLabel }}</h2>
              <p class="text-xs text-gray-500 mb-4 font-mono">ID: {{ selectedMonument.inventoryID }}</p>

              <div class="mb-6 relative min-h-[200px]">
                <div v-if="selectedMonument.image">
                  <a :href="selectedMonument.image" target="_blank" rel="noopener">
                    <div v-if="imageLoading"
                      class="w-full h-48 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
                      <i class="fa fa-image text-gray-300 text-3xl"></i>
                    </div>

                    <img :src="getOptimizedImage(selectedMonument.image)"
                      class="w-full h-auto max-h-[300px] object-cover rounded-lg shadow-md transition-opacity duration-300"
                      :class="{ 'opacity-0 absolute top-0': imageLoading, 'opacity-100': !imageLoading }" alt="Monument"
                      loading="lazy" @load="imageLoading = false" />
                  </a>
                </div>

                <div v-else
                  class="w-full h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <i class="fa fa-camera text-2xl"></i>
                  <span class="text-sm font-medium">No image available</span>
                </div>

              </div>
              <div class="border-t border-gray-100 pt-6">
                <div v-if="auth.isAuthenticated">
                  <button @click="openUploadModal"
                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                    <i class="fa fa-upload"></i>
                    Şəkil yüklə
                  </button>
                  <p class="text-xs text-gray-500 mt-3 text-center">
                    Yükləmələr CC BY-SA 4.0 lisenziyası ilə yayımlanır
                  </p>
                </div>

                <div v-else class="bg-blue-50 p-4 rounded-lg text-center border border-blue-100">
                  <p class="text-blue-800 font-medium mb-2">Töfhə vermək istəyirsiz?</p>
                  <button @click="auth.login"
                    class="text-sm bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-md font-semibold hover:bg-blue-50 transition-colors">
                    Vikimedia ilə daxil ol
                  </button>
                </div>
              </div>

              <div class="mt-8">
                <h3 class="text-sm font-bold text-gray-900 mb-2 uppercase tracking-wide">Metadata</h3>

                <div class="bg-gray-50 rounded border border-gray-200 text-sm">

                  <div class="p-2 border-b border-gray-200 flex justify-between">
                    <span class="text-gray-500">Coordinates</span>
                    <span class="font-mono text-gray-700">
                      {{ selectedMonument.lat?.toFixed(4) }}, {{ selectedMonument.lon?.toFixed(4) }}
                    </span>
                  </div>

                  <div v-if="selectedMonument.item" class="p-2 flex justify-between items-center">
                    <span class="text-gray-500 flex items-center gap-2">
                      <img
                        src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Wikidata.svg/330px-Wikidata.svg.png"
                        class="w-5 h-auto opacity-60" alt="Wikidata" />
                      Wikidata
                    </span>

                    <a :href="selectedMonument.item" target="_blank" rel="noopener noreferrer"
                      class="text-blue-600 hover:text-blue-800 hover:underline text-xs font-semibold flex items-center gap-1 transition-colors">
                      View Item
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

// CSS Imports
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import monumentsGeoJSONRaw from "../assets/monuments.geojson?raw";

interface MonumentProps {
  itemLabel?: string;
  inventoryID?: string;
  image?: string;
  lat?: number;
  lon?: number;
  [key: string]: any;
}

export default defineComponent({
  name: "MonumentMap",
  setup() {
    const auth = useAuthStore();
    const mapContainer = ref<HTMLElement | null>(null);
    const mapInstance = shallowRef<L.Map | null>(null);
    const sidebarInstance = shallowRef<L.Control | null>(null);
    const selectedMonument = ref<MonumentProps | null>(null);
    const imageLoading = ref(true);

    // 2. Watch for selection changes to RESET the loading state
    watch(selectedMonument, () => {
      imageLoading.value = true; // Show spinner immediately when switching
    });
    const openUploadModal = () => {
      console.log("Opening upload modal for", selectedMonument.value?.itemLabel);
      // TODO: Trigger upload modal
    };

    const getOptimizedImage = (url: string, width = 600) => {
      if (!url) return "";

      // Check if it already has query parameters
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}width=${width}`;
    };

    onMounted(() => {
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

      const geoData = JSON.parse(monumentsGeoJSONRaw);
      const markers = L.markerClusterGroup({ showCoverageOnHover: false, chunkedLoading: true });

      L.geoJSON(geoData, {
        pointToLayer: (feature, latlng) => {
          const props = feature.properties as MonumentProps;
          props.lat = latlng.lat;
          props.lon = latlng.lng;

          const hasImage = !!props.image;
          const marker = L.circleMarker(latlng, {
            radius: 8,
            color: hasImage ? "#10b981" : "#2a7ae2",
            fillColor: hasImage ? "#34d399" : "#4285f4",
            fillOpacity: 0.8,
            weight: 1,
          });

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
      openUploadModal,
      getOptimizedImage,
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
</style>