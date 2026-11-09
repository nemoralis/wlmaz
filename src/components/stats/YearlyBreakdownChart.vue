<template>
   <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div class="mb-6 flex items-center justify-between">
         <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
         <div class="flex gap-2">
            <button
               type="button"
               :aria-pressed="mode === 'count'"
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
               type="button"
               :aria-pressed="mode === 'usage'"
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
         <VChart v-if="option" :option="option" autoresize :aria-label="title" role="img" />
         <div v-else class="flex h-full items-center justify-center text-gray-400">
            Məlumat tapılmadı
         </div>
      </div>
      <!-- Screen-reader table mirroring the chart data. -->
      <table class="sr-only">
         <caption>
            {{
               title
            }}
         </caption>
         <thead>
            <tr>
               <th scope="col">İl</th>
               <th scope="col">Şəkil sayı</th>
               <th scope="col">İstifadə</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="row in screenReaderRows" :key="row.year">
               <th scope="row">{{ row.year }}</th>
               <td>{{ row.count }}</td>
               <td>{{ row.usage }}</td>
            </tr>
         </tbody>
      </table>
   </div>
</template>

<script setup lang="ts">
import "@/utils/echarts";
import VChart from "vue-echarts";
import { computed, ref } from "vue";
import { latestWlmYear, START_YEAR } from "@/utils/leaderboard.ts";
import { formatNumber } from "@/utils/format.ts";

const props = withDefaults(
   defineProps<{
      title?: string;
      yearlyData: Record<number, { count: number; usage: number }>;
   }>(),
   { title: "İllər üzrə statistika" },
);

const mode = ref<"count" | "usage">("count");

/** Every contest year from the first WLM AZ edition to the latest available. */
const allYears = computed<string[]>(() => {
   const years: string[] = [];
   for (let y = START_YEAR; y <= latestWlmYear(); y++) {
      years.push(y.toString());
   }
   return years;
});

const tableRows = computed(() =>
   allYears.value.map((year) => ({
      year,
      count: props.yearlyData[parseInt(year)]?.count ?? 0,
      usage: props.yearlyData[parseInt(year)]?.usage ?? 0,
   })),
);

/** Mirrors the chart for assistive technology (same rows, plain numbers). */
const screenReaderRows = computed(() =>
   tableRows.value.map((row) => ({
      year: row.year,
      count: formatNumber(row.count),
      usage: formatNumber(row.usage),
   })),
);

const option = computed(() => {
   if (allYears.value.length === 0) return null;

   const data = tableRows.value.map((row) => (mode.value === "count" ? row.count : row.usage));
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
         data: allYears.value,
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
