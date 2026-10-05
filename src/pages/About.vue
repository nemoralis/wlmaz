<template>
   <div class="min-h-full bg-gray-50">
      <!-- Hero -->
      <section
         class="border-b border-gray-200 bg-gradient-to-br from-blue-50 via-white to-amber-50"
      >
         <div class="mx-auto max-w-7xl px-4 pt-10 pb-14 sm:px-6 sm:pt-14 sm:pb-20 lg:px-8">
            <nav aria-label="Yol" class="flex items-center gap-2 text-sm text-gray-500">
               <router-link
                  to="/"
                  class="transition-colors hover:text-[#3366cc]"
                  aria-label="Ana səhifəyə get"
               >
                  Ana səhifə
               </router-link>
               <svg
                  class="h-4 w-4 flex-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
               >
                  <path
                     stroke-linecap="round"
                     stroke-linejoin="round"
                     stroke-width="2"
                     d="M9 5l7 7-7 7"
                  />
               </svg>
               <span aria-current="page" class="font-medium text-gray-700">Haqqında</span>
            </nav>

            <div class="mt-6 grid items-center gap-10 lg:grid-cols-2">
               <div>
                  <h1
                     class="font-display text-4xl leading-tight font-bold text-gray-900 sm:text-5xl"
                  >
                     {{ ABOUT_HEADLINE }}
                  </h1>
                  <p class="mt-5 text-lg leading-relaxed text-gray-700">{{ ABOUT_LEAD }}</p>

                  <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                     <router-link
                        :to="ABOUT_PRIMARY_CTA.to"
                        class="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                     >
                        {{ ABOUT_PRIMARY_CTA.label }}
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
                     <router-link
                        :to="ABOUT_SECONDARY_CTA.to"
                        class="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-base font-semibold text-gray-900 ring-1 ring-gray-300 transition ring-inset hover:bg-gray-50"
                     >
                        {{ ABOUT_SECONDARY_CTA.label }}
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
               </div>

               <!-- Campaign logo: a verbatim copy of the Commons file. Nudged right of
                  centre so it sits closer to the heading than to the edge. -->
               <img
                  :src="ABOUT_LOGO.src"
                  :alt="ABOUT_LOGO.alt"
                  :width="ABOUT_LOGO.width"
                  :height="ABOUT_LOGO.height"
                  class="mx-auto h-auto w-full max-w-[200px] sm:max-w-[240px] lg:translate-x-8"
               />
            </div>

            <!-- Coverage counts, from the build-time #home-data payload -->
            <div v-if="counts" class="mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
               <div
                  v-for="count in counts"
                  :key="count.label"
                  class="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm"
               >
                  <p class="text-2xl font-bold text-gray-900">{{ count.value }}</p>
                  <p class="mt-1 text-sm text-gray-600">{{ count.label }}</p>
               </div>
            </div>
         </div>
      </section>

      <!-- What Wiki Loves Monuments is -->
      <section class="bg-white py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid gap-8 lg:grid-cols-3">
               <h2 class="text-3xl font-bold text-gray-900">{{ ABOUT_WLM_HEADING }}</h2>
               <div class="space-y-4 lg:col-span-2">
                  <p
                     v-for="paragraph in ABOUT_WLM_BODY"
                     :key="paragraph"
                     class="text-base leading-relaxed text-gray-700"
                  >
                     {{ paragraph }}
                  </p>
               </div>
            </div>
         </div>
      </section>

      <!-- What the site does -->
      <section class="bg-gray-50 py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
               <h2 class="text-3xl font-bold text-gray-900">{{ ABOUT_FEATURES_HEADING }}</h2>
               <p class="mt-3 text-gray-600">{{ ABOUT_FEATURES_INTRO }}</p>
            </div>

            <ul class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
               <li v-for="feature in ABOUT_FEATURES" :key="feature.title">
                  <router-link
                     :to="feature.to"
                     class="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
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
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              :d="FEATURE_ICONS[feature.icon]"
                           />
                        </svg>
                     </div>
                     <h3 class="mt-5 text-lg font-semibold text-gray-900">{{ feature.title }}</h3>
                     <p class="mt-2 text-sm leading-relaxed text-gray-600">{{ feature.body }}</p>
                     <span class="mt-4 inline-flex items-center text-sm font-medium text-blue-600">
                        {{ feature.cta }}
                        <svg
                           class="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
                     </span>
                  </router-link>
               </li>
            </ul>
         </div>
      </section>

      <!-- Where the data comes from -->
      <section class="bg-white py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="grid items-start gap-10 lg:grid-cols-2">
               <div>
                  <h2 class="text-3xl font-bold text-gray-900">{{ ABOUT_DATA_HEADING }}</h2>
                  <div class="mt-4 space-y-4">
                     <p
                        v-for="paragraph in ABOUT_DATA_BODY"
                        :key="paragraph"
                        class="text-base leading-relaxed text-gray-700"
                     >
                        {{ paragraph }}
                     </p>
                  </div>
                  <p class="mt-4 text-sm text-gray-500">{{ ABOUT_DATA_NOTE }}</p>
                  <router-link
                     :to="ABOUT_DATA_CTA.to"
                     class="mt-6 inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                     {{ ABOUT_DATA_CTA.label }}
                  </router-link>
               </div>

               <ul
                  class="divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
               >
                  <li v-for="source in DATA_SOURCES" :key="source.name">
                     <a
                        :href="source.href"
                        target="_blank"
                        rel="noopener"
                        class="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-blue-50"
                     >
                        <span class="min-w-0">
                           <span class="block text-sm font-medium text-gray-900">
                              {{ source.name }}
                           </span>
                           <span class="mt-0.5 block text-sm text-gray-600">{{ source.note }}</span>
                        </span>
                        <svg
                           class="h-4 w-4 flex-none text-gray-400 transition group-hover:text-blue-600"
                           fill="none"
                           stroke="currentColor"
                           viewBox="0 0 24 24"
                           aria-hidden="true"
                        >
                           <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M14 3h7v7M21 3l-9 9M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                           />
                        </svg>
                     </a>
                  </li>
               </ul>
            </div>
         </div>
      </section>

      <!-- Licenses -->
      <section class="bg-gray-50 py-16">
         <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
               <h2 class="text-3xl font-bold text-gray-900">{{ ABOUT_LICENSES_HEADING }}</h2>
               <p class="mt-3 text-gray-600">{{ ABOUT_LICENSES_INTRO }}</p>
            </div>

            <ul class="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
               <li
                  v-for="license in ABOUT_LICENSES"
                  :key="license.label"
                  class="flex flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
               >
                  <h3 class="text-lg font-semibold text-gray-900">{{ license.label }}</h3>
                  <p class="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                     {{ license.note }}
                  </p>
                  <a
                     :href="license.href"
                     target="_blank"
                     rel="noopener"
                     class="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
                  >
                     Lisenziya mətnini aç
                     <svg
                        class="ml-1 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                     >
                        <path
                           stroke-linecap="round"
                           stroke-linejoin="round"
                           stroke-width="2"
                           d="M14 3h7v7M21 3l-9 9M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                        />
                     </svg>
                  </a>
               </li>
            </ul>

            <p class="mx-auto mt-10 max-w-3xl text-center text-sm text-gray-600">
               {{ ABOUT_LICENSES_FOOTER }}
            </p>
            <p class="mx-auto mt-3 max-w-3xl text-center text-xs text-gray-500">
               Logo:
               <a
                  :href="ABOUT_LOGO.href"
                  target="_blank"
                  rel="noopener"
                  class="text-blue-600 hover:underline"
                  >{{ ABOUT_LOGO_CREDIT }}</a
               >
            </p>
         </div>
      </section>

      <!-- Credits -->
      <section class="bg-white py-12">
         <div class="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <p class="text-sm text-gray-600">
               <a
                  :href="ABOUT_AUTHOR.href"
                  target="_blank"
                  rel="noopener"
                  class="font-medium text-blue-600 hover:underline"
                  >{{ ABOUT_AUTHOR.name }}</a
               >
               tərəfindən ❤️ ilə hazırlanıb.
            </p>
            <p class="mt-2 flex items-center justify-center gap-2 text-sm text-gray-600">
               <span>{{ ABOUT_REPO.label }}:</span>
               <a
                  :href="ABOUT_REPO.href"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
               >
                  <font-awesome-icon :icon="['fab', 'gitlab']" class="h-4 w-4" aria-hidden="true" />
                  GitLab
               </a>
            </p>
            <p class="mt-6 text-xs text-gray-400">
               &copy; {{ ABOUT_COPYRIGHT_YEAR }} Viki Abidələri Sevir Azərbaycan
            </p>
         </div>
      </section>
   </div>
</template>

<script lang="ts" setup>
import { computed, ref } from "vue";
import { useHead } from "@unhead/vue";
import {
   ABOUT_AUTHOR,
   ABOUT_BREADCRUMB,
   ABOUT_CANONICAL,
   ABOUT_COPYRIGHT_YEAR,
   ABOUT_COUNTS,
   ABOUT_DATA_BODY,
   ABOUT_DATA_CTA,
   ABOUT_DATA_HEADING,
   ABOUT_DATA_NOTE,
   ABOUT_DESCRIPTION,
   ABOUT_FEATURES,
   ABOUT_FEATURES_HEADING,
   ABOUT_FEATURES_INTRO,
   ABOUT_HEADLINE,
   ABOUT_LEAD,
   ABOUT_LICENSES,
   ABOUT_LICENSES_FOOTER,
   ABOUT_LICENSES_HEADING,
   ABOUT_LICENSES_INTRO,
   ABOUT_LOGO,
   ABOUT_LOGO_CREDIT,
   ABOUT_PRIMARY_CTA,
   ABOUT_REPO,
   ABOUT_SECONDARY_CTA,
   ABOUT_SOCIAL_IMAGE,
   ABOUT_TITLE,
   ABOUT_WLM_BODY,
   ABOUT_WLM_HEADING,
} from "@/content/about.ts";
import { schemaToJsonLd, useBreadcrumbSchema } from "@/composables/useSchemaOrg.ts";
import type { HomeData } from "@/content/featured.ts";
import { formatMonumentCount } from "@/content/home.ts";
import { fetchHomeData, readEmbeddedHomeData } from "@/utils/homeData.ts";

/** The five feature icons, keyed by the `icon` field in ABOUT_FEATURES. */
type FeatureIcon = (typeof ABOUT_FEATURES)[number]["icon"];

/** Icon per feature card. Inline SVG, like the landing page's steps. */
const FEATURE_ICONS: Record<FeatureIcon, string> = {
   map: "M12 21s-7-4.35-9.33-8.24A5.5 5.5 0 0 1 12 6.5a5.5 5.5 0 0 1 9.33 6.26C19 16.65 12 21 12 21z",
   table: "M4 6h16M4 12h16M4 18h10",
   chart: "M4 20V10m5 10V4m5 16v-7m5 7V8",
   trophy:
      "M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1.5A2.5 2.5 0 0 0 6.5 10M17 6h3v1.5a2.5 2.5 0 0 1-2.5 2.5",
   upload:
      "M7 17.5A4.5 4.5 0 0 1 7 8.5a5.5 5.5 0 0 1 10.5-1.6A4 4 0 0 1 17.5 17.5H7zM12 12v9m0-9l-3 3m3-3l3 3",
};

/** External projects this page's data claims come from. */
const DATA_SOURCES = [
   {
      name: "Wikidata",
      note: "Abidələrin adları, rayonları, inventar nömrələri və fotoşəkilləri",
      href: "https://www.wikidata.org",
   },
   {
      name: "OpenStreetMap",
      note: "Xəritənin əsas qatı",
      href: "https://www.openstreetmap.org",
   },
   {
      name: "Google Maps",
      note: "Alternativ qat və abidə koordinatlarını açmaq",
      href: "https://maps.google.com",
   },
] as const;

const homeData = ref<HomeData | null>(null);

/**
 * Coverage counts. Same arithmetic as Home.vue's photo-gap panel — the
 * deficit is the number a visitor could still contribute, so it gets its own
 * tile rather than being left for the reader to subtract.
 */
const counts = computed(() => {
   const data = homeData.value;
   if (!data || data.total <= 0) return null;

   return [
      { value: formatMonumentCount(data.total), label: ABOUT_COUNTS.total },
      { value: formatMonumentCount(data.withImage), label: ABOUT_COUNTS.withImage },
      {
         value: formatMonumentCount(Math.max(0, data.total - data.withImage)),
         label: ABOUT_COUNTS.withoutImage,
      },
   ];
});

// Read synchronously in setup so the first render already shows the numbers
// the prerendered document carries — no flash, no request.
homeData.value = readEmbeddedHomeData();

if (!homeData.value) {
   fetchHomeData().then((data) => {
      if (data) homeData.value = data;
   });
}

const breadcrumbSchema = useBreadcrumbSchema(ABOUT_BREADCRUMB.map((item) => ({ ...item })));

// Title, description and social tags mirror what scripts/prerender.ts writes
// into dist/about.html, so nothing swaps after hydration.
useHead({
   title: ABOUT_TITLE,
   link: [
      {
         rel: "canonical",
         href: ABOUT_CANONICAL,
      },
   ],
   meta: [
      {
         name: "description",
         content: ABOUT_DESCRIPTION,
      },
      {
         property: "og:site_name",
         content: "Wiki Loves Monuments Azerbaijan",
      },
      {
         property: "og:title",
         content: ABOUT_TITLE,
      },
      {
         property: "og:description",
         content: ABOUT_DESCRIPTION,
      },
      {
         property: "og:url",
         content: ABOUT_CANONICAL,
      },
      {
         property: "og:image",
         content: ABOUT_SOCIAL_IMAGE,
      },
      {
         name: "twitter:image",
         content: ABOUT_SOCIAL_IMAGE,
      },
   ],
   script: [
      {
         type: "application/ld+json",
         innerHTML: schemaToJsonLd(breadcrumbSchema),
      },
   ],
});
</script>
