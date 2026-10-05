<template>
   <div class="flex h-full flex-col bg-[#f8f9fa]">
      <div class="border-b border-gray-200 bg-white">
         <div class="container mx-auto px-4 py-4">
            <router-link
               to="/regions"
               class="mb-2 inline-flex items-center gap-1 text-sm font-medium text-[#3366cc] hover:text-[#2a4b8d]"
            >
               <CdxIcon :icon="cdxIconArrowPrevious" /> {{ REGIONS_BACK_LABEL }}
            </router-link>

            <h1 class="text-2xl font-bold text-gray-900">
               <template v-if="region">{{ region.name }}</template>
               <template v-else-if="isLoading">Yüklənir...</template>
               <template v-else>{{ requestedName }}</template>
            </h1>

            <p v-if="region" class="mt-1 text-sm text-gray-600">{{ monuments.length }} abidə</p>
         </div>
      </div>

      <!-- Unknown region: reuse the app's existing 404 page rather than
           inventing a second "not found" look. -->
      <NotFound v-if="isUnknown" />

      <!--
         Height comes from <main> (`overflow-y-auto`), not from this page: the
         gallery and the stats have a data-dependent height, so letting the table
         claim "whatever is left" meant the list collapsed to nothing on
         photo-rich regions. The blocks above are auto-height and cannot shrink;
         the table gets an explicit height and scrolls inside itself.
      -->
      <div v-else-if="region" class="container mx-auto flex flex-col px-4 py-6">
         <div class="flex flex-col border border-gray-200 bg-white">
            <!--
               Gallery, then coverage, then the full list. All three read the same
               `monuments` array, so the "132 abidə" heading, the counts and the
               table can never describe different sets.
            -->
            <RegionPhotoGallery v-if="stats" :photos="stats.photos" :total="stats.total" />

            <RegionPhotoStats v-if="stats" :stats="stats" />

            <div class="border-b border-gray-200 bg-[#f8f9fa] p-4">
               <h2 class="text-sm font-bold tracking-wider text-gray-500 uppercase">
                  {{ REGIONS_MONUMENTS_HEADING }}
               </h2>
            </div>

            <!--
               A definite height, not `flex-1`. 65vh tracks the window so the
               list stays usable on a tall monitor, and the floor stops it
               collapsing to a couple of rows in a short landscape window.
            -->
            <div class="flex h-[65vh] min-h-[420px] flex-col overflow-hidden">
               <MonumentVirtualTable
                  ref="virtualTable"
                  :columns="columns"
                  :data="sortedMonuments"
                  :row-height="75"
                  :sort-state="sortState"
                  @sort="handleSort"
               >
                  <template #item-itemLabel="{ row }">
                     <div class="flex h-full flex-col justify-center">
                        <div class="truncate font-medium text-gray-900">
                           <!-- Located monuments get a prerendered page — link
                                it so crawlers can discover /monument/* URLs. -->
                           <router-link
                              v-if="hasPage(row)"
                              :to="monumentPath(row)"
                              class="hover:text-[#3366cc] hover:underline"
                           >
                              {{ row.itemLabel }}
                           </router-link>
                           <template v-else>{{ row.itemLabel }}</template>
                        </div>
                        <div
                           v-if="row.itemDescription"
                           class="mt-0.5 truncate text-xs text-gray-500"
                        >
                           {{ row.itemDescription }}
                        </div>
                        <div
                           v-if="row.itemAltLabel"
                           class="mt-0.5 truncate text-xs text-gray-400 italic"
                        >
                           {{ row.itemAltLabel }}
                        </div>
                     </div>
                  </template>

                  <!-- Mirrors TablePage.vue's status cell: the one fact about a
                       row that a photo gallery above cannot show. -->
                  <template #item-status="{ row }">
                     <span
                        class="inline-flex px-2 text-xs font-semibold"
                        :class="row.image ? 'text-[#14866d]' : 'text-[#d73333]'"
                     >
                        {{ row.image ? "Şəkilli" : "Şəkilsiz" }}
                     </span>
                  </template>

                  <!-- The three buttons live in one shared component so this
                       table and `/table` cannot drift apart. -->
                  <template #item-actions="{ row }">
                     <MonumentRowActions :row="row" @upload="openUploadModal" />
                  </template>

                  <template #empty>
                     <p class="px-4 text-center text-sm text-gray-500">{{ REGIONS_EMPTY_HINT }}</p>
                  </template>
               </MonumentVirtualTable>
            </div>
         </div>
      </div>

      <!-- Only rendered open; `defineAsyncComponent` keeps it out of this
           page's initial payload. -->
      <UploadModal
         :is-open="isUploadModalOpen"
         :monument="selectedMonumentForUpload"
         @close="isUploadModalOpen = false"
      />
   </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useHead } from "@unhead/vue";
import { CdxIcon } from "@wikimedia/codex";
import { cdxIconArrowPrevious } from "@wikimedia/codex-icons";
import MonumentVirtualTable from "@/components/MonumentVirtualTable.vue";
import MonumentRowActions from "@/components/MonumentRowActions.vue";
import RegionPhotoGallery from "@/components/region/RegionPhotoGallery.vue";
import RegionPhotoStats from "@/components/region/RegionPhotoStats.vue";
import NotFound from "@/pages/NotFound.vue";
import { useMonumentStore } from "@/stores/monuments";
import { useRegionsMap } from "@/composables/useRegionsMap";
import {
   REGIONS_BACK_LABEL,
   REGIONS_EMPTY_HINT,
   REGIONS_MONUMENTS_HEADING,
} from "@/content/regions";
import { SITE_HOST } from "@/utils/constants";
import { encodeIdForUrl, getCanonicalId } from "@/utils/monumentFormatters";
import { activeSortKey, sortDirectionFor, sortMonumentsByKey } from "@/utils/monumentSorting";
import { monumentsInRegion, regionPhotoStats } from "@/utils/regions";
import type { MonumentProps } from "@/types";

const UploadModal = defineAsyncComponent(() => import("@/components/UploadModal.vue"));

const route = useRoute();
const monumentStore = useMonumentStore();
const { load, payload, loadFailed, findRegion } = useRegionsMap();

const requestedName = computed(() => String(route.params.name ?? ""));
const region = computed(() => findRegion(requestedName.value));

/**
 * Two independent loads: the region list and the monuments. An unknown region
 * is decided by the first alone, so it must not wait on the monuments (which
 * would otherwise show a spinner over a 404). A known region waits for both,
 * or its count would flash 0 before the monuments arrive.
 */
const regionsSettled = computed(() => loadFailed.value || payload.value !== null);

const isUnknown = computed(() => regionsSettled.value && region.value === null);

const isLoading = computed(() => !isUnknown.value && !(region.value && monumentStore.isDataReady));

/**
 * The one source for both the count and the table. The heading reads
 * `monuments.length` and the table renders the same array, so they cannot
 * drift apart.
 */
const monuments = computed<MonumentProps[]>(() => {
   if (!region.value) return [];
   return monumentsInRegion(monumentStore.monuments, region.value.name);
});

/**
 * Photo coverage for the same monuments the table shows.
 *
 * Derived from `monumentsInRegion` rather than from a separate count, so the
 * totals agree with both the heading and the table by construction.
 */
const stats = computed(() =>
   region.value ? regionPhotoStats(monumentStore.monuments, region.value.name) : null,
);

/**
 * The same four columns `/table` shows, minus `parentLabel` (constant on a region
 * page — every row is this region) and minus `actions` (which would pull in auth
 * state and the upload modal). Row height matches TablePage's 75px, which is what
 * the three-line label cell needs.
 */
const columns = [
   { id: "inventory", label: "İnventar", allowSort: true, width: "100px" },
   { id: "itemLabel", label: "Ad", allowSort: true },
   { id: "addressLabel", label: "Ünvan", allowSort: false },
   { id: "status", label: "Status" },
   { id: "actions", label: "" },
];

const virtualTable = ref<{ scrollToTop: () => void } | null>(null);

/** Owned here rather than in the actions cell, matching `/table`. */
const isUploadModalOpen = ref(false);
const selectedMonumentForUpload = ref<MonumentProps | null>(null);

const openUploadModal = (monument: MonumentProps): void => {
   selectedMonumentForUpload.value = monument;
   isUploadModalOpen.value = true;
};

const sortState = ref<Record<string, "asc" | "desc">>({ inventory: "asc" });

const sortedMonuments = computed<MonumentProps[]>(() =>
   sortMonumentsByKey(
      monuments.value,
      activeSortKey(sortState.value),
      sortDirectionFor(sortState.value, activeSortKey(sortState.value)),
   ),
);

const handleSort = (colId: string) => {
   sortState.value = { [colId]: sortState.value[colId] === "asc" ? "desc" : "asc" };
   // Reordering under the reader would leave them mid-list with no way to tell.
   virtualTable.value?.scrollToTop();
};

/** Only monuments with a page of their own get linked. */
const hasPage = (row: MonumentProps): boolean =>
   typeof row.lat === "number" && Boolean(row.inventory?.length);

const monumentPath = (row: MonumentProps): string =>
   `/monument/${encodeIdForUrl(getCanonicalId(row.inventory))}`;

onMounted(() => {
   monumentStore.init();
   void load();
});

useHead(() => ({
   title: region.value
      ? `${region.value.name} | Viki Abidələri Sevir Azərbaycan`
      : `${requestedName.value} | Viki Abidələri Sevir Azərbaycan`,
   link: region.value
      ? [
           {
              rel: "canonical",
              href: `${SITE_HOST}/region/${encodeURIComponent(region.value.name)}`,
           },
        ]
      : [],
   meta: [
      {
         name: "description",
         content: region.value
            ? `${region.value.name} regionundakı abidələrin siyahısı.`
            : "Region tapılmadı.",
      },
      ...(region.value ? [] : [{ name: "robots", content: "noindex, nofollow" }]),
   ],
}));
</script>
