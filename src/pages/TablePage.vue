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
                  :row-height="75"
                  :sort-state="sortState"
                  @sort="handleSort"
               >
                  <!-- Custom Slot for Ad (Label + Description + AltLabel) -->
                  <template #item-itemLabel="{ row }">
                     <div class="flex h-full flex-col justify-center">
                        <div class="truncate font-medium text-gray-900">{{ row.itemLabel }}</div>
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

                  <!-- Custom Slot for Status -->
                  <template #item-status="{ row }">
                     <span
                        class="inline-flex px-2 text-xs font-semibold"
                        :class="row.image ? 'text-[#14866d]' : 'text-[#d73333]'"
                     >
                        {{ row.image ? "Şəkilli" : "Şəkilsiz" }}
                     </span>
                  </template>

                  <!-- Custom Slot for Actions -->
                  <template #item-actions="{ row }">
                     <div class="flex justify-end gap-1 sm:gap-3">
                        <!-- Upload Button -->
                        <CdxButton
                           v-if="auth.canUpload"
                           weight="quiet"
                           aria-label="Şəkil yüklə"
                           title="Şəkil yüklə"
                           @click="openUploadModal(row)"
                        >
                           <CdxIcon :icon="cdxIconUpload" />
                        </CdxButton>

                        <CdxButton
                           v-if="row.azLink"
                           weight="quiet"
                           aria-label="Vikipediyada oxu"
                           title="Wikipedia"
                           @click="openExternalLink(row.azLink)"
                        >
                           <CdxIcon :icon="cdxIconLogoWikipedia" />
                        </CdxButton>

                        <CdxButton
                           v-if="typeof row.lat === 'number'"
                           weight="quiet"
                           aria-label="Xəritədə göstər"
                           title="Xəritədə göstər"
                           @click="$router.push('/?inventory=' + getCanonicalId(row.inventory))"
                        >
                           <CdxIcon :icon="cdxIconMapPin" />
                        </CdxButton>
                     </div>
                  </template>

                  <template #empty>
                     <div v-if="loading" class="p-4 text-center text-gray-500">Yüklənir...</div>
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
import { CdxButton, CdxIcon, CdxSearchInput, CdxSelect } from "@wikimedia/codex";
import {
   cdxIconLogoWikipedia,
   cdxIconMap,
   cdxIconMapPin,
   cdxIconUpload,
} from "@wikimedia/codex-icons";
import MonumentVirtualTable from "@/components/MonumentVirtualTable.vue";
import { useAuthStore } from "@/stores/auth.ts";
import { useMonumentStore } from "@/stores/monuments.ts";
import type { MonumentProps as Monument } from "@/types";
import { getCanonicalId } from "@/utils/monumentFormatters.ts";

const UploadModal = defineAsyncComponent(() => import("../components/UploadModal.vue"));

const auth = useAuthStore();
const monumentStore = useMonumentStore();

useHead({
   title: "Abidələr siyahısı - Azərbaycan tarixi abidələri | Viki Abidələri Sevir",
   link: [{ rel: "canonical", href: "https://wikilovesmonuments.az/table" }],
   meta: [
      {
         name: "description",
         content: "Azərbaycanın bütün tarixi abidələrinin tam siyahısı.",
      },
   ],
});

const virtualTable = ref<{ scrollToTop: () => void } | null>(null);
const loading = computed(() => monumentStore.isLoading);
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

const isFiltering = computed(() => Boolean(searchQuery.value || selectedRegion.value));

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
   { id: "inventory", label: "İnventar", allowSort: true, width: "100px" },
   { id: "itemLabel", label: "Ad", allowSort: true },
   { id: "parentLabel", label: "Region", allowSort: true, width: "150px" },
   { id: "addressLabel", label: "Ünvan", allowSort: false },
   { id: "status", label: "Status" },
   { id: "actions", label: "" },
];

const openUploadModal = (monument: Monument) => {
   selectedMonumentForUpload.value = monument;
   isUploadModalOpen.value = true;
};

const handleSort = (colId: string) => {
   const current = sortState.value[colId];
   const next = current === "asc" ? "desc" : "asc";
   sortState.value = { [colId]: next };
   virtualTable.value?.scrollToTop();
};

const openExternalLink = (url: string) => {
   window.open(url, "_blank", "noopener,noreferrer");
};

onMounted(() => {
   monumentStore.init();
});

// Pre-define regex for inventory sorting to avoid repeated instantiation
const INVENTORY_NUM_REGEX = /[^0-9.]/g;

/** One row of `processedMonuments` (a MonumentProps augmented with sort metadata). */
type MonumentSortRecord = Monument & {
   _sLabel: string;
   _sInv: string;
   _sAlt: string;
   _invNum: number;
};

type MonumentRecord = MonumentSortRecord & Record<string, unknown>;

/**
 * Performance: Offload expensive operations like string lowercasing and regex replacements
 * into a one-time pre-processing computed property. This ensures that filtering (O(N))
 * and sorting (O(N log N)) loops use pre-calculated metadata, keeping interactions responsive.
 */
const processedMonuments = computed<MonumentSortRecord[]>(() => {
   return monuments.value.map((m) => ({
      ...m,
      _sLabel: (m.itemLabel || "").toLowerCase(),
      _sInv: (m.inventory || "").toLowerCase(),
      _sAlt: (m.itemAltLabel || "").toLowerCase(),
      _invNum: m.inventory ? parseFloat(m.inventory.replace(INVENTORY_NUM_REGEX, "")) : NaN,
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

   // Sort
   const sortKey = Object.keys(sortState.value)[0];
   const sortDir = sortState.value[sortKey];

   if (sortKey) {
      const order = sortDir === "asc" ? 1 : -1;
      data.sort((a, b) => {
         if (sortKey === "inventory") {
            const numA = a._invNum;
            const numB = b._invNum;
            if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
               return (numA - numB) * order;
            }
         }

         const recordA = a as MonumentRecord;
         const recordB = b as MonumentRecord;
         const valA = recordA[sortKey as keyof MonumentRecord] ?? "";
         const valB = recordB[sortKey as keyof MonumentRecord] ?? "";

         if (valA < valB) return -order;
         if (valA > valB) return order;
         return 0;
      });
   }

   return data;
});
</script>
