<template>
   <div>
      <h1 class="mt-4 mb-4 text-2xl font-bold text-gray-800">
         Viki Abidələri Sevir Azərbaycan
      </h1>

      <!-- Search Component -->
      <SearchBar :monuments="monuments" @select-monument="$emit('select-monument', $event)" />

      <!-- Statistics Cards -->
      <div class="mb-6 grid grid-cols-3 gap-2 text-center">
         <div class="rounded-lg border border-blue-100 bg-blue-50 p-2">
            <div class="text-xl font-bold text-blue-700">{{ stats.total }}</div>
            <div class="text-[10px] font-bold tracking-wider text-blue-600 uppercase">
               Cəmi
            </div>
         </div>
         <div class="rounded-lg border border-green-100 bg-green-50 p-2">
            <div class="text-xl font-bold text-green-700">{{ stats.withImage }}</div>
            <div class="text-[10px] font-bold tracking-wider text-green-600 uppercase">
               Şəkilli
            </div>
         </div>
         <div class="rounded-lg border border-red-100 bg-red-50 p-2">
            <div class="text-xl font-bold text-red-700">
               {{ stats.total - stats.withImage }}
            </div>
            <div class="text-[10px] font-bold tracking-wider text-red-600 uppercase">
               Şəkilsiz
            </div>
         </div>
      </div>

      <!-- Filter Toggle -->
      <div
         class="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
      >
         <span class="text-sm font-medium text-gray-700" id="filter-label">Yalnız şəkilsizləri göstər</span>
         <button
            @click="$emit('toggle-filter')"
            @keydown.enter.prevent="$emit('toggle-filter')"
            @keydown.space.prevent="$emit('toggle-filter')"
            role="switch"
            :aria-checked="needsPhotoOnly"
            aria-labelledby="filter-label"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none"
            :class="needsPhotoOnly ? 'bg-blue-600' : 'bg-gray-200'"
         >
            <span
               class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
               :class="needsPhotoOnly ? 'translate-x-5' : 'translate-x-0'"
            ></span>
         </button>
      </div>

      <!-- Progress Bar -->
      <div class="mb-6">
         <div class="mb-1 flex justify-between text-xs font-medium text-gray-500">
            <span>Gedişat</span>
            <span :aria-label="`${progressPercent} faiz tamamlandı`">{{ progressPercent }}%</span>
         </div>
         <div
            class="h-2.5 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            :aria-valuenow="progressPercent"
            aria-valuemin="0"
            aria-valuemax="100"
         >
            <div
               class="h-2.5 rounded-full bg-green-500 transition-all duration-1000 ease-out"
               :style="{ width: `${progressPercent}%` }"
            ></div>
         </div>
      </div>

      <!-- Map Legend -->
      <MonumentLegend />
   </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import type { Feature } from "geojson";
import SearchBar from "./SearchBar.vue";
import MonumentLegend from "./MonumentLegend.vue";

interface Props {
   stats: { total: number; withImage: number };
   needsPhotoOnly: boolean;
   monuments: Feature[];
}

const props = defineProps<Props>();

defineEmits<{
   "toggle-filter": [];
   "select-monument": [feature: Feature];
}>();

const progressPercent = computed(() => {
   return Math.round((props.stats.withImage / props.stats.total) * 100) || 0;
});
</script>
