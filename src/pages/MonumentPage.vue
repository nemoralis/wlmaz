<template>
   <div class="min-h-screen bg-gray-50">
      <div v-if="loading" class="flex h-64 items-center justify-center">
         <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>

      <div v-else-if="error" class="flex min-h-[60vh] items-center justify-center px-4">
         <div class="max-w-md rounded-lg bg-white p-8 text-center shadow">
            <h2 class="mb-4 text-2xl font-bold text-red-600">Xəta baş verdi</h2>
            <p class="mb-6 text-gray-600">{{ error }}</p>
            <router-link
               to="/"
               class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
               Xəritəyə qayıt
            </router-link>
         </div>
      </div>

      <div v-else-if="monument">
         <!-- Header / Navigation -->
         <div class="flex items-center justify-between bg-blue-600 px-6 py-3">
            <router-link
               to="/"
               class="flex items-center gap-2 text-sm text-white hover:text-blue-100"
            >
               <font-awesome-icon :icon="['fas', 'arrow-left']" /> Xəritə
            </router-link>
            <router-link
               :to="`/?inventory=${monument.inventory}`"
               class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-gray-100"
            >
               <font-awesome-icon :icon="['fas', 'map-marked-alt']" class="mr-2" /> Xəritədə göstər
            </router-link>
         </div>

         <!-- Main Content -->
         <article class="mx-auto max-w-3xl px-4 py-8 sm:px-6">
            <!-- Breadcrumb -->
            <nav class="mb-6 text-sm text-gray-500">
               <router-link to="/" class="text-blue-600 hover:underline">Ana Səhifə</router-link>
               <template v-if="monument.parentLabel">
                  <span class="mx-1 text-gray-300">›</span>
                  <span class="text-gray-500">{{ monument.parentLabel }}</span>
               </template>
               <span class="mx-1 text-gray-300">›</span>
               <span class="text-gray-700">{{ monument.itemLabel }}</span>
            </nav>

            <!-- Title -->
            <h1 class="mb-2 text-3xl font-bold text-gray-900">{{ monument.itemLabel }}</h1>

            <!-- Alt Label -->
            <p v-if="monument.itemAltLabel" class="mb-4 text-gray-500 italic">
               {{ monument.itemAltLabel }}
            </p>

            <!-- Description -->
            <p v-if="monument.itemDescription" class="mb-6 leading-relaxed text-gray-700">
               {{ monument.itemDescription }}
            </p>

            <!-- Hero Image -->
            <div class="mb-6">
               <div v-if="monument.image" class="relative overflow-hidden rounded-lg shadow-md">
                  <img
                     :src="getOptimizedImage(monument.image, 768)"
                     :srcset="getSrcSet(monument.image, [500, 768, 1024, 1536])"
                     sizes="(max-width: 768px) 100vw, 768px"
                     :alt="monument.itemLabel"
                     width="768"
                     class="h-auto w-full object-cover"
                  />
                  <div
                     v-if="imageCredit"
                     class="absolute right-0 bottom-0 left-0 bg-black/60 p-2 text-xs text-white"
                  >
                     <font-awesome-icon :icon="['far', 'copyright']" class="mr-0.5 text-[9px]" />
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
                     <font-awesome-icon :icon="['fas', 'image']" class="mb-2 text-4xl" />
                     <p>Şəkil yoxdur</p>
                  </div>
               </div>
            </div>

            <!-- Key Facts Grid -->
            <div class="mb-6 grid grid-cols-2 gap-3">
               <div
                  v-if="monument.parentLabel"
                  class="rounded-md border border-gray-200 bg-gray-50 p-3"
               >
                  <div class="mb-1 text-xs text-gray-500">Rayon/Bölgə</div>
                  <div class="font-semibold text-gray-900">{{ monument.parentLabel }}</div>
               </div>
               <div
                  v-if="typeof monument.lat === 'number' && typeof monument.lon === 'number'"
                  class="group relative rounded-md border border-gray-200 bg-gray-50 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50"
               >
                  <div class="mb-1 text-xs text-gray-500">Koordinatlar</div>
                  <div class="flex items-center gap-2">
                     <a
                        :href="getCoordinatesUrl(monument.lat, monument.lon, isMobileViewport())"
                        target="_blank"
                        rel="noopener"
                        class="font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                     >
                        {{ monument.lat.toFixed(4) }}, {{ monument.lon.toFixed(4) }}
                     </a>
                     <button
                        class="rounded p-0.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-blue-600"
                        title="Koordinatları kopyala"
                        @click="copyCoordinates(monument.lat, monument.lon)"
                     >
                        <font-awesome-icon :icon="['far', 'copy']" class="text-xs" />
                     </button>
                  </div>
               </div>
               <div
                  v-if="monument.inventory"
                  class="rounded-md border border-gray-200 bg-gray-50 p-3"
               >
                  <div class="mb-1 text-xs text-gray-500">İnventar nömrəsi</div>
                  <div class="font-semibold text-gray-900">#{{ monument.inventory }}</div>
               </div>
               <div v-if="monument.item" class="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div class="mb-1 text-xs text-gray-500">Wikidata</div>
                  <a
                     :href="monument.item"
                     target="_blank"
                     class="font-semibold text-blue-600 hover:underline"
                  >
                     {{ monument.item.split("/").pop() }}
                  </a>
               </div>
            </div>

            <!-- External Links -->
            <div class="mb-6 flex flex-wrap gap-4">
               <a
                  v-if="monument.item"
                  :href="monument.item"
                  target="_blank"
                  class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
               >
                  <CdxIcon :icon="cdxIconLogoWikidata" class="h-4 w-4" />
                  Wikidata
               </a>
               <a
                  v-if="monument.azLink"
                  :href="monument.azLink"
                  target="_blank"
                  class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
               >
                  <CdxIcon :icon="cdxIconLogoWikipedia" class="h-4 w-4" />
                  Vikipediya
               </a>
               <a
                  v-if="monument.commonsCategory"
                  :href="getCategoryLink(monument.commonsCategory)"
                  target="_blank"
                  class="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
               >
                  <CdxIcon :icon="cdxIconLogoWikimediaCommons" class="h-4 w-4" />
                  Vikianbar
               </a>
            </div>

            <!-- Map -->
            <MonumentMiniMap
               v-if="typeof monument.lat === 'number' && typeof monument.lon === 'number'"
               :lat="monument.lat"
               :lon="monument.lon"
               :inventory="monument.inventory || ''"
            />

            <!-- Upload CTA -->
            <div class="rounded-lg border border-blue-100 bg-blue-50 p-6 text-center">
               <p class="mb-4 text-gray-700">Bu abidənin şəklini çəkmisiniz?</p>

               <template v-if="auth.canUpload">
                  <button
                     :disabled="auth.isBlocked"
                     :class="[
                        'rounded-lg px-6 py-2.5 text-sm font-medium text-white transition',
                        auth.isBlocked
                           ? 'cursor-not-allowed bg-gray-400'
                           : 'bg-green-600 hover:bg-green-700',
                     ]"
                     @click="showUploadInfo"
                  >
                     <font-awesome-icon :icon="['fas', 'camera']" class="mr-2" /> Şəkil Yüklə
                  </button>
                  <p v-if="auth.isBlocked" class="mt-3 text-xs font-medium text-red-600">
                     <font-awesome-icon :icon="['fas', 'ban']" class="mr-1" />
                     Hesabınız bloklandığı üçün şəkil yükləyə bilməzsiniz.
                  </p>
               </template>

               <button
                  v-else
                  class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                  @click="auth.login"
               >
                  <font-awesome-icon :icon="['fas', 'sign-in-alt']" class="mr-2" /> Yükləmək üçün
                  daxil ol
               </button>
            </div>
         </article>
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
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead, type Link } from "@unhead/vue";
import { CdxIcon } from "@wikimedia/codex";
import {
   cdxIconLogoWikidata,
   cdxIconLogoWikimediaCommons,
   cdxIconLogoWikipedia,
} from "@wikimedia/codex-icons";
import MonumentMiniMap from "@/components/monument/MonumentMiniMap.vue";
import UploadModal from "@/components/UploadModal.vue";
import { useWikiCredits } from "@/composables/useWikiCredits.ts";
import { useAuthStore } from "@/stores/auth.ts";
import { useMonumentStore } from "@/stores/monuments.ts";
import type { MonumentProps } from "@/types";
import {
   encodeIdForUrl,
   getCanonicalId,
   getCategoryUrl,
   getOptimizedImage,
   getSrcSet,
   isIdMatch,
} from "@/utils/monumentFormatters.ts";
import { getCoordinatesUrl, isMobileViewport } from "@/utils/geoLinks.ts";

const monumentStore = useMonumentStore();
const auth = useAuthStore();
const router = useRouter();

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
   return getCategoryUrl({ commonsCategory: category });
};

const copyCoordinates = async (lat: number, lon: number) => {
   try {
      await navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
   } catch {
      // Fallback: older browsers
   }
};

// Capture the static (prerendered) head values at setup so that, while the
// monument data is still loading, the runtime head matches the prerendered
// HTML instead of falling back to generic placeholders.
const staticTitle = document.title;
const staticDescription =
   document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "";
const staticOgTitle =
   document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? "";
const staticOgDescription =
   document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
const staticOgImage =
   document.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? "/wlm-az.png";

useHead({
   title: () =>
      monument.value
         ? `${monument.value.itemLabel} | Viki Abidələri Sevir Azərbaycan`
         : staticTitle,
   link: computed<Link[]>(() => {
      const currentId = (monument.value?.inventory || route.params.id) as string;
      const canonicalPathId = encodeIdForUrl(getCanonicalId(currentId));

      const links: Link[] = [
         {
            rel: "canonical",
            href: currentId
               ? `https://wikilovesmonuments.az/monument/${canonicalPathId}`
               : "https://wikilovesmonuments.az/",
         },
      ];

      if (monument.value?.image) {
         links.push({
            rel: "preload",
            as: "image",
            href: getOptimizedImage(monument.value.image, 768),
            imagesrcset: getSrcSet(monument.value.image, [500, 768, 1024, 1536]),
            imagesizes: "(max-width: 768px) 100vw, 50vw",
         });
      }
      return links;
   }),
   meta: [
      {
         name: "description",
         content: () => monument.value?.itemDescription || staticDescription,
      },
      {
         property: "og:title",
         content: () => monument.value?.itemLabel || staticOgTitle,
      },
      {
         property: "og:description",
         content: () => monument.value?.itemDescription || staticOgDescription,
      },
      {
         property: "og:image",
         content: () =>
            monument.value?.image ? getOptimizedImage(monument.value.image, 1280) : staticOgImage,
      },
   ],
});

// On a fresh page load the prerendered HTML embeds this monument's props as a
// JSON data block, so the page can render immediately without downloading and
// parsing the full geojson through the Web Worker. The store/worker path below
// still handles client-side navigation and non-prerendered routes.
const embeddedMonument = (() => {
   const el = document.getElementById("monument-data");
   if (!el) return null;
   try {
      return JSON.parse(el.textContent || "") as MonumentProps | null;
   } catch {
      return null;
   }
})();

const hasEmbeddedData = Boolean(
   embeddedMonument && isIdMatch(embeddedMonument.inventory, String(route.params.id ?? "")),
);

if (hasEmbeddedData && embeddedMonument) {
   monument.value = embeddedMonument;
   error.value = null;
   loading.value = false;
   if (monument.value.image) {
      fetchImageMetadata(monument.value.image);
   }
}

onMounted(() => {
   if (!hasEmbeddedData) {
      monumentStore.init();
   }
});

watch(
   [() => monumentStore.isDataReady, () => route.params.id],
   ([ready, id]) => {
      const currentId = String(id ?? "");

      // The embedded data is only valid for the monument it was prerendered for;
      // once the route changes, fall back to the store/worker path.
      if (hasEmbeddedData && isIdMatch(embeddedMonument?.inventory, currentId)) {
         return;
      }

      if (!ready) {
         monumentStore.init();
         return;
      }

      if (currentId) {
         const found = monumentStore.geoData?.features.find((f) =>
            isIdMatch(f.properties?.inventory, currentId),
         );
         if (found) {
            const canonicalId = getCanonicalId(found.properties?.inventory);

            // Redirect to canonical ID if needed (path string form so %2E is
            // not double-encoded by vue-router params)
            if (currentId !== canonicalId) {
               router.replace(`/monument/${encodeIdForUrl(canonicalId)}`);
            }

            if (found.geometry) {
               const [lon, lat] = found.geometry.coordinates;
               monument.value = { ...found.properties, lat, lon };
            } else {
               monument.value = { ...found.properties };
            }
            error.value = null;
            if (monument.value?.image) {
               fetchImageMetadata(monument.value.image);
            }
         } else {
            error.value = "Abidə tapılmadı";
         }
         loading.value = false;
      }
   },
   { immediate: true },
);
</script>
