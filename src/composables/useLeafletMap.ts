import L from "leaflet";
import "leaflet-minimap";
import { LocateControl } from "leaflet.locatecontrol";
import "leaflet-sidebar-v2/js/leaflet-sidebar.js";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { shallowRef } from "vue";
import type { MonumentProps } from "@/types";
import type { SidebarControl } from "@/types/leaflet-sidebar-v2.ts";
import { BasemapControl } from "@/utils/basemapControl.ts";
import { getSpreadPosition } from "@/utils/markerOverlap.ts";
import { getSpreadSpacingPx, HIGHLIGHT_RADIUS_OFFSET } from "@/utils/markerRadius.ts";
import "./contextmenu.css";

/**
 * Leaflet map lifecycle and marker management.
 *
 * Owns the single Mapbox instance, its sidebar/minimap/locate controls, a
 * content context-menu and a shared marker layer group. Markers are added in
 * chunks (via animation frames) and only for the current viewport, so large
 * feature sets (thousands of monuments) stay responsive. Returns a typed
 * handle object; all DOM work happens against the container passed to
 * `initialize`.
 */
export type { SidebarControl };

/** A monument marker: the original GeoJSON feature attached to a Leaflet circle marker. */
export interface MonumentMarker extends L.CircleMarker {
   feature: {
      type: "Feature";
      properties: MonumentProps;
      geometry: {
         type: "Point";
         coordinates: [number, number];
      };
   };
   /** Overlap-group membership used to spread clustered markers apart. */
   spread: { index: number; size: number };
   /** Stroke style to restore after a highlight ends (differs per status). */
   baseStyle: { color: string; weight: number };
}

/** Callbacks wired to user interactions with the map (sidebar opens, clicks). */
export interface MapOptions {
   onMapClick?: (e: L.LeafletMouseEvent) => void;
   onSidebarContentChange?: (id: string) => void;
   onSidebarClosing?: () => void;
   /** Fires after each viewport sync with the number of markers on screen. */
   onVisibleCountChange?: (count: number) => void;
}

/** Marker predicate used to decide whether a marker should be on the map. */
export type MarkerFilter = (props: MonumentProps) => boolean;

/** How many markers are added per animation frame when populating the viewport. */
const CHUNK_SIZE = 150;

/** Small viewport diffs are applied synchronously; larger ones are chunked. */
const IMMEDIATE_ADD_LIMIT = 200;

/**
 * Creates a map controller. Returns reactive refs and methods used by
 * MonumentMap.vue; `initialize` must be called once the container exists.
 */
export function useLeafletMap() {
   const mapInstance = shallowRef<L.Map | null>(null);
   const sidebarInstance = shallowRef<SidebarControl | null>(null);
   const markersGroup = shallowRef<L.LayerGroup | null>(null);
   const activeMarkerLayer = shallowRef<L.CircleMarker | null>(null);
   let currentBaseRadius = 8;
   /** Marker the canvas pointer is currently over (drives the cursor only). */
   let hoveredMarker: L.CircleMarker | null = null;

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

      // Esri World Imagery replaces the previous unofficial Google tile URL:
      // licensed for this use, with proper attribution.
      const satelliteLayer = L.tileLayer(
         "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
         {
            maxZoom: 19,
            attribution: "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
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
      visibleCountCallback = options.onVisibleCountChange ?? null;

      // 3. Context Menu (right-click)
      let contextMenuEl: HTMLDivElement | null = null;

      const dismissContextMenu = () => {
         contextMenuEl?.remove();
         contextMenuEl = null;
      };

      map.on("contextmenu", (e: L.LeafletMouseEvent) => {
         dismissContextMenu();

         const { lat, lng } = e.latlng;

         const menu = document.createElement("div");
         menu.className = "wlm-contextmenu";

         const coords = document.createElement("div");
         coords.className = "wlm-contextmenu-coords";
         coords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
         menu.appendChild(coords);

         const actions = document.createElement("div");
         actions.className = "wlm-contextmenu-actions";

         const copyBtn = document.createElement("button");
         copyBtn.className = "wlm-contextmenu-btn";
         copyBtn.textContent = "Koordinatları kopyala";
         copyBtn.onclick = async () => {
            try {
               await navigator.clipboard.writeText(`${lat}, ${lng}`);
               copyBtn.textContent = "Kopyalandı!";
               setTimeout(dismissContextMenu, 800);
            } catch {
               copyBtn.textContent = "Xəta!";
               setTimeout(dismissContextMenu, 1200);
            }
         };

         const osmBtn = document.createElement("button");
         osmBtn.className = "wlm-contextmenu-btn";
         osmBtn.textContent = "OpenStreetMap-da aç";
         osmBtn.onclick = () => {
            window.open(
               `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
               "_blank",
            );
            dismissContextMenu();
         };

         const gmapsBtn = document.createElement("button");
         gmapsBtn.className = "wlm-contextmenu-btn";
         gmapsBtn.textContent = "Google Maps-da aç";
         gmapsBtn.onclick = () => {
            window.open(`https://www.google.com/maps/@${lat},${lng},18z`, "_blank");
            dismissContextMenu();
         };

         actions.appendChild(copyBtn);
         actions.appendChild(osmBtn);
         actions.appendChild(gmapsBtn);
         menu.appendChild(actions);

         document.body.appendChild(menu);
         menu.style.left = `${e.originalEvent.pageX}px`;
         menu.style.top = `${e.originalEvent.pageY}px`;

         // Flip if overflowing right edge
         const rect = menu.getBoundingClientRect();
         if (rect.right > window.innerWidth) {
            menu.style.left = `${e.originalEvent.pageX - rect.width}px`;
         }
         if (rect.bottom > window.innerHeight) {
            menu.style.top = `${e.originalEvent.pageY - rect.height}px`;
         }

         contextMenuEl = menu;
      });

      map.on("click", dismissContextMenu);

      // 4. Controls

      // Basemap switcher: a custom control (see utils/basemapControl.ts)
      // that owns its markup and fires `baselayerchange` like the stock
      // layers control, so the minimap sync below keeps working unchanged.
      const layerControl = new BasemapControl([
         { name: "OpenStreetMap", layer: osmLayer },
         { name: "Gomap.az", layer: gomapLayer },
         { name: "Peyk (Esri)", layer: satelliteLayer },
      ]).addTo(map);

      L.control.zoom({ position: "topright" }).addTo(map);

      // 5. Sidebar
      const sidebar = L.control
         .sidebar({ container: "sidebar", position: "left", autopan: true })
         .addTo(map);
      sidebarInstance.value = sidebar;

      sidebar.on("content", (e: { id?: string }) => options.onSidebarContentChange?.(e.id ?? ""));
      sidebar.on("closing", () => options.onSidebarClosing?.());

      // 6. Locate Control
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

         // Build the button contents from real DOM nodes rather than an
         // innerHTML template string.
         const main = document.createElement("span");
         main.className = "locate-icon-main";
         if (locateIcon.node[0]) main.appendChild(locateIcon.node[0]);

         const loading = document.createElement("span");
         loading.className = "locate-icon-loading";
         loading.style.display = "none";
         if (spinnerIcon.node[0]) loading.appendChild(spinnerIcon.node[0]);

         locateBtn.replaceChildren(main, loading);
      }

      // 7. Global Map Events
      map.on("click", (e: L.LeafletMouseEvent) => {
         if (e.originalEvent.defaultPrevented) return;
         options.onMapClick?.(e);
      });

      // 8. MiniMap
      const miniMapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
         maxZoom: 18,
      });

      const miniMapControl = new L.Control.MiniMap(miniMapLayer, {
         toggleDisplay: true,
         minimized: false,
         position: "bottomright",
         width: 150,
         height: 150,
         strings: { hideText: "Gizlə", showText: "Göstər" },
      }).addTo(map);

      map.on("baselayerchange", (e: L.LayersControlEvent) => {
         const layer = e.layer as L.TileLayer;
         const tileLayer = layer as L.TileLayer & { _url?: string };
         if (layer && tileLayer._url) {
            const newMiniLayer = L.tileLayer(tileLayer._url, {
               ...layer.options,
               maxZoom: 18,
               attribution: "",
            });
            miniMapControl.changeLayer(newMiniLayer);
         }
      });

      return { map, sidebar, layerControl };
   };

   /** Effective displayed radius: base + highlight offset. */
   const effectiveRadius = (m: L.Layer): number =>
      currentBaseRadius + (m === activeMarkerLayer.value ? HIGHLIGHT_RADIUS_OFFSET : 0);

   /** Restores a marker's stroke to its status style (undo highlight). */
   const restoreBaseStyle = (marker: L.CircleMarker) => {
      const base = (marker as MonumentMarker).baseStyle;
      marker.setStyle({ color: base.color, weight: base.weight });
      marker.setRadius(effectiveRadius(marker));
   };

   const highlightMarker = (marker: L.CircleMarker | null) => {
      // 1. Remove highlight from previous. Clear the active reference first so
      // effectiveRadius() drops the highlight offset while restoring.
      const previous = activeMarkerLayer.value;
      activeMarkerLayer.value = null;
      if (previous) {
         restoreBaseStyle(previous);
      }

      // 2. Add highlight to new
      if (marker) {
         activeMarkerLayer.value = marker;
         marker.setStyle({
            color: "#ffd700", // Yellow border for selection
            weight: 4,
         });
         marker.setRadius(effectiveRadius(marker));
      }
   };

   /** Shows the pointer cursor while the canvas pointer is over a marker. */
   const hoverMarker = (marker: L.CircleMarker | null) => {
      if (hoveredMarker === marker) return;
      hoveredMarker = marker;

      const container = mapInstance.value?.getContainer();
      if (container) container.style.cursor = marker ? "pointer" : "";
   };

   /** Clears a hover; ignores stale outs that arrive after a new hover. */
   const unhoverMarker = (marker: L.CircleMarker) => {
      if (hoveredMarker === marker) hoverMarker(null);
   };

   /**
    * Moves a spread member back onto the ring for the current zoom. Its true
    * location stays in feature.geometry.coordinates — only the drawn position
    * shifts. Members with no overlap group are left untouched.
    */
   const repositionSpread = (marker: MonumentMarker) => {
      const { index, size } = marker.spread;
      if (size <= 1) return;
      const [lng, lat] = marker.feature.geometry.coordinates;
      const zoom = mapInstance.value?.getZoom() ?? 7;
      const pos = getSpreadPosition(
         lat,
         lng,
         index,
         size,
         zoom,
         getSpreadSpacingPx(currentBaseRadius),
      );
      marker.setLatLng([pos.lat, pos.lng]);
   };

   /**
    * Re-applies the base radius to every rendered marker (highlight kept
    * larger) and refreshes spread positions for the current zoom.
    */
   const setMarkerRadius = (radius: number) => {
      currentBaseRadius = radius;
      const layer = markersGroup.value;
      if (!layer) return;
      layer.getLayers().forEach((m: L.Layer) => {
         (m as L.CircleMarker).setRadius(effectiveRadius(m));
         repositionSpread(m as MonumentMarker);
      });
   };

   const setupMarkerLayer = () => {
      if (!mapInstance.value) return null;

      const markerLayer = L.layerGroup();
      markersGroup.value = markerLayer;
      mapInstance.value.addLayer(markerLayer);

      return markerLayer;
   };

   const flyToMarker = (marker: MonumentMarker, zoom = 16) => {
      if (!mapInstance.value) return;
      // Fly to the true coordinates, not the spread display position, so the
      // map centres on where the monument actually is.
      const [lng, lat] = marker.feature.geometry.coordinates;
      mapInstance.value.flyTo([lat, lng], zoom, { duration: 1.5 });
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
   // Assigned in initialize; lets syncViewport announce the on-screen count.
   let visibleCountCallback: ((count: number) => void) | null = null;

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
         // A marker's spread position was computed for the zoom it was
         // created at; refresh it in case the zoom changed since.
         for (const m of toAdd) repositionSpread(m as MonumentMarker);
         if (toAdd.length <= IMMEDIATE_ADD_LIMIT) {
            // Small diffs (a filter toggle, a short pan) land instantly
            // instead of waiting on the chunked animation-frame path.
            for (const m of toAdd) {
               layer.addLayer(m);
               addedMarkers.add(m);
            }
         } else {
            addMarkersChunked(toAdd);
         }
      }

      // Announce the settled on-screen count. Chunked adds are not yet in
      // addedMarkers, so include them; immediate adds already are.
      const pendingChunked = toAdd.length > IMMEDIATE_ADD_LIMIT ? toAdd.length : 0;
      visibleCountCallback?.(addedMarkers.size + pendingChunked);
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
      viewportTimer = setTimeout(() => syncViewport(passesFilter), 50);
   };

   /** Cancels pending work and clears all rendered markers. */
   const disposeMarkers = () => {
      if (viewportTimer) clearTimeout(viewportTimer);
      viewportTimer = null;
      chunkHandle++; // Supersede any in-flight chunked add
      allMarkers = [];
      addedMarkers.clear();
      hoveredMarker = null;
   };

   const disposeContextMenu = () => {
      const el = document.querySelector(".wlm-contextmenu");
      el?.remove();
   };

   return {
      mapInstance,
      sidebarInstance,
      markersGroup,
      activeMarkerLayer,
      initialize,
      highlightMarker,
      hoverMarker,
      unhoverMarker,
      setupMarkerLayer,
      flyToMarker,
      syncViewport,
      renderMarkers,
      scheduleViewportSync,
      disposeMarkers,
      setMarkerRadius,
      disposeContextMenu,
   };
}
