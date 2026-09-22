<template>
   <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-gray-800">Şəkilli vs Şəkilsiz</h3>
      <div class="h-[300px]">
         <VChart v-if="option" :option="option" autoresize />
      </div>
   </div>
</template>

<script setup lang="ts">
import "@/utils/echarts";
import VChart from "vue-echarts";
import { computed } from "vue";
import type { StatHistoryItem } from "@/composables/useStats.ts";

const props = defineProps<{
   currentStats: StatHistoryItem;
}>();

const option = computed(() => {
   if (!props.currentStats.total) return null;

   const percentage = ((props.currentStats.withImage / props.currentStats.total) * 100).toFixed(1);

   return {
      tooltip: {
         trigger: "item",
         formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
         bottom: 0,
      },
      graphic: [
         {
            type: "text",
            left: "center",
            top: "40%",
            style: {
               text: `${percentage}%`,
               textAlign: "center",
               fill: "#374151",
               fontSize: 22,
               fontWeight: "bold",
            },
         },
         {
            type: "text",
            left: "center",
            top: "50%",
            style: {
               text: "şəkilli",
               textAlign: "center",
               fill: "#9CA3AF",
               fontSize: 12,
            },
         },
      ],
      series: [
         {
            name: "Şəkilli vs Şəkilsiz",
            type: "pie",
            radius: ["50%", "70%"],
            center: ["50%", "45%"],
            avoidLabelOverlap: false,
            itemStyle: {
               borderRadius: 6,
               borderColor: "#fff",
               borderWidth: 2,
            },
            label: {
               show: false,
            },
            emphasis: {
               label: {
                  show: true,
                  fontSize: 16,
                  fontWeight: "bold",
               },
            },
            labelLine: {
               show: false,
            },
            data: [
               {
                  value: props.currentStats.withImage,
                  name: "Şəkilli",
                  itemStyle: { color: "#10B981" },
               },
               {
                  value: props.currentStats.withoutImage,
                  name: "Şəkilsiz",
                  itemStyle: { color: "#EF4444" },
               },
            ],
         },
      ],
   };
});
</script>
