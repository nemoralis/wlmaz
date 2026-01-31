import L from "leaflet";
import "leaflet.markercluster";
import { LocateControl } from "leaflet.locatecontrol";
import "leaflet-sidebar-v2/js/leaflet-sidebar.js";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { shallowRef } from "vue";
import type { MonumentProps } from "../types";

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

export function useLeafletMap() {
   const mapInstance = shallowRef<L.Map | null>(null);
   const sidebarInstance = shallowRef<SidebarControl | null>(null);
   const markersGroup = shallowRef<any | null>(null);
   const activeMarkerLayer = shallowRef<L.CircleMarker | null>(null);

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

      return { map, sidebar, layerControl };
   };

   const highlightMarker = (marker: L.CircleMarker | null) => {
      // 1. Remove highlight from previous
      if (activeMarkerLayer.value) {
         activeMarkerLayer.value.setStyle({
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
            radius: 10,
         });
         activeMarkerLayer.value = marker;
      } else {
         activeMarkerLayer.value = null;
      }
   };

   const setupClusterGroup = (options: any = {}) => {
      if (!mapInstance.value) return null;

      const clusterGroup = (L as any).markerClusterGroup({
         showCoverageOnHover: false,
         chunkedLoading: true,
         spiderfyOnMaxZoom: true,
         zoomToBoundsOnClick: true,
         ...options,
      });

      markersGroup.value = clusterGroup;
      mapInstance.value.addLayer(clusterGroup);

      return clusterGroup;
   };

   const flyToMarker = (marker: L.CircleMarker, zoom = 16) => {
      if (!mapInstance.value || !markersGroup.value) return;

      const cluster = markersGroup.value as any;
      const visibleParent = cluster.getVisibleParent(marker);

      if (visibleParent && visibleParent !== marker) {
         cluster.zoomToShowLayer(marker, () => {
            // Marker is now visible
         });
      } else {
         mapInstance.value.flyTo(marker.getLatLng(), zoom, { duration: 1.5 });
      }
   };

   const getVisibleParent = (marker: L.Layer): L.Layer | null => {
      return (markersGroup.value as any)?.getVisibleParent(marker) || null;
   };

   const zoomToShowLayer = (marker: L.Layer, cb: () => void) => {
      (markersGroup.value as any)?.zoomToShowLayer(marker, cb);
   };

   return {
      mapInstance,
      sidebarInstance,
      markersGroup,
      activeMarkerLayer,
      initialize,
      highlightMarker,
      setupClusterGroup,
      flyToMarker,
      getVisibleParent,
      zoomToShowLayer,
   };
}
