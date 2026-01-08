<template>
   <div class="animate-fade-in-up space-y-8">
      <!-- 1. Header with Gradient -->
      <div class="mt-4 text-center">
         <h1
            class="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-extrabold text-transparent"
         >
            Viki Abidələri Sevir
         </h1>
         <p class="text-sm font-medium tracking-widest text-gray-400 uppercase">Azərbaycan</p>
      </div>

      <!-- 2. Search Component -->
      <SearchBar
         :monuments="monuments"
         :fuse-index="fuseIndex"
         @select-monument="$emit('select-monument', $event)"
      />

      <!-- 3. Glassy Stats Cards -->
      <div class="grid grid-cols-3 gap-3">
         <!-- Total -->
         <div
            class="group flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-4 shadow-sm transition-all hover:border-blue-100 hover:shadow-md"
         >
            <div
               class="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white"
            >
               <i class="fa-solid fa-layer-group text-xs"></i>
            </div>
            <div class="text-xl font-bold text-gray-800">{{ stats.total }}</div>
            <div class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Cəmi</div>
         </div>

         <!-- With Image -->
         <div
            class="group flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-4 shadow-sm transition-all hover:border-green-100 hover:shadow-md"
         >
            <div
               class="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600 transition-colors group-hover:bg-green-600 group-hover:text-white"
            >
               <i class="fa-solid fa-image text-xs"></i>
            </div>
            <div class="text-xl font-bold text-gray-800">{{ stats.withImage }}</div>
            <div class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Şəkilli</div>
         </div>

         <!-- No Image -->
         <div
            class="group flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-4 shadow-sm transition-all hover:border-red-100 hover:shadow-md"
         >
            <div
               class="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600 transition-colors group-hover:bg-red-600 group-hover:text-white"
            >
               <i class="fa-solid fa-camera text-xs"></i>
            </div>
            <div class="text-xl font-bold text-gray-800">
               {{ stats.total - stats.withImage }}
            </div>
            <div class="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Şəkilsiz</div>
         </div>
      </div>

      <!-- 4. Filter Toggle (Modern Switch) -->
      <div
         class="flex cursor-pointer items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 active:scale-[0.99]"
         @click="$emit('toggle-filter')"
      >
         <div class="flex items-center gap-3">
            <div
               class="flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-500"
            >
               <i class="fa-solid fa-filter text-sm"></i>
            </div>
            <div class="flex flex-col">
               <span class="text-sm font-bold text-gray-700">Filterlə</span>
               <span class="text-[10px] font-medium text-gray-400">Yalnız şəkilsizləri göstər</span>
            </div>
         </div>

         <div
            class="relative h-6 w-10 transition-all duration-300"
            :class="needsPhotoOnly ? 'opacity-100' : 'opacity-60 grayscale'"
         >
            <div
               class="absolute inset-0 rounded-full transition-colors duration-300"
               :class="needsPhotoOnly ? 'bg-blue-600' : 'bg-gray-200'"
            ></div>
            <div
               class="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300"
               :class="needsPhotoOnly ? 'translate-x-4' : 'translate-x-0'"
            ></div>
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import type { Feature } from "geojson";
import SearchBar from "./SearchBar.vue";

interface Props {
   stats: { total: number; withImage: number };
   needsPhotoOnly: boolean;
   monuments: Feature[];
   fuseIndex?: any;
}

const props = defineProps<Props>();

defineEmits<{
   "toggle-filter": [];
   "select-monument": [feature: Feature];
}>();
</script>

<style scoped>
@keyframes fadeInUp {
   from {
      opacity: 0;
      transform: translateY(10px);
   }
   to {
      opacity: 1;
      transform: translateY(0);
   }
}

.animate-fade-in-up {
   animation: fadeInUp 0.4s ease-out forwards;
}

/* Staggered animation for children could be added here if needed,
   but a simple fade-up for the whole container is a good start. */
</style>
