<template>
   <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-gray-800">Abidə sayı</h3>
      <div class="h-[300px]">
         <VChart v-if="option" :option="option" autoresize />
         <div v-else class="flex h-full items-center justify-center text-gray-400">
            Məlumat yüklənir...
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
import "@/utils/echarts";
import VChart from "vue-echarts";
import { computed } from "vue";
import type { StatHistoryItem } from "../../composables/useStats";

const props = defineProps<{
   history: StatHistoryItem[];
}>();

const option = computed(() => {
   if (props.history.length === 0) return null;

   const threeMonthsAgo = new Date();
   threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
   const cutoff = threeMonthsAgo.toISOString().split("T")[0];

   const recent = props.history.filter((h) => h.date >= cutoff);
   if (recent.length === 0) return null;

   return {
      tooltip: {
         trigger: "axis",
      },
      legend: {
         bottom: 0,
         data: ["Ümumi", "Şəkilli"],
      },
      grid: {
         left: "3%",
         right: "4%",
         bottom: "12%",
         containLabel: true,
      },
      xAxis: {
         type: "category",
         boundaryGap: false,
         data: recent.map((h) => h.date),
      },
      yAxis: {
         type: "value",
      },
      series: [
         {
            name: "Ümumi",
            type: "line",
            smooth: true,
            itemStyle: { color: "#3B82F6" },
            lineStyle: { color: "#3B82F6" },
            data: recent.map((h) => h.total),
         },
         {
            name: "Şəkilli",
            type: "line",
            smooth: true,
            itemStyle: { color: "#10B981" },
            lineStyle: { color: "#10B981" },
            data: recent.map((h) => h.withImage),
         },
      ],
   };
});
</script>
