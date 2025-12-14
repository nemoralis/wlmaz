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
               <i class="fa fa-exclamation-triangle text-2xl"></i>
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
import { onErrorCaptured, ref } from "vue";
import { useHead } from "@unhead/vue";
import MonumentMap from "../components/MonumentMap.vue";
import {
   schemaToJsonLd,
   useOrganizationSchema,
   useWebSiteSchema,
} from "../composables/useSchemaOrg";

const error = ref<Error | null>(null);

// Schema.org markup for homepage
const organizationSchema = useOrganizationSchema();
const websiteSchema = useWebSiteSchema();

useHead({
   title: "Viki Abidələri Sevir Azərbaycan - İnteraktiv Xəritə",
   meta: [
      {
         name: "description",
         content:
            "Azərbaycandakı abidələrin interaktiv xəritəsi. Viki Abidələri Sevir müsabiqəsi üçün fotoşəkillər yükləyin.",
      },
   ],
   script: [
      {
         type: "application/ld+json",
         innerHTML: schemaToJsonLd(organizationSchema),
      },
      {
         type: "application/ld+json",
         innerHTML: schemaToJsonLd(websiteSchema),
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
