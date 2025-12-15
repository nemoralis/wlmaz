<template>
   <div class="flex h-full flex-col bg-gray-50">
      <div class="border-b border-gray-200 bg-white">
         <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
               <h1 class="text-2xl font-bold text-gray-900">Abidələr Siyahısı</h1>
               <router-link
                  to="/"
                  class="flex items-center gap-2 font-medium text-blue-600 hover:text-blue-800"
               >
                  <i class="fa-solid fa-map"></i> Xəritə
               </router-link>
            </div>
         </div>
      </div>

      <div class="container mx-auto flex flex-1 flex-col overflow-hidden px-4 py-6">
         <div
            class="flex flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
         >
            <!-- Search / Filter -->
            <div class="border-b border-gray-200 bg-gray-50 p-4">
               <div class="relative max-w-md">
                  <label for="monument-search" class="sr-only">Abidə axtar</label>
                  <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                     <i class="fa-solid fa-search text-gray-400" aria-hidden="true"></i>
                  </div>
                  <input
                     id="monument-search"
                     v-model="searchQuery"
                     type="text"
                     class="block w-full rounded-lg border border-gray-300 bg-white p-2.5 pl-10 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
                     placeholder="Axtarış (Ad və ya İnventar nömrəsi)..."
                  />
               </div>
            </div>

            <div class="flex-1 overflow-auto overflow-x-auto">
               <table class="min-w-full divide-y divide-gray-200">
                  <thead class="sticky top-0 z-10 bg-gray-50">
                     <tr>
                        <th
                           scope="col"
                           role="button"
                           tabindex="0"
                           :aria-sort="
                              sortKey === 'inventory'
                                 ? sortOrder === 1
                                    ? 'ascending'
                                    : 'descending'
                                 : 'none'
                           "
                           class="w-1 cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                           @click="sortBy('inventory')"
                           @keydown.enter="sortBy('inventory')"
                           @keydown.space.prevent="sortBy('inventory')"
                        >
                           İnventar
                           <i
                              v-if="sortKey === 'inventory'"
                              :class="
                                 sortOrder === 1 ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'
                              "
                              class="ml-1"
                              aria-hidden="true"
                           ></i>
                        </th>
                        <th
                           scope="col"
                           role="button"
                           tabindex="0"
                           :aria-sort="
                              sortKey === 'itemLabel'
                                 ? sortOrder === 1
                                    ? 'ascending'
                                    : 'descending'
                                 : 'none'
                           "
                           class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase hover:bg-gray-100"
                           @click="sortBy('itemLabel')"
                           @keydown.enter="sortBy('itemLabel')"
                           @keydown.space.prevent="sortBy('itemLabel')"
                        >
                           Ad
                           <i
                              v-if="sortKey === 'itemLabel'"
                              :class="
                                 sortOrder === 1 ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'
                              "
                              class="ml-1"
                              aria-hidden="true"
                           ></i>
                        </th>
                        <th
                           scope="col"
                           class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                           Status
                        </th>
                        <th
                           scope="col"
                           class="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
                        >
                           Əməliyyat
                        </th>
                     </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-200 bg-white">
                     <tr v-if="loading">
                        <td colspan="4" class="px-6 py-4 text-center text-gray-500">Yüklənir...</td>
                     </tr>
                     <tr
                        v-for="monument in sortedMonuments"
                        :key="monument.item"
                        class="transition-colors hover:bg-gray-50"
                     >
                        <td
                           class="w-1 px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900"
                        >
                           {{ monument.inventory || "-" }}
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                           <div class="font-medium text-gray-900">{{ monument.itemLabel }}</div>
                           <div
                              v-if="monument.itemDescription"
                              class="mt-0.5 text-xs text-gray-500"
                           >
                              {{ monument.itemDescription }}
                           </div>
                           <div v-if="monument.itemAltLabel" class="mt-0.5 text-xs text-gray-400">
                              {{ monument.itemAltLabel }}
                           </div>
                        </td>
                        <td class="px-6 py-4 text-sm whitespace-nowrap">
                           <span
                              class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold"
                              :class="
                                 monument.image
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                              "
                           >
                              {{ monument.image ? "Şəkilli" : "Şəkilsiz" }}
                           </span>
                        </td>
                        <td class="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                           <!-- Upload Button -->
                           <button
                              aria-label="Şəkil yüklə"
                              class="mr-3 text-gray-600 hover:text-blue-600"
                              title="Şəkil Yüklə"
                              @click="openUploadModal(monument)"
                           >
                              <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i>
                           </button>

                           <a
                              v-if="monument.article"
                              :href="monument.article"
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Vikipediyada oxu"
                              class="mr-3 text-gray-600 hover:text-gray-900"
                              title="Wikipedia"
                           >
                              <i class="fa-brands fa-wikipedia-w" aria-hidden="true"></i>
                           </a>
                           <router-link
                              :to="'/?inventory=' + monument.inventory"
                              aria-label="Xəritədə göstər"
                              class="mr-3 text-blue-600 hover:text-blue-900"
                              title="Xəritədə göstər"
                           >
                              <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                           </router-link>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
            <div
               class="flex justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 text-sm text-gray-500"
            >
               <span>Cəmi: {{ monuments.length }} abidə</span>
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
import { computed, defineComponent, onMounted, ref } from "vue";
import { useHead } from "@unhead/vue";
import UploadModal from "../components/UploadModal.vue";

interface Monument {
   item: string;
   itemLabel: string;
   itemAltLabel?: string;
   inventory?: string;
   image?: string;
   article?: string;
   [key: string]: any;
}

export default defineComponent({
   name: "TablePage",
   components: { UploadModal },
   setup() {
      useHead({
         title: "Abidələr Siyahısı - Azərbaycan Tarixi Abidələri | Viki Abidələri Sevir",
         link: [
            {
               rel: "canonical",
               href: "https://wikilovesmonuments.az/table",
            },
         ],
         meta: [
            {
               name: "description",
               content: "Azərbaycanın bütün tarixi abidələrinin tam siyahısı. Bakı, Şəki, Qəbələ və digər bölgələrdəki məscid, qala, məqbərə və digər mədəni irs abidələri haqqında məlumat.",
            },
         ],
      });

      const monuments = ref<Monument[]>([]);
      const loading = ref(true);
      const sortKey = ref("inventory");
      const sortOrder = ref(1); // 1 asc, -1 desc
      const isUploadModalOpen = ref(false);
      const selectedMonumentForUpload = ref<Monument | null>(null);

      const openUploadModal = (monument: Monument) => {
         selectedMonumentForUpload.value = monument;
         isUploadModalOpen.value = true;
      };

      onMounted(async () => {
         try {
            // Initial load strategy: fetch geojson.
            // We assume monuments.geojson exists in public.
            const res = await fetch("/monuments.geojson");
            if (res.ok) {
               const data = await res.json();
               monuments.value = data.features.map((f: any) => f.properties);
            }
         } catch (e) {
            console.error("Failed to load table data", e);
         } finally {
            loading.value = false;
         }
      });

      const searchQuery = ref("");

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

         return data.sort((a, b) => {
            let valA = a[sortKey.value] || "";
            let valB = b[sortKey.value] || "";

            // Numeric sort for inventory if possible
            if (sortKey.value === "inventory") {
               // Clean strings for numeric sort attempt
               const numA = parseFloat(valA.toString().replace(/[^0-9.]/g, ""));
               const numB = parseFloat(valB.toString().replace(/[^0-9.]/g, ""));
               if (!isNaN(numA) && !isNaN(numB) && valA !== valB) {
                  return (numA - numB) * sortOrder.value;
               }
            }

            if (valA < valB) return -1 * sortOrder.value;
            if (valA > valB) return 1 * sortOrder.value;
            return 0;
         });
      });

      const sortBy = (key: string) => {
         if (sortKey.value === key) {
            sortOrder.value *= -1;
         } else {
            sortKey.value = key;
            sortOrder.value = 1;
         }
      };

      return {
         monuments,
         sortedMonuments,
         loading,
         sortBy,
         sortKey,
         sortOrder,
         isUploadModalOpen,
         selectedMonumentForUpload,
         openUploadModal,
         searchQuery,
      };
   },
});
</script>
