<template>
   <!--
      The accessible alternative to the map, not a duplicate of it: the map is
      a single canvas image to assistive tech, so every region it draws is
      reachable and activatable from this list regardless of pointer control.
      It reads the same memoised payload the map does, so the two cannot list
      different regions or disagree about a number.
   -->
   <section v-if="regions.length > 0">
      <h2 class="text-lg font-semibold text-gray-900">{{ REGIONS_LIST_HEADING }}</h2>
      <p class="mt-1 text-sm text-gray-600">{{ REGIONS_LIST_INTRO }}</p>

      <ul class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
         <li v-for="region in sortedRegions" :key="region.name">
            <router-link
               :to="regionPath(region.name)"
               class="relative flex items-baseline justify-between gap-2 overflow-hidden rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            >
               <!--
                  The card's background is the region's coverage as a bar: a
                  translucent track under a blue fill whose width is exactly the
                  printed percentage (`regionBarFill`). Decorative only — the
                  label on the right states the same numbers — so both layers
                  are hidden from assistive tech. Regions with nothing recorded
                  stay plain.
               -->
               <span
                  v-if="barWidth(region)"
                  aria-hidden="true"
                  class="absolute inset-0 bg-gray-900/5"
               >
                  <span
                     class="absolute inset-y-0 left-0 bg-[#3366cc]/15"
                     :style="{ width: barWidth(region) }"
                  ></span>
               </span>
               <span class="relative min-w-0 truncate text-sm font-medium text-gray-800">
                  {{ region.name }}
               </span>
               <span
                  class="relative flex-none text-xs"
                  :class="region.total > 0 ? 'font-semibold text-gray-500' : 'text-gray-400'"
               >
                  {{ coverageLabel(region) }}
               </span>
            </router-link>
         </li>
      </ul>
   </section>
</template>

<script lang="ts" setup>
import { computed, onMounted } from "vue";
import { useRegionsMap } from "@/composables/useRegionsMap";
import { regionBarFill, regionPath, type RegionCoverage } from "@/utils/regions";
import {
   REGIONS_LIST_COVERAGE,
   REGIONS_LIST_HEADING,
   REGIONS_LIST_INTRO,
   REGIONS_NO_MONUMENTS,
} from "@/content/regions";

const { load, regions } = useRegionsMap();

/** Alphabetical in the site's own language rather than file order. */
const sortedRegions = computed(() =>
   [...regions.value].sort((a, b) => a.name.localeCompare(b.name, "az")),
);

const coverageLabel = (region: RegionCoverage): string =>
   region.total === 0 || region.percent === null
      ? REGIONS_NO_MONUMENTS
      : REGIONS_LIST_COVERAGE(region.percent, region.withPhoto, region.total);

/** The card-background bar's width, or "" for a region that stays plain. */
const barWidth = (region: RegionCoverage): string => {
   const fill = regionBarFill(region);
   return fill > 0 ? `${(fill * 100).toFixed(1)}%` : "";
};

onMounted(() => {
   void load();
});
</script>
