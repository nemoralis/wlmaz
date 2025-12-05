<template>
   <div class="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h3 class="mb-4 text-lg font-semibold text-gray-800">Şəkilli vs Şəkilsiz</h3>
      <div class="flex h-[300px] justify-center">
         <Doughnut v-if="pieData" :data="pieData" :options="pieOptions" />
      </div>
   </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "vue-chartjs";
import type { StatHistoryItem } from "../../composables/useStats";

ChartJS.register(ArcElement, Tooltip, Legend);

export default defineComponent({
   name: "StatsDoughnutChart",
   components: { Doughnut },
   props: {
      currentStats: {
         type: Object as () => StatHistoryItem,
         required: true,
      },
   },
   setup(props) {
      const pieData = computed(() => {
         if (!props.currentStats.total) return null;
         return {
            labels: ["Şəkilli", "Şəkilsiz"],
            datasets: [
               {
                  backgroundColor: ["#10B981", "#EF4444"],
                  data: [props.currentStats.withImage, props.currentStats.withoutImage],
               },
            ],
         };
      });

      const pieOptions: any = {
         responsive: true,
         maintainAspectRatio: false,
         plugins: {
            legend: { position: "bottom" },
         },
      };

      return { pieData, pieOptions };
   },
});
</script>
