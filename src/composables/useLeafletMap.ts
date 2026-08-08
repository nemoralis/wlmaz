import L from "leaflet";
import "leaflet-minimap";
import { LocateControl } from "leaflet.locatecontrol";
import "leaflet-sidebar-v2/js/leaflet-sidebar.js";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { shallowRef } from "vue";
import type { MonumentProps } from "../types";
import { HIGHLIGHT_RADIUS_OFFSET } from "../utils/markerRadius";

export interface SidebarControl extends L.Control {
   open: (id: string) => void;
   close: () => void;
   on: (event: string, fn: (e: any) => void) => void;
}

export interface MonumentMarker extends L.CircleMarker {
   feature: {
      type: "Feature";
      properties: MonumentProps;
      geometry: {
         type: "Point";
         coordinates: [number, number];
      };
   };
}

export interface MapOptions {
   onMarkerClick?: (marker: MonumentMarker) => void;
   onMapClick?: (e: L.LeafletMouseEvent) => void;
   onSidebarContentChange?: (id: string) => void;
   onSidebarClosing?: () => void;
}

/** Marker predicate used to decide whether a marker should be on the map. */
export type MarkerFilter = (props: MonumentProps) => boolean;

/** How many markers are added per animation frame when populating the viewport. */
const CHUNK_SIZE = 150;

export function useLeafletMap() {
   const mapInstance = shallowRef<L.Map | null>(null);
   const sidebarInstance = shallowRef<SidebarControl | null>(null);
   const markersGroup = shallowRef<any | null>(null);
   const activeMarkerLayer = shallowRef<L.CircleMarker | null>(null);
   let currentBaseRadius = 8;

   const initialize = (container: HTMLElement, options: MapOptions = {}) => {
      // 1. Base Layers
      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
         maxZoom: 19,
         attribution: "© OpenStreetMap",
      });

      const gomapLayer = L.tileLayer(
         "https://tiles.gomap.az/smoothtiles/maptile.do?lng=az&x={x}&y={y}&z={z}&f=png&dp=0",
         {
            maxZoom: 19,
            attribution: "© Gomap.az",
         },
      );

      const googleSatelliteLayer = L.tileLayer(
         "https://mt0.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
         {
            maxZoom: 20,
            attribution: "© Google",
         },
      );

      // 2. Map Instance
      const map = L.map(container, {
         center: [40.1431, 47.5769],
         zoom: 7,
         maxZoom: 20,
         preferCanvas: true,
         layers: [osmLayer],
      });
      mapInstance.value = map;

      // 3. Controls
      const baseMaps = {
         OpenStreetMap: osmLayer,
         "Gomap.az": gomapLayer,
         "Peyk (Google)": googleSatelliteLayer,
      };

      const layerControl = L.control
         .layers(baseMaps, undefined, { position: "topright" })
         .addTo(map);

      // Custom icon for layer control (FontAwesome)
      const toggleBtn = layerControl
         .getContainer()
         ?.querySelector(".leaflet-control-layers-toggle");
      if (toggleBtn) {
         const layerGroupIcon = icon({ prefix: "fas", iconName: "layer-group" });
         toggleBtn.innerHTML = layerGroupIcon.html[0];
         toggleBtn.classList.add(
            "text-gray-600",
            "text-sm",
            "flex",
            "items-center",
            "justify-center",
         );
      }

      L.control.zoom({ position: "topright" }).addTo(map);

      // 4. Sidebar
      const sidebar = (L.control as any)
         .sidebar({ container: "sidebar", position: "left", autopan: true })
         .addTo(map);
      sidebarInstance.value = sidebar;

      sidebar.on("content", (e: any) => options.onSidebarContentChange?.(e.id));
      sidebar.on("closing", () => options.onSidebarClosing?.());

      // 5. Locate Control
      const locateControl = new LocateControl({
         position: "topright",
         flyTo: true,
         // We'll set the icons manually after adding to map to ensure they render as SVGs
         icon: "leaflet-control-locate-icon-wrapper",
         iconLoading: "leaflet-control-locate-spinner-wrapper",
      }).addTo(map);

      const locateBtn = locateControl.getContainer()?.querySelector(".leaflet-bar-part");
      if (locateBtn) {
         const locateIcon = icon({ prefix: "fas", iconName: "location-arrow" });
         const spinnerIcon = icon({ prefix: "fas", iconName: "spinner" });
         locateBtn.innerHTML = `
            <span class="locate-icon-main">${locateIcon.html[0]}</span>
            <span class="locate-icon-loading" style="display:none">${spinnerIcon.html[0]}</span>
         `;
      }

      // 6. Global Map Events
      map.on("click", (e: L.LeafletMouseEvent) => {
         if (e.originalEvent.defaultPrevented) return;
         options.onMapClick?.(e);
      });

      // 7. MiniMap
      const miniMapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
         maxZoom: 18,
      });

      const miniMapControl = new (L.Control as any).MiniMap(miniMapLayer, {
         toggleDisplay: true,
         minimized: false,
         position: "bottomright",
         width: 150,
         height: 150,
         strings: { hideText: "Gizlə", showText: "Göstər" },
      }).addTo(map);

      map.on("baselayerchange", (e: any) => {
         const layer = e.layer as L.TileLayer;
         if (layer && (layer as any)._url) {
            const newMiniLayer = L.tileLayer((layer as any)._url, {
               ...layer.options,
               maxZoom: 18,
               attribution: "",
            });
            miniMapControl.changeLayer(newMiniLayer);
         }
      });

      return { map, sidebar, layerControl };
   };

   const highlightMarker = (marker: L.CircleMarker | null) => {
      // 1. Remove highlight from previous
      if (activeMarkerLayer.value) {
         activeMarkerLayer.value.setStyle({
            color: "#fff",
            weight: 2,
            radius: currentBaseRadius,
         });
      }

      // 2. Add highlight to new
      if (marker) {
         marker.setStyle({
            color: "#ffd700", // Yellow border for selection
            weight: 4,
            radius: currentBaseRadius + HIGHLIGHT_RADIUS_OFFSET,
         });
         activeMarkerLayer.value = marker;
      } else {
         activeMarkerLayer.value = null;
      }
   };

   /** Re-applies the base radius to every rendered marker (highlight kept larger). */
   const setMarkerRadius = (radius: number) => {
      currentBaseRadius = radius;
      const layer = markersGroup.value;
      if (!layer) return;
      layer.getLayers().forEach((m: L.Layer) => {
         (m as L.CircleMarker).setRadius(
            m === activeMarkerLayer.value ? radius + HIGHLIGHT_RADIUS_OFFSET : radius,
         );
      });
   };

   const setupMarkerLayer = () => {
      if (!mapInstance.value) return null;

      const markerLayer = L.layerGroup();
      markersGroup.value = markerLayer;
      mapInstance.value.addLayer(markerLayer);

      return markerLayer;
   };

   const flyToMarker = (marker: L.CircleMarker, zoom = 16) => {
      if (!mapInstance.value) return;
      mapInstance.value.flyTo(marker.getLatLng(), zoom, { duration: 1.5 });
   };

   // --- Viewport & Filter Aware Marker Rendering ---
   // Markers are added in chunks across animation frames so the main thread
   // never blocks, and only those inside the current map bounds are kept on
   // the map. Leaflet's canvas renderer already culls drawing, so this limits
   // the number of markers Leaflet has to manage on pan/zoom.
   let allMarkers: L.Layer[] = [];
   const addedMarkers = new Set<L.Layer>();
   let chunkHandle = 0;
   let viewportTimer: ReturnType<typeof setTimeout> | null = null;

   const addMarkersChunked = (markers: L.Layer[]) => {
      const layer = markersGroup.value;
      if (!layer || markers.length === 0) return;

      const id = ++chunkHandle;
      let i = 0;
      const step = () => {
         if (id !== chunkHandle) return;
         const end = Math.min(i + CHUNK_SIZE, markers.length);
         for (; i < end; i++) {
            layer.addLayer(markers[i]);
            addedMarkers.add(markers[i]);
         }
         if (i < markers.length && id === chunkHandle) {
            requestAnimationFrame(step);
         }
      };
      step();
   };

   const syncViewport = (passesFilter: MarkerFilter) => {
      const layer = markersGroup.value;
      if (!layer || !mapInstance.value) return;

      chunkHandle++; // Supersede any in-flight chunked add

      const bounds = mapInstance.value.getBounds().pad(0.25);

      // Remove markers that left the viewport (or no longer pass the filter)
      const toRemove: L.Layer[] = [];
      for (const m of addedMarkers) {
         const visible =
            bounds.contains((m as MonumentMarker).getLatLng()) &&
            passesFilter((m as MonumentMarker).feature.properties);
         if (!visible) toRemove.push(m);
      }
      for (const m of toRemove) {
         layer.removeLayer(m);
         addedMarkers.delete(m);
      }

      // Add markers that entered the viewport (and pass the filter)
      const toAdd = allMarkers.filter(
         (m) =>
            !addedMarkers.has(m) &&
            bounds.contains((m as MonumentMarker).getLatLng()) &&
            passesFilter((m as MonumentMarker).feature.properties),
      );
      if (toAdd.length) {
         addMarkersChunked(toAdd);
      }
   };

   /**
    * Registers the full marker set and populates the map with the markers that
    * are currently inside the viewport and pass the filter.
    */
   const renderMarkers = (markers: L.Layer[], passesFilter: MarkerFilter) => {
      allMarkers.length = 0;
      allMarkers.push(...markers);
      syncViewport(passesFilter);
   };

   /** Debounces a viewport re-sync after pans/zooms. */
   const scheduleViewportSync = (passesFilter: MarkerFilter) => {
      if (viewportTimer) clearTimeout(viewportTimer);
      viewportTimer = setTimeout(() => syncViewport(passesFilter), 150);
   };

   /** Cancels pending work and clears all rendered markers. */
   const disposeMarkers = () => {
      if (viewportTimer) clearTimeout(viewportTimer);
      viewportTimer = null;
      chunkHandle++; // Supersede any in-flight chunked add
      allMarkers = [];
      addedMarkers.clear();
   };

   return {
      mapInstance,
      sidebarInstance,
      markersGroup,
      activeMarkerLayer,
      initialize,
      highlightMarker,
      setupMarkerLayer,
      flyToMarker,
      syncViewport,
      renderMarkers,
      scheduleViewportSync,
      disposeMarkers,
      setMarkerRadius,
   };
}
