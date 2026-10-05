<template>
   <!--
      Takes the counts rather than the monument list, so the panel has no way to
      compute its own denominator. `RegionPage.vue` already derives the list the
      table renders; the stats describe that same list.
   -->
   <section v-if="stats" class="border-b border-gray-200 p-4">
      <h2 class="text-sm font-bold tracking-wider text-gray-500 uppercase">
         {{ REGIONS_STATS_HEADING }}
      </h2>

      <dl class="mt-3 grid grid-cols-3 gap-4">
         <div v-for="tile in tiles" :key="tile.label">
            <dt class="text-xs text-gray-500">{{ tile.label }}</dt>
            <dd class="mt-0.5 text-xl font-bold text-gray-900 sm:text-2xl">
               {{ formatMonumentCount(tile.value) }}
            </dd>
         </div>
      </dl>

      <!--
         The bar is decorative next to the three counts above, which already
         state the same figures as text, so it is labelled rather than read out.
      -->
      <div
         class="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200"
         role="img"
         :aria-label="REGIONS_STATS_BAR_LABEL(stats.withPhoto, stats.total)"
      >
         <div
            class="h-full rounded-full bg-green-500"
            :style="{ width: `${stats.percent}%` }"
         ></div>
      </div>

      <p class="mt-2 text-xs text-gray-500">
         {{ stats.percent }}% {{ REGIONS_STATS_PHOTOGRAPHED }}
      </p>
      <p class="mt-1 text-xs text-gray-400">{{ REGIONS_STATS_FOOTNOTE }}</p>
   </section>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import {
   REGIONS_STATS,
   REGIONS_STATS_BAR_LABEL,
   REGIONS_STATS_FOOTNOTE,
   REGIONS_STATS_HEADING,
   REGIONS_STATS_PHOTOGRAPHED,
} from "@/content/regions";
import { formatMonumentCount } from "@/content/home";
import type { RegionPhotoStats } from "@/utils/regions";

const props = defineProps<{
   /** `null` when the region has no monuments; the panel then renders nothing. */
   stats: RegionPhotoStats | null;
}>();

const tiles = computed(() => {
   if (!props.stats) return [];
   return [
      { label: REGIONS_STATS.withPhoto, value: props.stats.withPhoto },
      { label: REGIONS_STATS.withoutPhoto, value: props.stats.withoutPhoto },
      { label: REGIONS_STATS.total, value: props.stats.total },
   ];
});
</script>
