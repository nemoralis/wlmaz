<template>
   <div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div v-if="loading" class="flex justify-center items-center h-64">
         <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="error" class="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 text-center">
         <h2 class="text-2xl font-bold text-red-600 mb-4">Xəta baş verdi</h2>
         <p class="text-gray-600 mb-6">{{ error }}</p>
         <router-link
            to="/"
            class="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
         >
            Xəritəyə qayıt
         </router-link>
      </div>

      <div v-else-if="monument" class="max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
         <!-- Header / Navigation -->
         <div class="bg-blue-600 px-6 py-4 flex justify-between items-center">
            <router-link to="/" class="text-white hover:text-blue-100 flex items-center gap-2">
               <i class="fas fa-arrow-left"></i> Xəritə
            </router-link>
            <router-link
                :to="`/?inventory=${monument.inventory}`"
                class="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors"
            >
                <i class="fas fa-map-marked-alt mr-2"></i> Xəritədə göstər
            </router-link>
         </div>

         <div class="p-6 md:p-8">
            <!-- Reuse MonumentDetails Logic/Layout here or import it -->
            <!-- Since MonumentDetails is built for sidebar, we might validly just use it
                 but it might feel cramped. Let's create a custom responsive layout using the same data. -->
            
            <div class="flex flex-col md:flex-row gap-8">
                <!-- Left: Info -->
                <div class="w-full md:w-1/2 space-y-4">
                    <h1 class="text-3xl font-bold text-gray-900">{{ monument.itemLabel }}</h1>
                    
                    <div class="flex items-center text-gray-500 text-sm gap-2">
                        <span class="bg-gray-100 px-2 py-1 rounded">#{{ monument.inventory }}</span>
                    </div>

                    <div v-if="monument.itemDescription" class="prose text-gray-700">
                        {{ monument.itemDescription }}
                    </div>

                    <div class="border-t pt-4 mt-4 grid grid-cols-1 gap-3">
                        <div v-if="monument.item">
                            <a :href="monument.item" target="_blank" class="text-blue-600 hover:underline flex items-center gap-2">
                                <CdxIcon :icon="cdxIconLogoWikidata" class="w-5 h-5" />
                                {{ monument.item.split('/').pop() }}
                            </a>
                        </div>
                        <div v-if="monument.azLink">
                            <a :href="monument.azLink" target="_blank" class="text-blue-600 hover:underline flex items-center gap-2">
                                <CdxIcon :icon="cdxIconLogoWikipedia" class="w-5 h-5" />
                                Vikipediya məqaləsi
                            </a>
                        </div>
                        <div v-if="monument.commonsCategory">
                            <a :href="getCategoryLink(monument.commonsCategory)" target="_blank" class="text-blue-600 hover:underline flex items-center gap-2">
                                <CdxIcon :icon="cdxIconLogoWikimediaCommons" class="w-5 h-5" />
                                Vikianbar kateqoriyası
                            </a>
                        </div>
                    </div>
                </div>

                <!-- Right: Image -->
                <div class="w-full md:w-1/2 space-y-4">
                    <div v-if="monument.image" class="relative group rounded-lg overflow-hidden shadow-md">
                        <img 
                            :src="getOptimizedImage(monument.image)" 
                            :alt="monument.itemLabel"
                            class="w-full h-auto object-cover"
                        />
                        <div v-if="imageCredit" class="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs">
                            <i class="fa-regular fa-copyright mr-0.5 text-[9px]"></i>
                            {{ imageCredit.author }}
                            <span class="mx-1 opacity-50">|</span>
                            {{ imageCredit.license }}
                        </div>
                    </div>
                    <div v-else class="bg-gray-100 rounded-lg flex items-center justify-center aspect-video text-gray-400">
                        <div class="text-center">
                            <i class="fas fa-image text-4xl mb-2"></i>
                            <p>Şəkil yoxdur</p>
                        </div>
                    </div>

                    <!-- Upload Button -->
                    <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-center">
                        <p class="text-gray-700 mb-3">Bu abidənin şəklini çəkmisiniz?</p>
                        <button
                            class="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition"
                            @click="showUploadInfo"
                        >
                            <i class="fas fa-camera mr-2"></i> Şəkil Yüklə
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
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useHead } from '@unhead/vue';
import type { MonumentProps } from '../types';
import { CdxIcon } from '@wikimedia/codex';
import { cdxIconLogoWikipedia, cdxIconLogoWikimediaCommons, cdxIconLogoWikidata } from '@wikimedia/codex-icons';
import UploadModal from '../components/UploadModal.vue';
import geobuf from 'geobuf';
import Pbf from 'pbf';
import { getOptimizedImage } from '../utils/monumentFormatters';
import { useWikiCredits } from '../composables/useWikiCredits';
import { useMonumentSchema, useBreadcrumbSchema, schemaToJsonLd } from '../composables/useSchemaOrg';

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
        { name: 'Ana Səhifə', url: 'https://wikilovesmonuments.az/' },
        { 
            name: monument.value.itemLabel || 'Abidə', 
            url: `https://wikilovesmonuments.az/monument/${monument.value.inventory}` 
        },
    ]);
});

useHead({
    title: () => monument.value ? `${monument.value.itemLabel} | Viki Abidələri Sevir Azərbaycan` : 'Abidə Detalları',
    meta: [
    {
        name: 'description',
        content: () => monument.value?.itemDescription || 'Abidə haqqında məlumat'
    },
    {
        property: 'og:title',
        content: () => monument.value?.itemLabel
    },
    {
        property: 'og:description',
        content: () => monument.value?.itemDescription
    },
    {
        property: 'og:image',
        content: () => monument.value?.image ? getOptimizedImage(monument.value.image) : '/wlm-az.png'
    }
    ],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: () => monumentSchema.value ? schemaToJsonLd(monumentSchema.value) : '',
        },
        {
            type: 'application/ld+json',
            innerHTML: () => breadcrumbSchema.value ? schemaToJsonLd(breadcrumbSchema.value) : '',
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
