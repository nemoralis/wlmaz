<template>
   <div class="flex h-full flex-col bg-[#f8f9fa]">
      <div class="border-b border-gray-200 bg-white">
         <div class="container mx-auto px-4 py-4">
            <h1 class="text-2xl font-bold text-gray-900">{{ REGIONS_TITLE }}</h1>
            <p class="mt-1 text-sm text-gray-600">{{ REGIONS_DESCRIPTION }}</p>
         </div>
      </div>

      <div class="container mx-auto flex flex-1 flex-col px-4 py-6">
         <div class="border border-gray-200 bg-white p-4 sm:p-6">
            <RegionsMap />
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { useHead } from "@unhead/vue";
import RegionsMap from "@/components/RegionsMap.vue";
import { REGIONS_CANONICAL, REGIONS_DESCRIPTION, REGIONS_TITLE } from "@/content/regions";

useHead({
   title: `${REGIONS_TITLE} | Viki Abidələri Sevir Azərbaycan`,
   link: [{ rel: "canonical", href: REGIONS_CANONICAL }],
   meta: [{ name: "description", content: REGIONS_DESCRIPTION }],
});
</script>
