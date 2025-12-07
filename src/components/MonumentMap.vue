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
            <!-- Home Pane -->
            <div id="home" class="leaflet-sidebar-pane">
               <MonumentSidebarHome
                  :stats="stats"
                  :needs-photo-only="needsPhotoOnly"
                  :monuments="allMonuments"
                  :fuse-index="searchIndex"
                  @toggle-filter="toggleNeedsPhoto"
                  @select-monument="flyToMonument"
               />
            </div>

            <!-- Details Pane -->
            <div id="details" class="leaflet-sidebar-pane">
               <MonumentDetails
                  :monument="selectedMonument"
                  :image-credit="imageCredit"
                  :is-authenticated="auth.isAuthenticated"
                  :inventory-copied="inventoryCopied"
                  :coords-copied="coordsCopied"
                  :link-copied="linkCopied"
                  @open-upload="openUploadModal"
                  @share="shareMonument"
                  @copy-inventory="copyInventory"
                  @copy-coords="copyCoords"
                  @login="auth.login"
               />
            </div>
         </div>
      </div>

      <div ref="mapContainer" class="z-0 h-full w-full"></div>

      <UploadModal :is-open="showUploadModal" @close="showUploadModal = false" />
   </div>
</template>

<script lang="ts">
import {
   defineComponent,
   onMounted,
   onUnmounted,
   ref,
   shallowRef,
   nextTick,
   watch,
   defineAsyncComponent,
} from "vue";
import L from "leaflet";
import "leaflet.markercluster";
import { LocateControl } from "leaflet.locatecontrol";
import { useAuthStore } from "../stores/auth";
import type { MonumentProps } from "../types";
import DataWorker from "../workers/data.worker?worker";
const UploadModal = defineAsyncComponent(() => import("./UploadModal.vue"));
import MonumentSidebarHome from "./map/MonumentSidebarHome.vue";
const MonumentDetails = defineAsyncComponent(() => import("./map/MonumentDetails.vue"));

// Sidebar & Plugins
import "leaflet-sidebar-v2/js/leaflet-sidebar.js";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";

// Utils
import {
   getMonumentIcon,
   getOptimizedImage,
   getSrcSet,
   getDescriptionPage,
   getCategoryUrl,
} from "../utils/monumentFormatters";
import { useWikiCredits } from "../composables/useWikiCredits";
import { useClipboard } from "../composables/useClipboard";
import { useOverpass } from "../composables/useOverpass";

// CSS
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";

export default defineComponent({
   name: "MonumentMap",
   components: {
      UploadModal,
      MonumentSidebarHome,
      MonumentDetails,
   },
   setup() {
      // --- Stores & Composables ---
      const auth = useAuthStore();
      const { imageCredit, fetchImageMetadata } = useWikiCredits();
      const { copied: inventoryCopied, copy: copyInventory } = useClipboard();
      const { copied: coordsCopied, copy: copyRawCoords } = useClipboard();
      const { copied: linkCopied, copy: copyLink } = useClipboard();
      const copyCoords = (lat: number, lon: number) => copyRawCoords(`${lat}, ${lon}`);
      const { fetchBuildingsWithWikidata, loading: overpassLoading } = useOverpass();

      // --- Refs & State ---
      const mapContainer = ref<HTMLElement | null>(null);
      const mapInstance = shallowRef<L.Map | null>(null);
      const sidebarInstance = shallowRef<L.Control | null>(null);
      const markersGroup = shallowRef<L.MarkerClusterGroup | null>(null);

      const selectedMonument = ref<MonumentProps | null>(null);
      const activeMarkerLayer = shallowRef<L.Marker | null>(null);

      // Data
      const stats = ref({ total: 0, withImage: 0 });
      const allMonuments = ref<any[]>([]);
      const searchIndex = shallowRef<any>(null);
      const imageLoading = ref(true);
      const markerLookup = new Map<string, L.Marker>();
      let allMarkers: L.Marker[] = [];

      // UI
      const showUploadModal = ref(false);
      const needsPhotoOnly = ref(false);

      // --- Methods ---

      const highlightMarker = (marker: L.Marker | null) => {
         // 1. Remove highlight from previous
         if (activeMarkerLayer.value) {
            const el = activeMarkerLayer.value.getElement();
            el?.querySelector(".marker-pin")?.classList.remove("selected-highlight");
         }

         // 2. Add highlight to new
         if (marker) {
            const el = marker.getElement();
            if (el) {
               el.querySelector(".marker-pin")?.classList.add("selected-highlight");
            }
            activeMarkerLayer.value = marker;
         } else {
            activeMarkerLayer.value = null;
         }
      };

      const selectMonument = async (marker: L.Marker) => {
         if (!marker || !markersGroup.value) return;

         const performSelection = async () => {
            highlightMarker(marker);

            const props = (marker as any).feature.properties;
            selectedMonument.value = props;

            await nextTick();
            (sidebarInstance.value as any)?.open("details");
         };

         // Check if marker is visible (not clustered)
         // Leaflet.markercluster provides getVisibleParent.
         // If it returns the marker itself, it is visible. If it returns a cluster, it is clustered.
         const visibleParent = (markersGroup.value as any).getVisibleParent(marker);

         if (visibleParent && visibleParent !== marker) {
            // It is clustered. Use zoomToShowLayer to reveal it.
            (markersGroup.value as any).zoomToShowLayer(marker, () => {
               performSelection();
            });
         } else {
            // It is already visible (or spiderfied). Just select it.
            // IMPORTANT: Do NOT flyTo/panTo here to avoid closing spiderfied clusters.
            performSelection();
         }
      };

      const flyToMonument = (feature: any) => {
         console.log(feature);
         const { inventory } = feature.properties;
         if (inventory && markerLookup.has(inventory)) {
            const marker = markerLookup.get(inventory)!;

            const visibleParent = (markersGroup.value as any)?.getVisibleParent(marker);
            if (visibleParent && visibleParent !== marker) {
               (markersGroup.value as any).zoomToShowLayer(marker, () => {
                  selectMonument(marker);
               });
            } else {
               mapInstance.value?.flyTo(marker.getLatLng(), 16, { duration: 1.5 });

               const props = (marker as any).feature.properties;
               selectedMonument.value = props;
               (sidebarInstance.value as any)?.open("details");
               activeMarkerLayer.value = marker;
            }
         }
      };

      const toggleNeedsPhoto = () => {
         needsPhotoOnly.value = !needsPhotoOnly.value;
         if (!markersGroup.value) return;

         markersGroup.value.clearLayers();
         if (needsPhotoOnly.value) {
            const filtered = allMarkers.filter((m: any) => !m.feature.properties.image);
            markersGroup.value.addLayers(filtered);
         } else {
            markersGroup.value.addLayers(allMarkers);
         }
      };

      const openUploadModal = () => (showUploadModal.value = true);

      const shareMonument = async () => {
         if (!selectedMonument.value) return;
         const url = window.location.href;
         const title = selectedMonument.value.itemLabel || "Abidə";
         const text = `Viki Abidələri Sevir: ${title}`;

         if (navigator.share) {
            try {
               await navigator.share({ title, text, url });
            } catch (err) {
               console.log("Share cancelled");
            }
         } else {
            copyLink(url);
         }
      };

      // --- Watchers ---

      watch(selectedMonument, (newVal) => {
         const url = new URL(window.location.href);
         if (newVal && newVal.itemLabel) {
            document.title = `${newVal.itemLabel} | Viki Abidələri Sevir`;
            if (newVal.inventory) url.searchParams.set("inventory", newVal.inventory);
            imageLoading.value = true;
            if (newVal.image) fetchImageMetadata(newVal.image);
         } else {
            document.title = "Viki Abidələri Sevir Azərbaycan";
            url.searchParams.delete("inventory");
         }
         window.history.replaceState({}, "", url);
      });

      // --- Initialize ---
      onMounted(() => {
         if (!mapContainer.value) return;

         // 1. Map Setup
         const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
         });
         const map = L.map(mapContainer.value, { zoomControl: false, layers: [osmLayer] }).setView(
            [40.4093, 49.8671],
            7,
         );

         mapInstance.value = map;

         // 2. Controls
         const baseMaps = {
            Xəritə: osmLayer,
            "Peyk (Google)": L.tileLayer("https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
               maxZoom: 20,
               attribution: "© Google",
            }),
             "Hibrid (Google)": L.tileLayer("https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
                maxZoom: 20,
                attribution: "© Google",
             }),
          };

          const overlays = {
             "OSM Debug (Wikidata)": L.layerGroup(),
          };

          const layerControl = L.control
             .layers(baseMaps, overlays, { position: "topright" })
             .addTo(map);

         // Custom icon for layer control
         const toggleBtn = layerControl
            .getContainer()
            ?.querySelector(".leaflet-control-layers-toggle");
         if (toggleBtn)
            toggleBtn.innerHTML = '<i class="fa-solid fa-layer-group text-gray-600 text-sm"></i>';

         L.control.zoom({ position: "topright" }).addTo(map);

         const sidebar = (L.control as any)
            .sidebar({ container: "sidebar", position: "left", autopan: true })
            .addTo(map);
         sidebarInstance.value = sidebar;

         // Listen for sidebar closing event to clear selected monument
         sidebar.on("closing", () => {
            selectedMonument.value = null;
            highlightMarker(null);
         });

         // 3. Global Map Events
         map.on("click", () => {
            sidebar.close();
            highlightMarker(null);
         });

         // Robust highlight: Apply class when layer is added (virtualization support)
          map.on("layeradd", (e) => {
             if (activeMarkerLayer.value && e.layer === activeMarkerLayer.value) {
                const el = (e.layer as L.Marker).getElement();
                el?.querySelector(".marker-pin")?.classList.add("selected-highlight");
             }
             if (e.layer === overlays["OSM Debug (Wikidata)"]) {
                updateOverpassLayer();
             }
          });

          map.on("moveend", () => {
             if (map.hasLayer(overlays["OSM Debug (Wikidata)"])) {
                updateOverpassLayer();
             }
          });

          const updateOverpassLayer = async () => {
             if (overpassLoading.value) return;
             // Throttle check could be added here
             const bounds = map.getBounds();
             const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;

             // Don't fetch if zoomed out too far
             if (map.getZoom() < 15) {
                overlays["OSM Debug (Wikidata)"].clearLayers();
                return;
             }

             const geojson = await fetchBuildingsWithWikidata(bbox);
             if (geojson) {
                overlays["OSM Debug (Wikidata)"].clearLayers();
                L.geoJSON(geojson, {
                   style: {
                      color: "#3b82f6",
                      weight: 2,
                      opacity: 0.7,
                      fillOpacity: 0.1,
                   },
                   onEachFeature: (feature, layer) => {
                      if (feature.properties?.wikidata) {
                         layer.bindPopup(
                            `<strong>Wikidata:</strong> <a href="https://www.wikidata.org/wiki/${feature.properties.wikidata}" target="_blank">${feature.properties.wikidata}</a>`,
                         );
                      }
                   },
                }).addTo(overlays["OSM Debug (Wikidata)"]);
             }
          };

         sidebar.on("content", (e: any) => {
            if (e.id !== "details") {
               highlightMarker(null);
               selectedMonument.value = null;
            }
         });

         // 4. Data Loading
         const worker = new DataWorker();
         worker.postMessage({ type: "INIT" });

         worker.onmessage = (e) => {
            if (e.data.type === "DATA_READY") {
               const { geoData, fuseIndex } = e.data;

               // Store pre-computed index
               searchIndex.value = fuseIndex;

               // Populate allMonuments for SearchBar component
               allMonuments.value = geoData.features;

               // Update Stats
               stats.value.total = geoData.features.length;
               stats.value.withImage = geoData.features.filter(
                  (f: any) => f.properties.image,
               ).length;

               // Create Cluster Group
               const clusterGroup = L.markerClusterGroup({
                  showCoverageOnHover: false,
                  chunkedLoading: true,
                  spiderfyOnMaxZoom: true,
                  zoomToBoundsOnClick: true,
               });
               markersGroup.value = clusterGroup;

               // Create Layers
               const geoJsonLayer = L.geoJSON(geoData, {
                  pointToLayer: (feature, latlng) => {
                     const props = feature.properties as MonumentProps;
                     // Add coordinates from geometry to properties
                     props.lat = latlng.lat;
                     props.lon = latlng.lng;

                     const hasImage = !!props.image;
                     const faIcon = getMonumentIcon(props.itemLabel);
                     const bgClass = hasImage ? "marker-has-image" : "marker-needs-image";

                     const icon = L.divIcon({
                        className: "custom-div-icon",
                        html: `<div class="marker-pin ${bgClass}"><i class="fa-solid ${faIcon} text-white text-[14px]"></i></div>`,
                        iconSize: [30, 30],
                        iconAnchor: [15, 15],
                     });

                     const marker = L.marker(latlng, { icon });
                     // Store ID
                     if (props.inventory) markerLookup.set(props.inventory, marker);
                     return marker;
                  },
               });

               allMarkers = geoJsonLayer.getLayers() as L.Marker[];
               clusterGroup.addLayers(allMarkers);

               // Group Event delegation
               clusterGroup.on("click", (evt: any) => {
                  L.DomEvent.stopPropagation(evt.originalEvent);
                  selectMonument(evt.layer);
               });

               map.addLayer(clusterGroup);

               new LocateControl({ position: "topright", flyTo: true }).addTo(map);

               // Initial URL Navigation
               const urlParams = new URLSearchParams(window.location.search);
               const inventory = urlParams.get("inventory");
               if (inventory && markerLookup.has(inventory)) {
                  selectMonument(markerLookup.get(inventory)!);
               } else {
                  sidebar.open("home");
               }
            }
         };
      });

      onUnmounted(() => {
         mapInstance.value?.remove();
      });

      return {
         auth,
         mapContainer,
         // State
         selectedMonument,
         imageLoading,
         stats,
         showUploadModal,
         needsPhotoOnly,
         allMonuments,
         searchIndex,
         // Actions
         openUploadModal,
         toggleNeedsPhoto,
         flyToMonument,
         shareMonument,
         // Utils
         getOptimizedImage,
         getSrcSet,
         getDescriptionPage,
         getCategoryUrl,
         imageCredit,
         // Clipboard
         inventoryCopied,
         coordsCopied,
         linkCopied,
         copyInventory,
         copyCoords,
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
   height: 100% !important;
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
