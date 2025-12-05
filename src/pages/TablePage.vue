<template>
   <div class="flex h-full flex-col bg-gray-50">
      <div class="bg-white border-b border-gray-200">
         <div class="container mx-auto px-4 py-4">
             <div class="flex items-center justify-between">
                <h1 class="text-2xl font-bold text-gray-900">Abidələr Siyahısı</h1>
                <router-link to="/" class="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2">
                   <i class="fa-solid fa-map"></i> Xəritə
                </router-link>
             </div>
         </div>
      </div>

      <div class="container mx-auto px-4 py-6 flex-1 overflow-hidden flex flex-col">
         <div class="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 flex flex-col overflow-hidden">
            <!-- Search / Filter (Optional, can add later) -->
            
            <div class="overflow-auto flex-1 overflow-x-auto">
               <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50 sticky top-0 z-10">
                     <tr>
                        <th 
                           scope="col" 
                           class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-1"
                           @click="sortBy('inventory')"
                        >
                           İnventar 
                           <i v-if="sortKey === 'inventory'" :class="sortOrder === 1 ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'" class="ml-1"></i>
                        </th>
                        <th 
                           scope="col" 
                           class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                           @click="sortBy('itemLabel')"
                        >
                           Ad
                           <i v-if="sortKey === 'itemLabel'" :class="sortOrder === 1 ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'" class="ml-1"></i>
                        </th>
                         <th 
                           scope="col" 
                           class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                           Status
                        </th>
                         <th 
                           scope="col" 
                           class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                           Əməliyyat
                        </th>
                     </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                     <tr v-if="loading">
                        <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                           Yüklənir...
                        </td>
                     </tr>
                     <tr v-for="monument in sortedMonuments" :key="monument.item" class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 w-1">
                           {{ monument.inventory || '-' }}
                        </td>
                        <td class="px-6 py-4 text-sm text-gray-500">
                           <div class="font-medium text-gray-900">{{ monument.itemLabel }}</div>
                           <div v-if="monument.itemAltLabel" class="text-xs text-gray-400 mt-0.5">{{ monument.itemAltLabel }}</div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                           <span 
                              class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                              :class="monument.image ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                           >
                              {{ monument.image ? 'Şəkilli' : 'Şəkilsiz' }}
                           </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                           <!-- Upload Button -->
                           <button 
                              @click="isUploadModalOpen = true"
                              class="text-gray-600 hover:text-blue-600 mr-3" 
                              title="Şəkil Yüklə"
                           >
                              <i class="fa-solid fa-cloud-arrow-up"></i>
                           </button>

                           <a v-if="monument.article" :href="monument.article" target="_blank" class="text-gray-600 hover:text-gray-900 mr-3" title="Wikipedia">
                              <i class="fa-brands fa-wikipedia-w"></i>
                           </a>
                           <router-link :to="'/?inventory=' + monument.inventory" class="text-blue-600 hover:text-blue-900 mr-3" title="Xəritədə göstər">
                              <i class="fa-solid fa-location-dot"></i>
                           </router-link>
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>
             <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 text-sm text-gray-500 flex justify-between">
                 <span>Cəmi: {{ monuments.length }} abidə</span>
             </div>
         </div>
      </div>
      <UploadModal :is-open="isUploadModalOpen" @close="isUploadModalOpen = false" />
   </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed } from "vue";
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
       const monuments = ref<Monument[]>([]);
       const loading = ref(true);
       const sortKey = ref("inventory");
       const sortOrder = ref(1); // 1 asc, -1 desc
       const isUploadModalOpen = ref(false);

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
       
       const sortedMonuments = computed(() => {
           return [...monuments.value].sort((a, b) => {
               let valA = a[sortKey.value] || "";
               let valB = b[sortKey.value] || "";
               
               // Numeric sort for inventory if possible
               if (sortKey.value === 'inventory') {
                   // Clean strings for numeric sort attempt
                   const numA = parseFloat(valA.toString().replace(/[^0-9.]/g, ''));
                   const numB = parseFloat(valB.toString().replace(/[^0-9.]/g, ''));
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
           isUploadModalOpen
       };
   }
});
</script>
