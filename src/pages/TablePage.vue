<template>
   <div class="flex h-full flex-col bg-[#f8f9fa]">
      <div class="border-b border-gray-200 bg-white">
         <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
               <h1 class="text-2xl font-bold text-gray-900">Abidələr Siyahısı</h1>
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
               <div class="max-w-md">
                  <CdxSearchInput
                     v-model="searchQuery"
                     placeholder="Axtarış (Ad və ya İnventar nömrəsi)..."
                     aria-label="Abidə axtar"
                  />
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
                           v-if="auth.isAuthenticated"
                           weight="quiet"
                           aria-label="Şəkil yüklə"
                           title="Şəkil yüklə"
                           @click="openUploadModal(row)"
                        >
                           <CdxIcon :icon="cdxIconUpload" />
                        </CdxButton>

                        <CdxButton
                           v-if="row.article"
                           weight="quiet"
                           aria-label="Vikipediyada oxu"
                           title="Wikipedia"
                           @click="openExternalLink(row.article)"
                        >
                           <CdxIcon :icon="cdxIconLogoWikipedia" />
                        </CdxButton>

                        <CdxButton
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
               <span v-if="searchQuery">Filtrlənmiş: {{ sortedMonuments.length }}</span>
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

<script lang="ts">
import { computed, defineAsyncComponent, defineComponent, onMounted, ref, watch } from "vue";
import { useHead } from "@unhead/vue";
import { CdxButton, CdxIcon, CdxSearchInput } from "@wikimedia/codex";
import {
   cdxIconLogoWikipedia,
   cdxIconMap,
   cdxIconMapPin,
   cdxIconUpload,
} from "@wikimedia/codex-icons";
import MonumentVirtualTable from "../components/MonumentVirtualTable.vue";
import { useAuthStore } from "../stores/auth";
import { useMonumentStore } from "../stores/monuments";
import type { MonumentProps as Monument } from "../types";
import { getCanonicalId } from "../utils/monumentFormatters";

const UploadModal = defineAsyncComponent(() => import("../components/UploadModal.vue"));

export default defineComponent({
   name: "TablePage",
   components: {
      UploadModal,
      MonumentVirtualTable,
      CdxButton,
      CdxIcon,
      CdxSearchInput,
   },
   setup() {
      const auth = useAuthStore();
      const monumentStore = useMonumentStore();
      useHead({
         title: "Abidələr Siyahısı - Azərbaycan Tarixi Abidələri | Viki Abidələri Sevir",
         link: [{ rel: "canonical", href: "https://wikilovesmonuments.az/table" }],
         meta: [
            {
               name: "description",
               content:
                  "Azərbaycanın bütün tarixi abidələrinin tam siyahısı. Bakı, Şəki, Qəbələ və digər bölgələrdəki məscid, qala, məqbərə və digər mədəni irs abidələri haqqında məlumat.",
            },
         ],
      });

      const virtualTable = ref<any>(null);
      const loading = computed(() => monumentStore.isLoading);
      const isUploadModalOpen = ref(false);
      const selectedMonumentForUpload = ref<Monument | null>(null);
      const searchQuery = ref("");
      const monuments = computed(() => monumentStore.monuments);

      watch(searchQuery, () => {
         virtualTable.value?.scrollToTop();
      });

      const sortState = ref<Record<string, "asc" | "desc">>({ inventory: "asc" });

      const columns = [
         { id: "inventory", label: "İnventar", allowSort: true, width: "100px" },
         { id: "itemLabel", label: "Ad", allowSort: true },
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

      const sortedMonuments = computed(() => {
         let data = [...monuments.value];

         // Filter
         if (searchQuery.value.trim()) {
            const query = searchQuery.value.toLowerCase().trim();
            data = data.filter((m) => {
               return (
                  (m.itemLabel && m.itemLabel.toLowerCase().includes(query)) ||
                  (m.inventory && m.inventory.toLowerCase().includes(query)) ||
                  (m.itemAltLabel && m.itemAltLabel.toLowerCase().includes(query))
               );
            });
         }

         // Sort
         const sortKey = Object.keys(sortState.value)[0];
         const sortDir = sortState.value[sortKey];

         if (sortKey) {
            const order = sortDir === "asc" ? 1 : -1;
            data.sort((a, b) => {
               let valA = a[sortKey] || "";
               let valB = b[sortKey] || "";

               if (sortKey === "inventory") {
                  const numA = parseFloat(valA.toString().replace(/[^0-9.]/g, ""));
                  const numB = parseFloat(valB.toString().replace(/[^0-9.]/g, ""));
                  if (!isNaN(numA) && !isNaN(numB) && valA !== valB) {
                     return (numA - numB) * order;
                  }
               }

               if (valA < valB) return -order;
               if (valA > valB) return order;
               return 0;
            });
         }

         return data;
      });

      return {
         auth,
         monuments,
         sortedMonuments,
         loading,
         sortState,
         columns,
         isUploadModalOpen,
         selectedMonumentForUpload,
         openUploadModal,
         openExternalLink,
         handleSort,
         searchQuery,
         virtualTable,
         cdxIconMap,
         cdxIconMapPin,
         cdxIconUpload,
         cdxIconLogoWikipedia,
         getCanonicalId,
      };
   },
});
</script>
