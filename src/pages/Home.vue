<template>
   <div class="min-h-full bg-gray-50">
      <!-- Hero -->
      <section
         class="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-amber-50"
      >
         <div class="mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
            <div class="grid items-center gap-10 lg:grid-cols-2">
               <div>
                  <h1
                     class="font-display text-4xl leading-tight font-bold text-gray-900 sm:text-5xl lg:text-6xl"
                  >
                     {{ HOME_HEADLINE }}
                  </h1>
                  <p class="mt-6 text-lg leading-relaxed text-gray-700 sm:text-xl">
                     {{ HOME_INTRO }}
                  </p>

                  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                     <router-link
                        :to="HOME_PRIMARY_CTA.to"
                        class="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                     >
                        <svg
                           class="mr-2 h-5 w-5"
                           fill="none"
                           stroke="currentColor"
                           viewBox="0 0 24 24"
                           aria-hidden="true"
                        >
                           <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                           />
                        </svg>
                        {{ HOME_PRIMARY_CTA.label }}
                     </router-link>
                     <router-link
                        :to="HOME_SECONDARY_CTA.to"
                        class="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-gray-900 ring-1 ring-gray-300 transition ring-inset hover:bg-gray-50"
                     >
                        {{ HOME_SECONDARY_CTA.label }}
                        <svg
                           class="ml-2 h-4 w-4"
                           fill="none"
                           stroke="currentColor"
                           viewBox="0 0 24 24"
                           aria-hidden="true"
                        >
                           <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                           />
                        </svg>
                     </router-link>
                  </div>

                  <div
                     v-if="homeData && homeData.total > 0"
                     class="mt-6 flex items-center gap-6 text-sm text-gray-500"
                  >
                     <div class="flex items-center gap-2">
                        <span
                           class="inline-block h-2 w-2 rounded-full bg-green-500"
                           aria-hidden="true"
                        ></span>
                        {{ formatMonumentCount(homeData.total) }} abidə
                     </div>
                  </div>
               </div>

               <!-- Hero collage: 1 large + 3 small, ordered by data/featured-monuments.json -->
               <div class="relative">
                  <div class="grid h-[420px] grid-cols-6 grid-rows-6 gap-3 sm:h-[500px]">
                     <template v-for="(slot, index) in collage" :key="index">
                        <router-link
                           v-if="slot"
                           :to="slot.url"
                           :class="slotClass(index)"
                           class="group relative block overflow-hidden rounded-xl shadow-lg"
                        >
                           <img
                              :src="collageSrc(slot, index)"
                              :srcset="collageSrcSet(slot, index)"
                              :sizes="collageSizes(index)"
                              :alt="slot.label"
                              :loading="index === 0 ? 'eager' : 'lazy'"
                              :fetchpriority="index === 0 ? 'high' : 'auto'"
                              width="960"
                              height="720"
                              class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                           />
                           <div
                              v-if="index === 0"
                              class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-xs text-white"
                           >
                              {{ slot.label
                              }}<template v-if="slot.parentLabel">
                                 · {{ slot.parentLabel }}</template
                              >
                           </div>
                        </router-link>
                        <div
                           v-else
                           :class="slotClass(index)"
                           class="rounded-xl bg-gradient-to-br from-gray-100 to-gray-200"
                        ></div>
                     </template>
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- WLM 2026 campaign callout — auto-hides once the contest ends -->
      <section v-if="campaignActive" class="bg-white">
         <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div
               class="flex flex-col gap-4 rounded-2xl bg-[#8f0000] px-6 py-5 text-white shadow-sm sm:flex-row sm:items-center"
            >
               <div class="min-w-0 flex-1">
                  <div class="text-lg font-semibold">{{ CAMPAIGN.title }}</div>
                  <div class="mt-0.5 text-sm text-white/90">{{ CAMPAIGN.body }}</div>
               </div>
               <a
                  :href="CAMPAIGN.href"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#8f0000] transition hover:bg-gray-100"
               >
                  {{ CAMPAIGN.cta }}
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M14 5l7 7m0 0l-7 7m7-7H3"
                     />
                  </svg>
               </a>
            </div>
         </div>
      </section>

      <!-- Photo gap: the deficit is the invitation to contribute -->
      <section
         v-if="gap && gap.without > 0"
         class="border-y border-gray-200 bg-gradient-to-br from-blue-50 to-white"
      >
         <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div class="grid items-center gap-8 lg:grid-cols-2">
               <div>
                  <h2 class="text-2xl font-bold text-gray-900">{{ HOME_GAP_HEADING }}</h2>
                  <p class="mt-2 text-lg text-gray-700">
                     {{ formatMonumentCount(gap.without) }} abidənin hələ fotoşəkili yoxdur.
                  </p>
                  <router-link
                     :to="HOME_GAP_CTA.to"
                     class="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                     {{ HOME_GAP_CTA.label }}
                     <svg
                        class="ml-2 h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                     >
                        <path
                           stroke-linecap="round"
                           stroke-linejoin="round"
                           stroke-width="2"
                           d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                     </svg>
                  </router-link>
                  <p class="mt-3 text-xs text-gray-500">{{ HOME_GAP_NOTE }}</p>
               </div>

               <div>
                  <div class="flex items-baseline justify-between text-sm text-gray-600">
                     <span>{{ formatMonumentCount(gap.withImage) }} fotoşəkilləndirilib</span>
                     <span>{{ formatMonumentCount(gap.total) }} ümumi abidə</span>
                  </div>
                  <div
                     class="mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200"
                     role="img"
                     :aria-label="`${formatMonumentCount(gap.withImage)} / ${formatMonumentCount(gap.total)} abidə çəkilib`"
                  >
                     <div
                        class="h-full rounded-full bg-green-500"
                        :style="{ width: `${gap.percent}%` }"
                     ></div>
                  </div>
                  <div class="mt-2 text-xs text-gray-500">
                     {{ gap.percent }}% fotoşəkilləndirilib
                  </div>
               </div>
            </div>
         </div>
      </section>

      <!-- Regions -->
      <section v-if="regions.length" class="bg-white py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
               <h2 class="text-3xl font-bold text-gray-900">{{ HOME_REGIONS_HEADING }}</h2>
               <p class="mt-3 text-gray-600">{{ HOME_REGIONS_INTRO }}</p>
            </div>

            <ul class="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
               <li v-for="region in regions" :key="region.label">
                  <router-link
                     to="/map"
                     class="flex items-baseline justify-between gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                  >
                     <span class="min-w-0 truncate text-sm font-medium text-gray-800">
                        {{ region.label }}
                     </span>
                     <span class="flex-none text-sm font-semibold text-gray-500">
                        {{ formatMonumentCount(region.count) }}
                     </span>
                  </router-link>
               </li>
            </ul>
         </div>
      </section>

      <!-- How to contribute -->
      <section class="bg-white py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
               <h2 class="text-3xl font-bold text-gray-900">{{ HOME_STEPS_HEADING }}</h2>
               <p class="mt-3 text-gray-600">{{ HOME_STEPS_INTRO }}</p>
            </div>

            <ol class="mt-12 grid gap-6 md:grid-cols-3">
               <li
                  v-for="(step, index) in HOME_STEPS"
                  :key="step.title"
                  class="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
               >
                  <div
                     class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white"
                  >
                     <svg
                        class="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                     >
                        <path
                           v-if="index === 0"
                           stroke-linecap="round"
                           stroke-linejoin="round"
                           stroke-width="2"
                           d="M12 21s-7-4.35-9.33-8.24A5.5 5.5 0 0 1 12 6.5a5.5 5.5 0 0 1 9.33 6.26C19 16.65 12 21 12 21z"
                        />
                        <path
                           v-else-if="index === 1"
                           stroke-linecap="round"
                           stroke-linejoin="round"
                           stroke-width="2"
                           d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2L8 5h8l1.5 2h2A1.5 1.5 0 0 1 21 8.5v10A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-10zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                        />
                        <path
                           v-else
                           stroke-linecap="round"
                           stroke-linejoin="round"
                           stroke-width="2"
                           d="M7 17.5A4.5 4.5 0 0 1 7 8.5a5.5 5.5 0 0 1 10.5-1.6A4 4 0 0 1 17.5 17.5H7zM12 12v9m0-9l-3 3m3-3l3 3"
                        />
                     </svg>
                  </div>
                  <h3 class="mt-5 text-lg font-semibold text-gray-900">{{ step.title }}</h3>
                  <p class="mt-2 text-sm leading-relaxed text-gray-600">{{ step.body }}</p>
               </li>
            </ol>
         </div>
      </section>
   </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useHead } from "@unhead/vue";
import {
   CAMPAIGN,
   HOME_CANONICAL,
   HOME_GAP_CTA,
   HOME_GAP_HEADING,
   HOME_GAP_NOTE,
   HOME_REGIONS_HEADING,
   HOME_REGIONS_INTRO,
   HOME_DESCRIPTION,
   HOME_HEADLINE,
   HOME_INTRO,
   HOME_PRIMARY_CTA,
   HOME_SECONDARY_CTA,
   HOME_STEPS,
   HOME_STEPS_HEADING,
   HOME_STEPS_INTRO,
   HOME_TITLE,
   formatMonumentCount,
   isCampaignActive,
} from "@/content/home.ts";
import { schemaToJsonLd, useOrganizationSchema } from "@/composables/useSchemaOrg.ts";
import type { HomeData } from "@/content/featured.ts";
import { fetchHomeData, readEmbeddedHomeData } from "@/utils/homeData.ts";
import { getOptimizedImage, getSrcSet } from "@/utils/monumentFormatters.ts";

/** Collage slots: the large image first, then the three small ones. */
const COLLAGE_SLOTS = 4;

const homeData = ref<HomeData | null>(null);
const campaignActive = ref(isCampaignActive());

const collage = computed<(HomeData["featured"][number] | null)[]>(() => {
   const featured = homeData.value?.featured ?? [];
   return Array.from({ length: COLLAGE_SLOTS }, (_, index) => featured[index] ?? null);
});

const regions = computed<HomeData["regions"]>(() => homeData.value?.regions ?? []);

/**
 * The photo deficit. Rounded to one decimal so node and the browser cannot
 * disagree: both derive it from the same integers via the same arithmetic, and
 * the prerendered markup must match the Vue render exactly.
 */
const gap = computed(() => {
   const data = homeData.value;
   if (!data || data.total <= 0) return null;

   const without = Math.max(0, data.total - data.withImage);
   const percent = Math.round((data.withImage / data.total) * 1000) / 10;

   return { total: data.total, withImage: data.withImage, without, percent };
});

/** Grid placement per slot: 4 columns × full height for the large one. */
const slotClass = (index: number): string =>
   index === 0 ? "col-span-4 row-span-6" : "col-span-2 row-span-2";

const collageSrc = (m: HomeData["featured"][number], index: number): string =>
   getOptimizedImage(m.image, index === 0 ? 960 : 500);

const collageSrcSet = (m: HomeData["featured"][number], index: number): string =>
   getSrcSet(m.image, index === 0 ? [500, 768, 960, 1280] : [330, 500]);

const collageSizes = (index: number): string =>
   index === 0 ? "(max-width: 1024px) 100vw, 40vw" : "(max-width: 1024px) 33vw, 20vw";

/** Hero photo doubles as the social card image. */
const ogImage = computed(() => {
   const first = collage.value[0];
   return first ? getOptimizedImage(first.image, 1280) : `${HOME_CANONICAL}wlm-az.png`;
});

// Build-time payload, inlined by scripts/prerender.ts. Read synchronously in
// setup so the first Vue render already matches the static markup that ships
// inside #app — no flash, no request.
homeData.value = readEmbeddedHomeData();

// Without a prerendered shell (npm run dev) fall back to the snapshot kept in
// public/ and refreshed by `npm run update-data`.
if (!homeData.value) {
   fetchHomeData().then((data) => {
      if (data) homeData.value = data;
   });
}

const organizationSchema = schemaToJsonLd(useOrganizationSchema());

useHead({
   title: HOME_TITLE,
   link: [
      {
         rel: "canonical",
         href: HOME_CANONICAL,
      },
   ],
   meta: computed(() => [
      {
         name: "description",
         content: HOME_DESCRIPTION,
      },
      {
         property: "og:site_name",
         content: HOME_TITLE,
      },
      {
         property: "og:title",
         content: HOME_TITLE,
      },
      {
         property: "og:description",
         content: HOME_DESCRIPTION,
      },
      {
         property: "og:url",
         content: HOME_CANONICAL,
      },
      {
         property: "og:image",
         content: ogImage.value,
      },
      {
         name: "twitter:image",
         content: ogImage.value,
      },
   ]),
   script: [
      {
         type: "application/ld+json",
         innerHTML: organizationSchema,
      },
   ],
});
</script>
