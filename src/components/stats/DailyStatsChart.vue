<template>
   <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div class="mb-6 flex items-center justify-between">
         <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
         <div class="flex gap-2">
            <button
               :class="[
                  'rounded-full px-3 py-1 text-xs font-bold transition-all',
                  mode === 'images'
                     ? 'bg-blue-600 text-white'
                     : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
               ]"
               @click="mode = 'images'"
            >
               Şəkil sayı
            </button>
            <button
               :class="[
                  'rounded-full px-3 py-1 text-xs font-bold transition-all',
                  mode === 'joiners'
                     ? 'bg-green-600 text-white'
                     : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
               ]"
               @click="mode = 'joiners'"
            >
               İştirakçı
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
import type { WikiLovesDailyData } from "@/types/api.ts";
import { buildDailySeries } from "@/utils/dailyStats.ts";

const props = withDefaults(
   defineProps<{
      title?: string;
      dailyData: Record<string, WikiLovesDailyData>;
      /** Contest window bounds (YYYYMMDDHHmmss) — optional axis limits. */
      start?: number;
      end?: number;
   }>(),
   { title: "Gündəlik nəticələr", start: undefined, end: undefined },
);

const mode = ref<"images" | "joiners">("images");

// Hoist formatters for performance: avoids per-tick Intl instantiation
const DATE_FORMATTER = new Intl.DateTimeFormat("az-AZ", { day: "numeric", month: "short" });
const NUMBER_FORMATTER = new Intl.NumberFormat("az-AZ");

const option = computed(() => {
   const points = buildDailySeries(props.dailyData, props.start, props.end);
   if (points.length === 0) return null;

   const isImages = mode.value === "images";
   const color = isImages ? "#3B82F6" : "#10B981";

   return {
      tooltip: {
         trigger: "axis",
         borderRadius: 8,
         padding: 12,
         textStyle: {
            fontSize: 13,
         },
         valueFormatter: (value: number) => NUMBER_FORMATTER.format(value),
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
         data: points.map((p) => p.date),
         axisLabel: {
            fontSize: 11,
            fontWeight: "600",
            color: "#4b5563",
            hideOverlap: true,
            formatter: (date: string) => DATE_FORMATTER.format(new Date(`${date}T00:00:00Z`)),
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
            name: isImages ? "Yüklənən şəkillər" : "Yeni iştirakçılar",
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 8,
            itemStyle: { color },
            lineStyle: { color, width: 3 },
            emphasis: {
               itemStyle: { borderWidth: 2, borderColor: color },
            },
            data: points.map((p) => (isImages ? p.images : p.joiners)),
         },
      ],
   };
});
</script>
