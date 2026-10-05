<template>
   <!--
      Omitted entirely when the region has no photographs at all. 21 of the 84
      populated regions do, and an empty grid under a "Fotoşəkillər" heading
      reads as a loading failure rather than as a fact about the data.
   -->
   <section v-if="photos.length > 0" class="border-b border-gray-200 p-4">
      <div class="flex items-baseline justify-between gap-3">
         <h2 class="text-sm font-bold tracking-wider text-gray-500 uppercase">
            {{ REGIONS_GALLERY_HEADING }}
         </h2>
         <span class="text-xs text-gray-500">
            {{ formatMonumentCount(photos.length) }} / {{ formatMonumentCount(total) }}
         </span>
      </div>

      <ul class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
         <li v-for="photo in shown" :key="photo.inventory?.join('-')">
            <!--
               Links to the Commons File: page rather than opening a lightbox.
               That is where the author and licence live, which is what a visitor
               reusing one of these photographs actually needs.
            -->
            <a
               :href="descriptionPage(photo)"
               target="_blank"
               rel="noopener"
               class="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3366cc]"
            >
               <img
                  :src="thumbnail(photo)"
                  :srcset="thumbnails(photo)"
                  sizes="(max-width: 640px) 33vw, 200px"
                  :alt="altFor(photo)"
                  loading="lazy"
                  decoding="async"
                  class="aspect-square w-full bg-gray-100 object-cover transition group-hover:opacity-90"
               />
            </a>
         </li>
      </ul>

      <!--
         The cap keeps Səbail's 132 photographs from becoming 132 DOM nodes and
         a page length nobody scrolls. The count comes from the same array the
         grid was cut from, so it cannot disagree.
      -->
      <p v-if="remaining > 0" class="mt-3 text-xs text-gray-500">
         {{ REGIONS_GALLERY_MORE(remaining) }}
      </p>
   </section>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import {
   REGIONS_GALLERY_HEADING,
   REGIONS_GALLERY_LIMIT,
   REGIONS_GALLERY_MORE,
} from "@/content/regions";
import { formatMonumentCount } from "@/content/home";
import {
   getCanonicalId,
   getDescriptionPage,
   getOptimizedImage,
   getSrcSet,
} from "@/utils/monumentFormatters";
import type { MonumentProps } from "@/types";

const props = defineProps<{
   /** Every photographed monument in the region, already ordered. */
   photos: MonumentProps[];
   /** The region's monument total, for the "3 / 670" read-out. */
   total: number;
}>();

const shown = computed(() => props.photos.slice(0, REGIONS_GALLERY_LIMIT));
const remaining = computed(() => Math.max(0, props.photos.length - shown.value.length));

/** Small thumbnails: a grid tile is never wider than ~200px. */
const thumbnail = (photo: MonumentProps): string => getOptimizedImage(photo.image ?? "", 240);

const thumbnails = (photo: MonumentProps): string => getSrcSet(photo.image ?? "", [240, 330, 500]);

const descriptionPage = (photo: MonumentProps): string =>
   getDescriptionPage(photo.image ?? "") || "#";

/**
 * The alt text names the monument rather than describing the picture, which we
 * cannot know. Falls back to the inventory id so the attribute is never empty.
 */
const altFor = (photo: MonumentProps): string =>
   photo.itemLabel?.trim() || getCanonicalId(photo.inventory) || "Abidə";
</script>
