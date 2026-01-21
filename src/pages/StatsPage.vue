<template>
   <div class="flex h-full flex-col bg-gray-50">
      <div class="bg-white p-4 shadow-sm">
         <div class="container mx-auto flex items-center justify-between">
            <h1 class="text-xl font-bold text-gray-800">
               <font-awesome-icon :icon="['fas', 'chart-line']" class="mr-2 text-blue-600" />Statistika
            </h1>
            <router-link
               to="/"
               class="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
               <font-awesome-icon :icon="['fas', 'arrow-left']" /> Xəritəyə qayıt
            </router-link>
         </div>
      </div>

      <div class="container mx-auto flex-1 overflow-y-auto p-4 sm:p-6">
         <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <!-- Stat Cards -->
            <StatsCard title="Ümumi abidə" :value="currentStats.total" />

            <StatsCard
               title="Şəkilli abidə"
               :value="currentStats.withImage"
               color="green"
               :subtext="`${imagePercentage}% əhatə`"
            />

            <StatsCard title="Şəkilsiz abidə" :value="currentStats.withoutImage" color="red" />

            <StatsCard title="Son yenilənmə" :value="lastUpdateDate" />
         </div>

         <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Growth Chart -->
            <StatsLineChart :history="history" />

            <!-- Pie Chart -->
            <StatsDoughnutChart :current-stats="currentStats" />
         </div>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { onMounted } from "vue";
import { useHead } from "@unhead/vue";
import StatsCard from "../components/stats/StatsCard.vue";
import StatsDoughnutChart from "../components/stats/StatsDoughnutChart.vue";
import StatsLineChart from "../components/stats/StatsLineChart.vue";
import { useStats } from "../composables/useStats";

const { history, currentStats, imagePercentage, lastUpdateDate, fetchData } = useStats();

onMounted(fetchData);

useHead({
   title: "Statistika - Azərbaycan Abidələri | Viki Abidələri Sevir",
   link: [
      {
         rel: "canonical",
         href: "https://wikilovesmonuments.az/stats",
      },
   ],
   meta: [
      {
         name: "description",
         content:
            "Azərbaycanın tarixi abidələri haqqında statistika. 300+ abidə, fotoşəkillər və əhatə dərəcəsi məlumatları.",
      },
   ],
});
</script>
