<template>
   <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-gray-800">Abidə Sayı (Dinamika)</h3>
      <div class="h-[300px]">
         <Line v-if="chartData" :data="chartData" :options="chartOptions" />
         <div v-else class="flex h-full items-center justify-center text-gray-400">
            Məlumat yüklənir...
         </div>
      </div>
   </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import {
   Chart as ChartJS,
   CategoryScale,
   LinearScale,
   PointElement,
   LineElement,
   Title,
   Tooltip,
   Legend,
} from "chart.js";
import { Line } from "vue-chartjs";
import type { StatHistoryItem } from "../../composables/useStats";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default defineComponent({
   name: "StatsLineChart",
   components: { Line },
   props: {
      history: {
         type: Array as () => StatHistoryItem[],
         required: true,
      },
   },
   setup(props) {
      const chartData = computed(() => {
         if (props.history.length === 0) return null;

         return {
            labels: props.history.map((h) => h.date),
            datasets: [
               {
                  label: "Ümumi",
                  backgroundColor: "#3B82F6",
                  borderColor: "#3B82F6",
                  data: props.history.map((h) => h.total),
                  tension: 0.3,
               },
               {
                  label: "Şəkilli",
                  backgroundColor: "#10B981",
                  borderColor: "#10B981",
                  data: props.history.map((h) => h.withImage),
                  tension: 0.3,
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

      return { chartData, chartOptions };
   },
});
</script>
