<template>
   <div class="flex h-full flex-col bg-gray-50">
      <div class="bg-white p-4 shadow-sm">
         <div class="container mx-auto flex items-center justify-between">
            <h1 class="text-xl font-bold text-gray-800">
               <font-awesome-icon
                  :icon="['fas', 'chart-line']"
                  class="mr-2 text-blue-600"
               />Statistika
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
         <div v-if="isLoading" class="flex items-center justify-center py-20">
            <div class="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
         </div>

         <div
            v-else-if="error"
            class="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm"
         >
            <h2 class="mb-2 text-xl font-bold text-gray-900">Statistika yüklənə bilmədi</h2>
            <p class="mb-6 text-sm text-gray-600">{{ error }}</p>
            <button
               type="button"
               class="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
               @click="fetchData"
            >
               Yenidən cəhd et
            </button>
         </div>

         <template v-else>
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
         </template>
      </div>
   </div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, onMounted } from "vue";
import { useHead } from "@unhead/vue";
import StatsCard from "@/components/stats/StatsCard.vue";
import { useStats } from "@/composables/useStats.ts";
import { STATS_PAGE } from "@/content/staticPages.ts";

const StatsDoughnutChart = defineAsyncComponent(
   () => import("../components/stats/StatsDoughnutChart.vue"),
);
const StatsLineChart = defineAsyncComponent(() => import("../components/stats/StatsLineChart.vue"));

const { history, currentStats, isLoading, error, imagePercentage, lastUpdateDate, fetchData } =
   useStats();

onMounted(fetchData);

useHead({
   title: STATS_PAGE.title,
   link: [{ rel: "canonical", href: STATS_PAGE.canonical }],
   meta: [{ name: "description", content: STATS_PAGE.description }],
});
</script>
