<template>
   <div class="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div v-if="loading" class="flex h-64 items-center justify-center">
         <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="error" class="mx-auto max-w-3xl rounded-lg bg-white p-6 text-center shadow">
         <h2 class="mb-4 text-2xl font-bold text-red-600">Xəta baş verdi</h2>
         <p class="mb-6 text-gray-600">{{ error }}</p>
         <router-link
            to="/"
            class="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700"
         >
            Xəritəyə qayıt
         </router-link>
      </div>

      <div
         v-else-if="monument"
         class="mx-auto max-w-4xl overflow-hidden rounded-xl bg-white shadow-lg"
      >
         <!-- Header / Navigation -->
         <div class="flex items-center justify-between bg-blue-600 px-6 py-4">
            <router-link to="/" class="flex items-center gap-2 text-white hover:text-blue-100">
               <i class="fas fa-arrow-left"></i> Xəritə
            </router-link>
            <router-link
               :to="`/?inventory=${monument.inventory}`"
               class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-gray-100"
            >
               <i class="fas fa-map-marked-alt mr-2"></i> Xəritədə göstər
            </router-link>
         </div>

         <div class="p-6 md:p-8">
            <!-- Reuse MonumentDetails Logic/Layout here or import it -->
            <!-- Since MonumentDetails is built for sidebar, we might validly just use it
                 but it might feel cramped. Let's create a custom responsive layout using the same data. -->

            <div class="flex flex-col gap-8 md:flex-row">
               <!-- Left: Info -->
               <div class="w-full space-y-4 md:w-1/2">
                  <h1 class="text-3xl font-bold text-gray-900">{{ monument.itemLabel }}</h1>

                  <div v-if="monument.itemAltLabel" class="text-sm italic text-gray-500">
                     {{ monument.itemAltLabel }}
                  </div>

                  <div class="flex items-center gap-2 text-sm text-gray-500">
                     <span class="rounded bg-gray-100 px-2 py-1">#{{ monument.inventory }}</span>
                  </div>

                  <div v-if="monument.itemDescription" class="prose text-gray-700">
                     {{ monument.itemDescription }}
                  </div>

                  <div class="mt-4 grid grid-cols-1 gap-3 border-t pt-4">
                     <div v-if="monument.item">
                        <a
                           :href="monument.item"
                           target="_blank"
                           class="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                           <CdxIcon :icon="cdxIconLogoWikidata" class="h-5 w-5" />
                           {{ monument.item.split("/").pop() }}
                        </a>
                     </div>
                     <div v-if="monument.azLink">
                        <a
                           :href="monument.azLink"
                           target="_blank"
                           class="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                           <CdxIcon :icon="cdxIconLogoWikipedia" class="h-5 w-5" />
                           Vikipediya məqaləsi
                        </a>
                     </div>
                     <div v-if="monument.commonsCategory">
                        <a
                           :href="getCategoryLink(monument.commonsCategory)"
                           target="_blank"
                           class="flex items-center gap-2 text-blue-600 hover:underline"
                        >
                           <CdxIcon :icon="cdxIconLogoWikimediaCommons" class="h-5 w-5" />
                           Vikianbar kateqoriyası
                        </a>
                     </div>
                  </div>
               </div>

               <!-- Right: Image -->
               <div class="w-full space-y-4 md:w-1/2">
                  <div
                     v-if="monument.image"
                     class="group relative overflow-hidden rounded-lg shadow-md"
                  >
                     <img
                        :src="getOptimizedImage(monument.image)"
                        :alt="monument.itemLabel"
                        class="h-auto w-full object-cover"
                        width="800"
                        height="600"
                     />
                     <div
                        v-if="imageCredit"
                        class="absolute right-0 bottom-0 left-0 bg-black/60 p-2 text-xs text-white"
                     >
                        <i class="fa-regular fa-copyright mr-0.5 text-[9px]"></i>
                        {{ imageCredit.author }}
                        <span class="mx-1 opacity-50">|</span>
                        {{ imageCredit.license }}
                     </div>
                  </div>
                  <div
                     v-else
                     class="flex aspect-video items-center justify-center rounded-lg bg-gray-100 text-gray-400"
                  >
                     <div class="text-center">
                        <i class="fas fa-image mb-2 text-4xl"></i>
                        <p>Şəkil yoxdur</p>
                     </div>
                  </div>

                  <!-- Upload Button -->
                  <div class="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-center">
                     <p class="mb-3 text-gray-700">Bu abidənin şəklini çəkmisiniz?</p>
                     <button
                        v-if="auth.user"
                        class="w-full rounded-lg bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
                        @click="showUploadInfo"
                     >
                        <i class="fas fa-camera mr-2"></i> Şəkil Yüklə
                     </button>
                     <button
                        v-else
                        class="w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                        @click="auth.login"
                     >
                        <i class="fas fa-sign-in-alt mr-2"></i> Yükləmək üçün daxil ol
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>
   </div>

   <!-- Upload Modal -->
   <UploadModal
      :is-open="isUploadModalOpen"
      :monument="monument"
      @close="isUploadModalOpen = false"
   />
</template>

<script setup lang="ts">
import geobuf from "geobuf";
import Pbf from "pbf";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@unhead/vue";
import { CdxIcon } from "@wikimedia/codex";
import {
   cdxIconLogoWikidata,
   cdxIconLogoWikimediaCommons,
   cdxIconLogoWikipedia,
} from "@wikimedia/codex-icons";
import UploadModal from "../components/UploadModal.vue";
import {
   schemaToJsonLd,
   useBreadcrumbSchema,
   useMonumentSchema,
} from "../composables/useSchemaOrg";
import { useWikiCredits } from "../composables/useWikiCredits";
import { useAuthStore } from "../stores/auth";
import type { MonumentProps } from "../types";
import { getOptimizedImage } from "../utils/monumentFormatters";

const auth = useAuthStore();

const route = useRoute();
const loading = ref(true);
const error = ref<string | null>(null);
const monument = ref<MonumentProps | null>(null);
const isUploadModalOpen = ref(false);
const { imageCredit, fetchImageMetadata } = useWikiCredits();

const showUploadInfo = () => {
   isUploadModalOpen.value = true;
};

const getCategoryLink = (category: string) => {
   return `https://commons.wikimedia.org/wiki/Category:${category}`;
};

// Computed Schema.org structured data
const monumentSchema = computed(() => {
   if (!monument.value) return null;
   return useMonumentSchema(monument.value);
});

const breadcrumbSchema = computed(() => {
   if (!monument.value) return null;
   return useBreadcrumbSchema([
      { name: "Ana Səhifə", url: "https://wikilovesmonuments.az/" },
      {
         name: monument.value.itemLabel || "Abidə",
         url: `https://wikilovesmonuments.az/monument/${monument.value.inventory}`,
      },
   ]);
});

useHead({
   title: () =>
      monument.value
         ? `${monument.value.itemLabel} | Viki Abidələri Sevir Azərbaycan`
         : "Abidə Detalları",
   link: [
      {
         rel: "canonical",
         href: () =>
            monument.value
               ? `https://wikilovesmonuments.az/monument/${monument.value.inventory}`
               : "https://wikilovesmonuments.az/",
      },
   ],
   meta: [
      {
         name: "description",
         content: () => monument.value?.itemDescription || "Abidə haqqında məlumat",
      },
      {
         property: "og:title",
         content: () => monument.value?.itemLabel,
      },
      {
         property: "og:description",
         content: () => monument.value?.itemDescription,
      },
      {
         property: "og:image",
         content: () =>
            monument.value?.image ? getOptimizedImage(monument.value.image) : "/wlm-az.png",
      },
   ],
   script: [
      {
         type: "application/ld+json",
         innerHTML: () => (monumentSchema.value ? schemaToJsonLd(monumentSchema.value) : ""),
      },
      {
         type: "application/ld+json",
         innerHTML: () => (breadcrumbSchema.value ? schemaToJsonLd(breadcrumbSchema.value) : ""),
      },
   ],
});

onMounted(async () => {
   try {
      const id = route.params.id as string;
      if (!id) throw new Error("Abidə ID-si tapılmadı");

      // For now, fresh fetch to ensure validity. Browser caches the PBF anyway.

      const response = await fetch("/monuments.pbf");
      if (!response.ok) throw new Error("Məlumatları yükləmək mümkün olmadı");

      const buffer = await response.arrayBuffer();
      const geoData = geobuf.decode(new Pbf(buffer)) as any;

      const feature = geoData.features.find((f: any) => f.properties.inventory === id);

      if (!feature) {
         throw new Error("Abidə tapılmadı");
      }

      monument.value = feature.properties;

      if (monument.value?.image) {
         fetchImageMetadata(monument.value.image);
      }
   } catch (e: any) {
      error.value = e.message || "Xəta baş verdi";
   } finally {
      loading.value = false;
   }
});
</script>
