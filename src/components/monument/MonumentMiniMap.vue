<template>
   <div class="mb-6">
      <div
         ref="mapContainer"
         class="h-[300px] overflow-hidden rounded-lg border border-gray-200"
         role="img"
         :aria-label="`Xəritə — ${lat.toFixed(4)}, ${lon.toFixed(4)}`"
      ></div>
      <div class="mt-2 flex justify-between text-xs text-gray-400">
         <span>© OpenStreetMap</span>
         <router-link :to="`/?inventory=${inventory}`" class="text-blue-600 hover:underline">
            Tam xəritədə baxın
         </router-link>
      </div>
   </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

const props = defineProps<{
   lat: number;
   lon: number;
   inventory: string;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let map: any = null;

const initMap = async () => {
   if (!mapContainer.value || map) return;

   const L = (await import("leaflet")).default;

   map = L.map(mapContainer.value, {
      center: [props.lat, props.lon],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: false,
   });

   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
   }).addTo(map);

   L.circleMarker([props.lat, props.lon], {
      radius: 8,
      fillColor: "#3366cc",
      color: "#fff",
      weight: 2,
      opacity: 1,
      fillOpacity: 1,
   }).addTo(map);
};

onMounted(() => {
   initMap();
});

onUnmounted(() => {
   map?.remove();
   map = null;
});
</script>
