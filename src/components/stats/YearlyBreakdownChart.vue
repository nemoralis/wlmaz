<template>
   <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div class="mb-6 flex items-center justify-between">
         <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
         <div class="flex gap-2">
            <button
               :class="[
                  'rounded-full px-3 py-1 text-xs font-bold transition-all',
                  mode === 'count'
                     ? 'bg-blue-600 text-white'
                     : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
               ]"
               @click="mode = 'count'"
            >
               Şəkil sayı
            </button>
            <button
               :class="[
                  'rounded-full px-3 py-1 text-xs font-bold transition-all',
                  mode === 'usage'
                     ? 'bg-green-600 text-white'
                     : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
               ]"
               @click="mode = 'usage'"
            >
               İstifadə
            </button>
         </div>
      </div>
      <div class="h-[300px]">
         <VChart v-if="option" :option="option" autoresize />
         <div v-else class="flex h-full items-center justify-center text-gray-400">
            Məlumat tapılmadı
         </div>
      </div>
   </div>
</template>

<script setup lang="ts">
import "@/utils/echarts";
import VChart from "vue-echarts";
import { computed, ref } from "vue";

const props = withDefaults(
   defineProps<{
      title?: string;
      yearlyData: Record<number, { count: number; usage: number }>;
   }>(),
   { title: "İllər üzrə statistika" },
);

const mode = ref<"count" | "usage">("count");

const option = computed(() => {
   const startYear = 2013;
   const now = new Date();
   const currentYear = now.getFullYear();
   const latestYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;

   const allYears: string[] = [];
   for (let y = startYear; y <= latestYear; y++) {
      allYears.push(y.toString());
   }

   if (allYears.length === 0) return null;

   const data = allYears.map((y) => props.yearlyData[parseInt(y)]?.[mode.value === "count" ? "count" : "usage"] || 0);
   const color = mode.value === "count" ? "#3B82F6" : "#10B981";

   return {
      tooltip: {
         trigger: "axis",
         borderRadius: 8,
         padding: 12,
         textStyle: {
            fontSize: 13,
         },
      },
      grid: {
         left: "3%",
         right: "4%",
         bottom: "3%",
         containLabel: true,
      },
      xAxis: {
         type: "category",
         boundaryGap: false,
         data: allYears,
         axisLabel: {
            fontSize: 11,
            fontWeight: "600",
            color: "#4b5563",
         },
      },
      yAxis: {
         type: "value",
         splitLine: {
            lineStyle: { color: "#f3f4f6" },
         },
         axisLabel: {
            fontSize: 11,
            color: "#9ca3af",
         },
      },
      series: [
         {
            name: mode.value === "count" ? "Yüklənən şəkillər" : "İstifadə edilən şəkillər",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 8,
            itemStyle: { color },
            lineStyle: { color, width: 3 },
            emphasis: {
               itemStyle: { borderWidth: 2, borderColor: color },
            },
            data,
         },
      ],
   };
});
</script>
