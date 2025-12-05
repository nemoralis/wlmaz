<template>
   <div class="flex h-full flex-col bg-gray-50">
      <div class="bg-white p-4 shadow-sm">
         <div class="container mx-auto flex items-center justify-between">
            <h1 class="text-xl font-bold text-gray-800">
               <i class="fa-solid fa-chart-line mr-2 text-blue-600"></i>Statistika
            </h1>
            <router-link
               to="/"
               class="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
               <i class="fa-solid fa-arrow-left"></i> Xəritəyə qayıt
            </router-link>
         </div>
      </div>

      <div class="container mx-auto flex-1 overflow-y-auto p-4 sm:p-6">
         <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <!-- Stat Cards -->
            <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
               <div class="text-sm font-medium text-gray-500">Ümumi abidə</div>
               <div class="mt-2 text-3xl font-bold text-gray-900">{{ currentStats.total }}</div>
            </div>

            <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
               <div class="text-sm font-medium text-gray-500">Şəkilli abidə</div>
               <div class="mt-2 text-3xl font-bold text-green-600">
                  {{ currentStats.withImage }}
               </div>
               <div class="mt-1 text-xs text-gray-400">{{ imagePercentage }}% əhatə</div>
            </div>

            <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
               <div class="text-sm font-medium text-gray-500">Şəkilsiz abidə</div>
               <div class="mt-2 text-3xl font-bold text-red-500">
                  {{ currentStats.withoutImage }}
               </div>
            </div>

            <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
               <div class="text-sm font-medium text-gray-500">Son yenilənmə</div>
               <div class="mt-2 text-xl font-bold text-gray-800">{{ lastUpdateDate }}</div>
            </div>
         </div>

         <!-- Charts -->
         <div class="mt-6 grid gap-6 lg:grid-cols-2">
            <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
               <h3 class="mb-4 text-lg font-semibold text-gray-800">Abidə Sayı (Dinamika)</h3>
               <div class="h-[300px]">
                  <Line v-if="chartData" :data="chartData" :options="chartOptions" />
                  <div v-else class="flex h-full items-center justify-center text-gray-400">
                     Məlumat yüklənir...
                  </div>
               </div>
            </div>

            <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
               <h3 class="mb-4 text-lg font-semibold text-gray-800">Şəkilli vs Şəkilsiz</h3>
               <div class="flex h-[300px] justify-center">
                  <Doughnut v-if="pieData" :data="pieData" :options="pieOptions" />
               </div>
            </div>
         </div>
      </div>
   </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref, computed } from "vue";
import {
   Chart as ChartJS,
   CategoryScale,
   LinearScale,
   PointElement,
   LineElement,
   Title,
   Tooltip,
   Legend,
   ArcElement,
} from "chart.js";
import { Line, Doughnut } from "vue-chartjs";

ChartJS.register(
   CategoryScale,
   LinearScale,
   PointElement,
   LineElement,
   Title,
   Tooltip,
   Legend,
   ArcElement,
);

export default defineComponent({
   name: "StatsPage",
   components: { Line, Doughnut },
   setup() {
      const history = ref<any[]>([]);
      const currentStats = ref({ total: 0, withImage: 0, withoutImage: 0, date: "" });

      const fetchData = async () => {
         try {
            const res = await fetch("/stats-history.json");
            if (res.ok) {
               const data = await res.json();
               if (Array.isArray(data)) {
                  history.value = data;
                  if (history.value.length > 0) {
                     currentStats.value = history.value[history.value.length - 1];
                  }
               }
            }
         } catch (e) {
            console.error("Failed to load stats history", e);
            // Fallback mock for demo if file missing
            currentStats.value = {
               total: 0,
               withImage: 0,
               withoutImage: 0,
               date: new Date().toISOString().split("T")[0],
            };
         }
      };

      onMounted(fetchData);

      const imagePercentage = computed(() => {
         if (!currentStats.value.total) return 0;
         return ((currentStats.value.withImage / currentStats.value.total) * 100).toFixed(1);
      });

      const lastUpdateDate = computed(() => {
         if (!currentStats.value.date) return "-";
         return new Date(currentStats.value.date).toLocaleDateString("az-AZ", {
            year: "numeric",
            month: "long",
            day: "numeric",
         });
      });

      const chartData = computed(() => {
         if (history.value.length === 0) return null;

         return {
            labels: history.value.map((h) => h.date),
            datasets: [
               {
                  label: "Ümumi",
                  backgroundColor: "#3B82F6",
                  borderColor: "#3B82F6",
                  data: history.value.map((h) => h.total),
                  tension: 0.3,
               },
               {
                  label: "Şəkilli",
                  backgroundColor: "#10B981",
                  borderColor: "#10B981",
                  data: history.value.map((h) => h.withImage),
                  tension: 0.3,
               },
            ],
         };
      });

      const pieData = computed(() => {
         if (!currentStats.value.total) return null;
         return {
            labels: ["Şəkilli", "Şəkilsiz"],
            datasets: [
               {
                  backgroundColor: ["#10B981", "#EF4444"],
                  data: [currentStats.value.withImage, currentStats.value.withoutImage],
               },
            ],
         };
      });

      const chartOptions: any = {
         responsive: true,
         maintainAspectRatio: false,
         interaction: {
            mode: "index",
            intersect: false,
         },
         plugins: {
            legend: { position: "bottom" },
         },
      };

      const pieOptions: any = {
         responsive: true,
         maintainAspectRatio: false,
         plugins: {
            legend: { position: "bottom" },
         },
      };

      return {
         currentStats,
         imagePercentage,
         lastUpdateDate,
         chartData,
         pieData,
         chartOptions,
         pieOptions,
      };
   },
});
</script>
