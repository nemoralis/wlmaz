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
               <li :class="{ disabled: !monumentStore.selectedMonument }">
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
                  :monument="monumentStore.selectedMonument"
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
         :monument="monumentStore.selectedMonument"
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
   watch,
} from "vue";
import L from "leaflet";
import "leaflet.markercluster";
import { useAuthStore } from "../stores/auth";
import { useMonumentStore } from "../stores/monuments";
import type { MonumentProps } from "../types";
import MonumentSidebarHome from "./map/MonumentSidebarHome.vue";
// Sidebar & Plugins
import "leaflet-sidebar-v2/css/leaflet-sidebar.css";
import type { Feature } from "geojson";
import { useClipboard } from "../composables/useClipboard";
import { useLeafletMap, type MonumentMarker } from "../composables/useLeafletMap";
import { useWikiCredits } from "../composables/useWikiCredits";
// CSS
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "leaflet-minimap/dist/Control.MiniMap.min.css";

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

      const {
         mapInstance,
         sidebarInstance,
         markersGroup,
         initialize,
         highlightMarker,
         setupClusterGroup,
         flyToMarker,
         getVisibleParent,
         zoomToShowLayer,
      } = useLeafletMap();

      // --- Refs & State ---
      const mapContainer = ref<HTMLElement | null>(null);

      // Data
      const stats = ref({ total: 0, withImage: 0 });
      const imageLoading = ref(true);
      const markerLookup = new Map<string, L.CircleMarker>();
      let allMarkers: L.Layer[] = [];

      // UI
      const showUploadModal = ref(false);
      const needsPhotoOnly = ref(false);

      // --- Methods ---

      const selectMonument = async (marker: MonumentMarker) => {
         if (!marker || !markersGroup.value) return;

         const performSelection = async () => {
            highlightMarker(marker);

            const props = marker.feature.properties;
            monumentStore.selectedMonument = props;

            await nextTick();
            sidebarInstance.value?.open("details");
         };

         const visibleParent = getVisibleParent(marker);

         if (visibleParent && visibleParent !== marker) {
            // It is clustered. Use zoomToShowLayer to reveal it.
            zoomToShowLayer(marker, () => {
               performSelection();
            });
         } else {
            // It is already visible (or spiderfied). Just select it.
            performSelection();
         }
      };

      const flyToMonument = (
         feature: Feature | { properties: { inventory: string; image?: string } },
      ) => {
         const props = feature.properties as MonumentProps;
         const { inventory, image } = props;
         if (inventory && markerLookup.has(inventory)) {
            if (image && needsPhotoOnly.value) {
               applyFilter(false);
            }

            const marker = markerLookup.get(inventory) as MonumentMarker;
            flyToMarker(marker);
            selectMonument(marker);
         }
      };

      const applyFilter = (enabled: boolean) => {
         needsPhotoOnly.value = enabled;
         if (!markersGroup.value) return;

         markersGroup.value.clearLayers();
         if (enabled) {
            const filtered = allMarkers.filter(
               (m) => !(m as MonumentMarker).feature.properties.image,
            );
            markersGroup.value.addLayers(filtered);
         } else {
            markersGroup.value.addLayers(allMarkers);
         }
      };

      const toggleNeedsPhoto = () => applyFilter(!needsPhotoOnly.value);

      const openUploadModal = () => (showUploadModal.value = true);

      const shareMonument = async () => {
         if (!monumentStore.selectedMonument) return;
         const url = window.location.href;
         const title = monumentStore.selectedMonument.itemLabel || "Abidə";
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

      watch(
         () => monumentStore.selectedMonument,
         (newVal) => {
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
         },
      );

      // --- Initialize ---
      onMounted(() => {
         if (!mapContainer.value) return;

         initialize(mapContainer.value, {
            onMapClick: () => {
               sidebarInstance.value?.close();
               highlightMarker(null);
            },
            onSidebarClosing: () => {
               monumentStore.selectedMonument = null;
               highlightMarker(null);
            },
            onSidebarContentChange: (id) => {
               if (id !== "details") {
                  highlightMarker(null);
                  monumentStore.selectedMonument = null;
               }
            },
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
                  const clusterGroup = setupClusterGroup();
                  if (!clusterGroup) return;

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
                        selectMonument(evt.layer as unknown as MonumentMarker);
                     }
                  });

                  mapInstance.value?.addLayer(clusterGroup);

                  // Deep link check after markers are ready
                  const urlParams = new URLSearchParams(window.location.search);
                  const inv = urlParams.get("inventory");
                  if (inv && markerLookup.has(inv)) {
                     flyToMonument({ properties: { inventory: inv } });
                  } else {
                     if (window.innerWidth > 768) {
                        sidebarInstance.value?.open("home");
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
         showUploadModal,
         needsPhotoOnly,
         // Actions
         openUploadModal,
         toggleNeedsPhoto,
         flyToMonument,
         shareMonument,
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

   /* Ensure bottom tabs are not covered by safe areas */
   :deep(.leaflet-sidebar-tabs > ul:last-child) {
      padding-bottom: env(safe-area-inset-bottom) !important;
      background-color: #fff !important;
   }

   /* Fix for Leaflet attribution on narrow screens */
   :deep(.leaflet-control-attribution) {
      font-size: 9px !important;
      background-color: rgba(255, 255, 255, 0.8) !important;
      margin-bottom: env(safe-area-inset-bottom) !important;
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

/* 6. MINIMAP */
:deep(.leaflet-control-minimap) {
   border: 4px solid #fff !important;
   border-radius: 12px !important;
   box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2) !important;
   overflow: hidden;
   margin-bottom: 20px !important;
}

:deep(.leaflet-control-minimap-toggle-display) {
   border-radius: 0 !important;
   background-color: #fff !important;
}

@media (max-width: 768px) {
   :deep(.leaflet-control-minimap) {
      width: 100px !important;
      height: 100px !important;
      margin-bottom: 80px !important;
      /* Above mobile navigation if any, or just safe area */
   }
}
</style>
