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
import { computed, onErrorCaptured, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead } from "@unhead/vue";
import MonumentMap from "../components/MonumentMap.vue";
import { schemaToJsonLd, useOrganizationSchema } from "../composables/useSchemaOrg";
import { useMonumentStore } from "../stores/monuments";
import { getOptimizedImage, getSrcSet } from "../utils/monumentFormatters";

const monumentStore = useMonumentStore();

const route = useRoute();
const router = useRouter();
const error = ref<Error | null>(null);

// Redirect legacy /?inventory=X to /monument/X
onMounted(() => {
   if (route.query.inventory) {
      router.replace(`/monument/${route.query.inventory}`);
   }
});

// Schema.org markup for homepage
const organizationSchema = useOrganizationSchema();

useHead({
   title: "Viki Abidələri Sevir Azərbaycan - Abidələrin İnteraktiv Xəritəsi",
   link: computed(() => {
      const links: any[] = [
         {
            rel: "canonical",
            href: "https://wikilovesmonuments.az/",
         },
      ];

      if (monumentStore.selectedMonument?.image) {
         links.push({
            rel: "preload",
            as: "image",
            href: getOptimizedImage(monumentStore.selectedMonument.image),
            imagesrcset: getSrcSet(monumentStore.selectedMonument.image, [320, 640, 800]),
            imagesizes: "(max-width: 768px) 100vw, 400px",
         } as any);
      }
      return links;
   }),
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
