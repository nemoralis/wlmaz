<template>
   <div class="relative h-full w-full">
      <div
         v-if="error"
         class="absolute inset-0 z-5000 flex flex-col items-center justify-center bg-gray-50 p-6 text-center"
      >
         <div class="max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-xl">
            <div
               class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600"
            >
               <font-awesome-icon :icon="['fas', 'exclamation-triangle']" class="text-2xl" />
            </div>
            <h2 class="mb-2 text-xl font-bold text-gray-900">Map could not be loaded</h2>
            <p class="mb-6 text-gray-600">
               {{ error.message || "An unexpected error occurred while initializing the map." }}
            </p>
            <button
               class="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
               @click="reload"
            >
               Reload page
            </button>
         </div>
      </div>

      <MonumentMap v-else />
   </div>
</template>

<script lang="ts" setup>
import { computed, onErrorCaptured, ref } from "vue";
import { useHead } from "@unhead/vue";
import MonumentMap from "@/components/MonumentMap.vue";
import { schemaToJsonLd, useOrganizationSchema } from "@/composables/useSchemaOrg.ts";
import { useMonumentStore } from "@/stores/monuments.ts";
import { getOptimizedImage, getSrcSet } from "@/utils/monumentFormatters.ts";

const monumentStore = useMonumentStore();

const error = ref<Error | null>(null);

// Schema.org markup for homepage
const organizationSchema = useOrganizationSchema();

useHead({
   title: "Viki Abidələri Sevir Azərbaycan - Abidələrin İnteraktiv Xəritəsi",
   link: computed(() => [
      {
         rel: "canonical" as const,
         href: "https://wikilovesmonuments.az/",
      },
      ...(monumentStore.selectedMonument?.image
         ? [
              {
                 rel: "preload" as const,
                 as: "image" as const,
                 href: getOptimizedImage(monumentStore.selectedMonument.image, 500),
                 imagesrcset: getSrcSet(monumentStore.selectedMonument.image, [330, 500, 960]),
                 imagesizes: "(max-width: 768px) 100vw, 400px",
              },
           ]
         : []),
   ]),
   meta: [
      {
         name: "description",
         content:
            "Azərbaycanın tarixi abidələri və mədəni irs xəritəsi. Bakı, Şəki, Qəbələ və digər bölgələrdəki 300+ abidəni kəşf edin. Viki Abidələri Sevir müsabiqəsinə şəkil yükləyin.",
      },
      {
         property: "og:site_name",
         content: "Viki Abidələri Sevir Azərbaycan",
      },
      {
         property: "og:title",
         content: "Viki Abidələri Sevir Azərbaycan - Abidələrin interaktiv xəritəsi",
      },
   ],
   script: [
      {
         type: "application/ld+json",
         innerHTML: schemaToJsonLd(organizationSchema),
      },
   ],
});

onErrorCaptured((err) => {
   console.error("Map Error Captured:", err);
   error.value = err as Error;
   return false;
});

const reload = () => {
   window.location.reload();
};
</script>
