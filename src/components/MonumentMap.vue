<template>
  <div id="map-container">
    <div v-if="loading" class="loading-overlay">Loading monuments…</div>
    <div id="map"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue'
import L from 'leaflet'
import 'leaflet.markercluster'
import "leaflet.fullscreen"
import { LocateControl } from "leaflet.locatecontrol";

import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import 'leaflet.fullscreen/Control.FullScreen.css';

//TODO: Add leaflet-search and leaflet-geosearch
//TODO: Analyze usage of Leaflet.EasyButton
import monumentsGeoJSONRaw from '../assets/monuments.geojson?raw'

export default defineComponent({
  name: 'MonumentMap',
  setup() {
    const loading = ref(true)

    onMounted(() => {
      const geoData = JSON.parse(monumentsGeoJSONRaw)
      const markers = L.markerClusterGroup()

      const urlParams = new URLSearchParams(window.location.search)
      const targetInventory = urlParams.get('inventory')

      // Default map coordinates
      let initialLat = 40.4093
      let initialLng = 49.8671
      let initialZoom = 7

      // TARGET MARKER OUTER SCOPE
      let targetMarker: L.Layer | null = null

      //TODO: Implement auto update for geojson file
      L.geoJSON(geoData, {
        pointToLayer: (feature, latlng) => {
          const name = feature.properties?.itemLabel || 'Unknown'
          const inventory = feature.properties?.inventoryID

          const marker = L.circleMarker(latlng, {
            radius: 6,
            color: '#2a7ae2',
            fillColor: '#4285f4',
            fillOpacity: 0.7,
            weight: 1
          }).bindPopup(name)

          // Check for target inventory
          if (targetInventory && inventory === targetInventory) {
            targetMarker = marker
            initialLat = latlng.lat
            initialLng = latlng.lng
            initialZoom = 15
          }

          return marker
        }
      }).eachLayer(layer => markers.addLayer(layer))

      //TODO: Testing TODO
      const map = L.map('map', {
        fullscreenControl: true,
        fullscreenControlOptions: {
          position: 'topleft',
          forceSeparateButton: true,
        }
      }).setView([initialLat, initialLng], initialZoom)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map)
      map.addLayer(markers)

      const locateControl = new LocateControl({
        keepCurrentZoomLevel: true
      })

      locateControl.addTo(map);

      // Open popup for target marker
      if (targetMarker) {
        (targetMarker as L.CircleMarker).openPopup()
      } else {
        // No inventoryID → try to center from URL lat/lng/zoom
        const latParam = urlParams.get('lat')
        const lngParam = urlParams.get('lng')
        const zoomParam = urlParams.get('zoom')
        if (latParam && lngParam && zoomParam) {
          map.setView([parseFloat(latParam), parseFloat(lngParam)], parseInt(zoomParam))
        }
      }

      // Realtime URL updates on map move/zoom if not targeting inventoryID
      if (!targetInventory) {
        map.on('moveend zoomend', () => {
          const center = map.getCenter()
          const newParams = new URLSearchParams(window.location.search)
          newParams.set('lat', center.lat.toFixed(5))
          newParams.set('lng', center.lng.toFixed(5))
          newParams.set('zoom', map.getZoom().toString())
          window.history.replaceState({}, '', `${window.location.pathname}?${newParams.toString()}`)
        })
      }

      loading.value = false
    })

    return { loading }
  }
})
</script>

<style scoped>
#map-container {
  position: relative;
  height: 100%;
  width: 100%;
}

#map {
  height: 100%;
  width: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
  color: #333;
}
</style>
