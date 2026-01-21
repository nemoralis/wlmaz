<template>
   <div class="relative h-full w-full overflow-hidden">
      <div id="sidebar" class="leaflet-sidebar collapsed">
         <div class="leaflet-sidebar-tabs">
            <ul role="tablist">
               <li>
                  <a href="#home" role="tab" aria-label="Axtarış və Filtrlər"
                     ><font-awesome-icon :icon="['fas', 'info']" />
                  </a>
               </li>
               <li :class="{ disabled: !selectedMonument }">
                  <a href="#details" role="tab" aria-label="Abidə Detalları"
                     ><font-awesome-icon :icon="['fas', 'landmark']" />
                  </a>
               </li>
            </ul>

            <ul role="tablist">
               <li>
                  <a
                     href="https://commons.wikimedia.org/wiki/Commons:Wiki_Loves_Monuments_2025_in_Azerbaijan"
                     target="_blank"
                     title="WLM Azerbaijan Page"
                     aria-label="Wiki Loves Monuments Azerbaijan Page"
                  >
                     <font-awesome-icon :icon="['fas', 'external-link-alt']" />
                  </a>
               </li>
               <li>
                  <a
                     href="https://github.com/nemoralis/wlmaz"
                     target="_blank"
                     rel="noopener noreferrer"
                     title="View Source on GitHub"
                     aria-label="GitHub Repository"
                  >
                     <font-awesome-icon :icon="['fab', 'github']" />
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
                  @close="closeSidebar"
               />
            </div>
         </div>
      </div>

      <div ref="mapContainer" class="z-0 h-full w-full"></div>

      <UploadModal
         :is-open="showUploadModal"
         :monument="selectedMonument"
         @close="showUploadModal = false"
      />
   </div>
</template>

<script lang="ts">
import {
   defineAsyncComponent,
   defineComponent,
   nextTick,
   onMounted,
   onUnmounted,
   ref,
   shallowRef,
   watch,
} from "vue";
import L from "leaflet";
import "leaflet.markercluster";
import { LocateControl } from "leaflet.locatecontrol";
import { useAuthStore } from "../stores/auth";
import { useMonumentStore } from "../stores/monuments";
import type { MonumentProps } from "../types";
import MonumentSidebarHome from "./map/MonumentSidebarHome.vue";
// Sidebar & Plugins
import "leaflet-sidebar-v2/js/leaflet-sidebar.js";
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";
import { useClipboard } from "../composables/useClipboard";
import { useWikiCredits } from "../composables/useWikiCredits";
import { icon } from "@fortawesome/fontawesome-svg-core";
// Utils
import {
   getCategoryUrl,
   getDescriptionPage,
   getOptimizedImage,
   getSrcSet,
} from "../utils/monumentFormatters";
// CSS
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";

const UploadModal = defineAsyncComponent(() => import("./UploadModal.vue"));

const MonumentDetails = defineAsyncComponent(() => import("./map/MonumentDetails.vue"));

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
      const monumentStore = useMonumentStore();
      const { imageCredit, fetchImageMetadata } = useWikiCredits();
      const { copied: inventoryCopied, copy: copyInventory } = useClipboard();
      const { copied: coordsCopied, copy: copyRawCoords } = useClipboard();
      const { copied: linkCopied, copy: copyLink } = useClipboard();
      const copyCoords = (lat: number, lon: number) => copyRawCoords(`${lat}, ${lon}`);

      // --- Refs & State ---
      const mapContainer = ref<HTMLElement | null>(null);
      const mapInstance = shallowRef<L.Map | null>(null);
      const sidebarInstance = shallowRef<L.Control | null>(null);
      const markersGroup = shallowRef<L.MarkerClusterGroup | null>(null);

      const selectedMonument = ref<MonumentProps | null>(null);
      const activeMarkerLayer = shallowRef<L.CircleMarker | null>(null);

      // Data
      const stats = ref({ total: 0, withImage: 0 });
      const imageLoading = ref(true);
      const markerLookup = new Map<string, L.CircleMarker>();
      let allMarkers: L.Layer[] = [];

      // UI
      const showUploadModal = ref(false);
      const needsPhotoOnly = ref(false);

      // --- Methods ---

      const highlightMarker = (marker: L.CircleMarker | null) => {
         // 1. Remove highlight from previous
         if (activeMarkerLayer.value) {
            (activeMarkerLayer.value as unknown as L.CircleMarker).setStyle({
               color: "#fff",
               weight: 2,
               radius: 8,
            });
         }

         // 2. Add highlight to new
         if (marker) {
            marker.setStyle({
               color: "#ffd700", // Yellow border for selection
               weight: 4,
               radius: 10, // Slightly larger
            });
            activeMarkerLayer.value = marker;
         } else {
            activeMarkerLayer.value = null;
         }
      };

      const selectMonument = async (marker: L.CircleMarker) => {
         if (!marker || !markersGroup.value) return;

         const performSelection = async () => {
            highlightMarker(marker);

            const props = (marker as unknown as { feature: { properties: MonumentProps } }).feature
               .properties;
            selectedMonument.value = props;

            await nextTick();
            (sidebarInstance.value as L.Control & { open: (id: string) => void })?.open("details");
         };

         // Check if marker is visible (not clustered)
         // Leaflet.markercluster provides getVisibleParent.
         const cluster = markersGroup.value as L.MarkerClusterGroup & {
            getVisibleParent: (m: L.Marker) => L.Marker | null;
            zoomToShowLayer: (m: L.Marker, cb: () => void) => void;
         };
         const visibleParent = cluster.getVisibleParent(marker as unknown as L.Marker);

         if (visibleParent && visibleParent !== (marker as unknown as L.Layer)) {
            // It is clustered. Use zoomToShowLayer to reveal it.
            cluster.zoomToShowLayer(marker as unknown as L.Marker, () => {
               performSelection();
            });
         } else {
            // It is already visible (or spiderfied). Just select it.
            // IMPORTANT: Do NOT flyTo/panTo here to avoid closing spiderfied clusters.
            performSelection();
         }
      };

      const flyToMonument = (feature: unknown) => {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const { inventory, image } = (feature as any).properties;
         if (inventory && markerLookup.has(inventory)) {
            // BUG FIX: If the monument has an image and the "needs photo" filter is ON,
            // we must turn off the filter so the marker becomes visible.
            if (image && needsPhotoOnly.value) {
               applyFilter(false);
            }

            const marker = markerLookup.get(inventory)!;

            const visibleParent = (markersGroup.value as any)?.getVisibleParent(marker);
            if (visibleParent && visibleParent !== marker) {
               (markersGroup.value as any).zoomToShowLayer(marker, () => {
                  selectMonument(marker);
               });
            } else {
               mapInstance.value?.flyTo(marker.getLatLng(), 16, { duration: 1.5 });

               const props = (marker as unknown as { feature: { properties: MonumentProps } }).feature
                  .properties;
               selectedMonument.value = props;
               (sidebarInstance.value as L.Control & { open: (id: string) => void })?.open(
                  "details",
               );
               activeMarkerLayer.value = marker;
            }
         }
      };

      const applyFilter = (enabled: boolean) => {
         needsPhotoOnly.value = enabled;
         if (!markersGroup.value) return;

         markersGroup.value.clearLayers();
         if (enabled) {
            const filtered = allMarkers.filter((m: any) => !m.feature.properties.image);
            markersGroup.value.addLayers(filtered);
         } else {
            markersGroup.value.addLayers(allMarkers);
         }
      };

      const toggleNeedsPhoto = () => applyFilter(!needsPhotoOnly.value);

      const openUploadModal = () => (showUploadModal.value = true);

      const shareMonument = async () => {
         if (!selectedMonument.value) return;
         const url = window.location.href;
         const title = selectedMonument.value.itemLabel || "Abidə";
         const text = `Viki Abidələri Sevir: ${title}`;

         if (navigator.share) {
            try {
               await navigator.share({ title, text, url });
            } catch (_err) {
               // Share cancelled
            }
         } else {
            copyLink(url);
         }
      };

      const closeSidebar = () => {
         (sidebarInstance.value as any)?.close();
      };

      // --- Watchers ---

      watch(selectedMonument, (newVal) => {
         const url = new URL(window.location.href);
         if (newVal && newVal.itemLabel) {
            document.title = `${newVal.itemLabel} | Viki Abidələri Sevir`;
            if (newVal.inventory) url.searchParams.set("inventory", newVal.inventory);
            imageLoading.value = true;
            // Always call fetchImageMetadata to ensure credits are either updated or cleared
            fetchImageMetadata(newVal.image || "");
         } else {
            document.title = "Viki Abidələri Sevir Azərbaycan";
            url.searchParams.delete("inventory");
            fetchImageMetadata("");
         }
         window.history.replaceState({}, "", url);
      });

      // --- Initialize ---
      onMounted(() => {
         if (!mapContainer.value) return;

         const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
         });
         const map = L.map(mapContainer.value, {
            center: [40.1431, 47.5769],
            zoom: 7,
            maxZoom: 20,
            preferCanvas: true,
            layers: [osmLayer],
         });
         mapInstance.value = map;

         // 2. Controls
         const baseMaps = {
            "OpenStreetMap": osmLayer,
            "Gomap.az": L.tileLayer("https://tiles.gomap.az/smoothtiles/maptile.do?lng=az&x={x}&y={y}&z={z}&f=png&dp=0", {
               maxZoom: 19,
               attribution: "© Gomap.az",
            }),
            "Peyk (Google)": L.tileLayer("https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", {
               maxZoom: 20,
               attribution: "© Google",
            })
         };

         const layerControl = L.control
            .layers(baseMaps, undefined, { position: "topright" })
            .addTo(map);

         // Custom icon for layer control
         const toggleBtn = layerControl
            .getContainer()
            ?.querySelector(".leaflet-control-layers-toggle");
         if (toggleBtn) {
            const layerGroupIcon = icon({ prefix: "fas", iconName: "layer-group" });
            toggleBtn.innerHTML = layerGroupIcon.html[0];
            toggleBtn.classList.add("text-gray-600", "text-sm");
         }

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
         map.on("click", (e: L.LeafletMouseEvent) => {
            if (e.originalEvent.defaultPrevented) return;
            sidebar.close();
            highlightMarker(null);
         });


         sidebar.on("content", (e: any) => {
            if (e.id !== "details") {
               highlightMarker(null);
               selectedMonument.value = null;
            }
         });

         // 4. Data Loading via Store
         monumentStore.init();

         watch(
            () => monumentStore.isDataReady,
            (ready) => {
               if (ready && monumentStore.geoData) {
                  const geoData = monumentStore.geoData;

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
                        props.lat = latlng.lat;
                        props.lon = latlng.lng;

                        const hasImage = !!props.image;

                        const marker = L.circleMarker(latlng, {
                           radius: 8,
                           fillColor: hasImage ? "#2e7d32" : "#d32f2f",
                           color: "#fff",
                           weight: 2,
                           opacity: 1,
                           fillOpacity: 0.8,
                           interactive: true,
                        });

                        // Ensure feature is attached for click handler
                        (marker as any).feature = feature;

                        if (props.inventory) markerLookup.set(props.inventory, marker);
                        return marker;
                     },
                  });

                  allMarkers = geoJsonLayer.getLayers() as L.Layer[];
                  clusterGroup.addLayers(allMarkers);

                  // Group Event delegation for performance
                  clusterGroup.on("click", (evt: L.LeafletMouseEvent) => {
                     // Stop propagation to prevent map click from firing
                     L.DomEvent.stopPropagation(evt.originalEvent);
                     L.DomEvent.preventDefault(evt.originalEvent);
                     if (evt.layer instanceof L.CircleMarker) {
                        selectMonument(evt.layer);
                     }
                  });

                  map.addLayer(clusterGroup);

                  // Locate Control
                  const locateIcon = icon({ prefix: "fas", iconName: "location-arrow" });
                  const loadingIcon = icon({ prefix: "fas", iconName: "spinner" });
                  new LocateControl({
                     position: "topright",
                     flyTo: true,
                     icon: locateIcon.html[0],
                     iconLoading: loadingIcon.html[0] + " animate-spin",
                  }).addTo(map);

                  // Deep link check after markers are ready
                  const urlParams = new URLSearchParams(window.location.search);
                  const inv = urlParams.get("inventory");
                  if (inv && markerLookup.has(inv)) {
                     flyToMonument({ properties: { inventory: inv } });
                  } else {
                     if (window.innerWidth > 768) {
                        sidebar.open("home");
                     }
                  }
               }
            },
            { immediate: true },
         );
      });

      onUnmounted(() => {
         mapInstance.value?.remove();
      });

      return {
         auth,
         stats,
         monumentStore,
         selectedMonument,
         showUploadModal,
         needsPhotoOnly,
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
         copyLink,
         closeSidebar,
         // State
         mapContainer,
         imageLoading,
      };
   },
});
</script>
<style scoped>
/* 1. LAYOUT */
/* 1. LAYOUT & Z-INDEX (CRITICAL FIXES) */
:deep(.leaflet-sidebar) {
   position: absolute !important;
   top: 0 !important;
   bottom: 0 !important;
   left: 0 !important;
   height: 100% !important;
   z-index: 2000 !important;
   border-radius: 0 !important;
   overflow: hidden !important;
   border: none !important;
   box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1) !important;
}
:deep(.leaflet-sidebar-tabs li.disabled) {
   opacity: 0.5;
   pointer-events: none;
}

:deep(.leaflet-sidebar-tabs) {
   background-color: #fff !important;
   border-right: 1px solid #ddd;
}

:deep(.leaflet-sidebar-content) {
   background-color: #fff !important;
}

:deep(.leaflet-sidebar-pane) {
   background-color: #fff !important;
   padding: 0 !important;
}

img {
   max-width: 100%;
}

/* 2. MOBILE */
@media (max-width: 768px) {
   :deep(.leaflet-sidebar) {
      /* Reset floating for mobile */
      top: 0 !important;
      bottom: 0 !important;
      left: 0 !important;
      height: 100% !important;
      border: none !important;
      box-shadow: none !important;

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

/* 4. THEME */
:deep(.leaflet-sidebar-header) {
   background-color: #3366cc !important;
   color: white !important;
}
:deep(.leaflet-sidebar-close) {
   color: white !important;
   display: flex;
   align-items: center;
   justify-content: center;
}
:deep(.leaflet-sidebar-tabs > ul > li.active > a) {
   background-color: #3366cc !important;
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
   color: #3366cc;
}
:deep(.leaflet-control-layers input[type="radio"]) {
   accent-color: #3366cc;
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
