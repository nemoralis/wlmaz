<template>
   <div class="flex h-full flex-col bg-[#f8f9fa]">
      <div class="border-b border-gray-200 bg-white">
         <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
               <h1 class="text-2xl font-bold text-gray-900">Abidələr siyahısı</h1>
               <router-link
                  to="/"
                  class="flex items-center gap-2 font-medium text-[#3366cc] hover:text-[#2a4b8d]"
               >
                  <CdxIcon :icon="cdxIconMap" /> Xəritə
               </router-link>
            </div>
         </div>
      </div>

      <div class="container mx-auto flex flex-1 flex-col px-4 py-6">
         <div class="flex flex-1 flex-col border border-gray-200 bg-white">
            <!-- Search / Filter -->
            <div class="border-b border-gray-200 bg-[#f8f9fa] p-4">
               <div class="flex flex-wrap items-center gap-4">
                  <div class="max-w-md flex-1 basis-72">
                     <CdxSearchInput
                        v-model="searchQuery"
                        placeholder="Axtarış (Ad və ya inventar nömrəsi)..."
                        aria-label="Abidə axtar"
                     />
                  </div>
                  <div class="shrink-0">
                     <CdxSelect
                        :menu-items="regionOptions"
                        :selected="selectedRegion"
                        default-label="Bütün regionlar"
                        aria-label="Region üzrə filtr"
                        @update:selected="selectedRegion = $event"
                     />
                  </div>
               </div>
            </div>

            <div class="flex flex-1 flex-col overflow-hidden">
               <MonumentVirtualTable
                  ref="virtualTable"
                  :columns="columns"
                  :data="sortedMonuments"
                  :row-height="112"
                  :sort-state="sortState"
                  @sort="handleSort"
               >
                  <!-- Custom Slot for Ad (Label + Description + AltLabel) -->
                  <template #item-itemLabel="{ row }">
                     <div class="flex h-full flex-col justify-center">
                        <div class="truncate font-medium text-gray-900">
                           <!-- Located monuments get a prerendered page — link
                                it so crawlers can discover /monument/* URLs. -->
                           <router-link
                              v-if="typeof row.lat === 'number' && row.inventory?.length"
                              :to="monumentPath(row.inventory)"
                              class="hover:text-[#3366cc] hover:underline"
                           >
                              {{ row.itemLabel }}
                           </router-link>
                           <template v-else>{{ row.itemLabel }}</template>
                        </div>
                        <div
                           v-if="row.itemDescription"
                           class="mt-0.5 break-words text-xs text-gray-500"
                        >
                           {{ row.itemDescription }}
                        </div>
                        <div
                           v-if="row.itemAltLabel"
                           class="mt-0.5 break-words text-xs text-gray-400"
                        >
                           {{ row.itemAltLabel }}
                        </div>
                     </div>
                  </template>

                  <!-- Custom Slot for Status -->
                  <template #item-status="{ row }">
                     <span
                        class="inline-flex px-2 text-xs font-semibold whitespace-nowrap"
                        :class="row.image ? 'text-[#14866d]' : 'text-[#d73333]'"
                     >
                        {{ row.image ? "Şəkilli" : "Şəkilsiz" }}
                     </span>
                  </template>

                  <!-- Custom Slot for Actions -->
                  <template #item-actions="{ row }">
                     <MonumentRowActions :row="row" @upload="openUploadModal" />
                  </template>

                  <template #empty>
                     <div v-if="loading" class="p-4 text-center text-gray-500">Yüklənir...</div>
                     <div v-else-if="loadFailed" class="p-8 text-center text-gray-500">
                        <p class="mb-4">Abidələr məlumatları yüklənə bilmədi.</p>
                        <button
                           type="button"
                           class="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
                           @click="retryLoad"
                        >
                           Yenidən cəhd et
                        </button>
                     </div>
                     <div v-else class="p-8 text-center text-gray-500">Nəticə tapılmadı</div>
                  </template>
               </MonumentVirtualTable>
            </div>
            <div
               class="flex justify-between border-t border-gray-200 bg-[#f8f9fa] px-6 py-3 text-sm text-gray-500"
            >
               <span>Cəmi: {{ monuments.length }} abidə</span>
               <span v-if="isFiltering">Filtrlənmiş: {{ sortedMonuments.length }}</span>
            </div>
         </div>
      </div>
      <UploadModal
         :is-open="isUploadModalOpen"
         :monument="selectedMonumentForUpload"
         @close="isUploadModalOpen = false"
      />
   </div>
</template>

<script lang="ts" setup>
import { computed, defineAsyncComponent, onMounted, onUnmounted, ref, watch } from "vue";
import { useHead } from "@unhead/vue";
import { CdxIcon, CdxSearchInput, CdxSelect } from "@wikimedia/codex";
import { cdxIconMap } from "@wikimedia/codex-icons";
import MonumentVirtualTable from "@/components/MonumentVirtualTable.vue";
import MonumentRowActions from "@/components/MonumentRowActions.vue";
import { TABLE_PAGE } from "@/content/staticPages.ts";
import { useMonumentStore } from "@/stores/monuments.ts";
import type { MonumentProps as Monument } from "@/types";
import { monumentPath } from "@/utils/monumentFormatters.ts";
import { activeSortKey, sortDirectionFor, sortMonumentsByKey } from "@/utils/monumentSorting.ts";

const UploadModal = defineAsyncComponent(() => import("../components/UploadModal.vue"));

const monumentStore = useMonumentStore();

useHead({
   title: TABLE_PAGE.title,
   link: [{ rel: "canonical", href: TABLE_PAGE.canonical }],
   meta: [{ name: "description", content: TABLE_PAGE.description }],
});

const virtualTable = ref<{ scrollToTop: () => void } | null>(null);
// "idle" is the pre-init first render; treating it as loading avoids flashing
// "no results" before the worker has even been asked for data.
const loading = computed(
   () => monumentStore.status === "loading" || monumentStore.status === "idle",
);
const loadFailed = computed(() => monumentStore.status === "error");
const retryLoad = () => monumentStore.init();
const isUploadModalOpen = ref(false);
const selectedMonumentForUpload = ref<Monument | null>(null);

// Search state with debounce to prevent expensive re-sorts on every keystroke
const searchQuery = ref("");
const debouncedSearchQuery = ref("");
const monuments = computed(() => monumentStore.monuments);

// Region filter state ("__none__" matches monuments without a parentLabel)
const REGION_NONE = "__none__";
const selectedRegion = ref<string | null>(null);

const regionOptions = computed(() => {
   const regions = new Set<string>();
   for (const m of monuments.value) {
      if (m.parentLabel) regions.add(m.parentLabel);
   }
   const items = [...regions]
      .sort((a, b) => a.localeCompare(b, "az", { sensitivity: "base" }))
      .map((region) => ({ value: region, label: region }));
   return [{ value: REGION_NONE, label: "Region yoxdur" }, ...items];
});

const isFiltering = computed(() => Boolean(debouncedSearchQuery.value || selectedRegion.value));

// Reset scroll to top when region filter changes (mirrors search behavior)
watch(selectedRegion, () => {
   virtualTable.value?.scrollToTop();
});

let searchTimeout: ReturnType<typeof setTimeout>;
watch(searchQuery, (newVal) => {
   clearTimeout(searchTimeout);
   searchTimeout = setTimeout(() => {
      debouncedSearchQuery.value = newVal;
      virtualTable.value?.scrollToTop();
   }, 300);
});

onUnmounted(() => {
   clearTimeout(searchTimeout);
});

const sortState = ref<Record<string, "asc" | "desc">>({ inventory: "asc" });

const columns = [
   { id: "inventory", label: "İnventar", allowSort: true, width: "80px" },
   { id: "itemLabel", label: "Ad", allowSort: true, width: "220px" },
   { id: "parentLabel", label: "Region", allowSort: true, width: "140px", hideBelow: "md" as const },
   { id: "addressLabel", label: "Ünvan", allowSort: false, width: "160px", hideBelow: "md" as const },
   { id: "status", label: "Status", width: "80px" },
   { id: "actions", label: "", width: "100px" },
];

const openUploadModal = (monument: Monument): void => {
   selectedMonumentForUpload.value = monument;
   isUploadModalOpen.value = true;
};

const handleSort = (colId: string) => {
   const current = sortState.value[colId];
   const next = current === "asc" ? "desc" : "asc";
   sortState.value = { [colId]: next };
   virtualTable.value?.scrollToTop();
};

onMounted(() => {
   monumentStore.init();
});

/**
 * One row of `processedMonuments` (a MonumentProps augmented with search
 * metadata). The sort metadata that used to live here — `_invNum` — moved into
 * `sortMonumentsByKey`, where the region table's sort reads it too, so the two
 * pages cannot compute the numeric inventory order differently.
 */
type MonumentSortRecord = Monument & {
   _sLabel: string;
   _sInv: string;
   _sAlt: string;
};

/**
 * Performance: Offload expensive operations like string lowercasing and regex replacements
 * into a one-time pre-processing computed property. This ensures that filtering (O(N))
 * loop uses pre-calculated metadata, keeping interactions responsive.
 */
const processedMonuments = computed<MonumentSortRecord[]>(() => {
   return monuments.value.map((m) => ({
      ...m,
      _sLabel: (m.itemLabel || "").toLowerCase(),
      // Joined so searching for a secondary register id still finds the monument
      _sInv: (m.inventory || []).join(", ").toLowerCase(),
      _sAlt: (m.itemAltLabel || "").toLowerCase(),
   }));
});

const sortedMonuments = computed(() => {
   let data = [...processedMonuments.value];

   // Filter using debounced query for better performance
   const query = debouncedSearchQuery.value.toLowerCase().trim();
   if (query) {
      data = data.filter((m) => {
         return m._sLabel.includes(query) || m._sInv.includes(query) || m._sAlt.includes(query);
      });
   }

   // Filter by region, when selected
   const region = selectedRegion.value;
   if (region) {
      data =
         region === REGION_NONE
            ? data.filter((m) => !m.parentLabel)
            : data.filter((m) => m.parentLabel === region);
   }

   // Sort. Shared with RegionPage so the two tables cannot order the same
   // monument differently; see utils/monumentSorting.ts.
   const sortKey = activeSortKey(sortState.value);
   return sortMonumentsByKey(data, sortKey, sortDirectionFor(sortState.value, sortKey));
});
</script>
