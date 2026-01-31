<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-bold text-gray-900">{{ title }}</h3>
      <div class="flex gap-2">
        <button 
          :class="[
            'px-3 py-1 text-xs font-bold rounded-full transition-all',
            mode === 'count' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          ]"
          @click="mode = 'count'"
        >
          Şəkil sayı
        </button>
        <button 
          :class="[
            'px-3 py-1 text-xs font-bold rounded-full transition-all',
            mode === 'usage' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          ]"
          @click="mode = 'usage'"
        >
          İstifadə
        </button>
      </div>
    </div>
    <div class="h-[300px]">
      <LineChart v-if="chartData" :data="chartData" :options="chartOptions" />
      <div v-else class="flex h-full items-center justify-center text-gray-400">
        Məlumat tapılmadı
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { 
  LineElement,
  PointElement,
  CategoryScale, 
  Chart as ChartJS, 
  Legend, 
  LinearScale, 
  Title, 
  Tooltip 
} from "chart.js";
import { Line as LineChart } from "vue-chartjs";
import { computed, defineComponent, ref } from "vue";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default defineComponent({
  name: "YearlyBreakdownChart",
  components: { LineChart },
  props: {
    title: {
      type: String,
      default: "İllər üzrə statistika"
    },
    yearlyData: {
      type: Object as () => Record<number, { count: number; usage: number }>,
      required: true,
    },
  },
  setup(props) {
    const mode = ref<'count' | 'usage'>('count');

    const chartData = computed(() => {
      const startYear = 2013;
      const now = new Date();
      const currentYear = now.getFullYear();
      // Only show current year if we are in or after September
      const latestYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;
      
      const allYears: string[] = [];
      
      for (let y = startYear; y <= latestYear; y++) {
        allYears.push(y.toString());
      }

      if (allYears.length === 0) return null;

      const counts = allYears.map(y => props.yearlyData[parseInt(y)]?.count || 0);
      const usages = allYears.map(y => props.yearlyData[parseInt(y)]?.usage || 0);

      const color = mode.value === 'count' ? "#3B82F6" : "#10B981";

      return {
        labels: allYears,
        datasets: [
          {
            label: mode.value === 'count' ? "Yüklənən şəkillər" : "İstifadə edilən şəkillər",
            backgroundColor: color,
            borderColor: color,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 3,
            tension: 0.3,
            data: mode.value === 'count' ? counts : usages,
            fill: false
          }
        ],
      };
    });

    const chartOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937',
          padding: 12,
          cornerRadius: 8,
          titleFont: { size: 14, weight: 'bold' },
          bodyFont: { size: 13 },
          displayColors: false,
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            display: true,
            color: '#f3f4f6'
          },
          ticks: {
            font: { size: 11 },
            color: '#9ca3af'
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { size: 11, weight: '600' },
            color: '#4b5563'
          }
        }
      }
    };

    return { chartData, chartOptions, mode };
  },
});
</script>
