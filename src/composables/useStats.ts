import { computed, ref } from "vue";

export interface StatHistoryItem {
   total: number;
   withImage: number;
   withoutImage: number;
   date: string;
}

export const useStats = () => {
   const history = ref<StatHistoryItem[]>([]);
   const currentStats = ref<StatHistoryItem>({
      total: 0,
      withImage: 0,
      withoutImage: 0,
      date: new Date().toISOString().split("T")[0],
   });
   const isLoading = ref(false);
   const error = ref<string | null>(null);

   const fetchData = async () => {
      isLoading.value = true;
      error.value = null;
      try {
         const res = await fetch("/stats-history.json");
         if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
               history.value = data;
               if (history.value.length > 0) {
                  currentStats.value = history.value[history.value.length - 1];
               }
            }
         } else {
            throw new Error("Failed to fetch stats");
         }
      } catch (e: any) {
         console.error("Failed to load stats history", e);
         error.value = e.message || "Failed to load data";
      } finally {
         isLoading.value = false;
      }
   };

   const imagePercentage = computed(() => {
      if (!currentStats.value.total) return 0;
      return ((currentStats.value.withImage / currentStats.value.total) * 100).toFixed(1);
   });

   // Hoist Intl.DateTimeFormat for performance: avoids redundant instantiation in computed properties
   const DATE_FORMATTER = new Intl.DateTimeFormat("az-AZ", {
      year: "numeric",
      month: "long",
      day: "numeric",
   });

   const lastUpdateDate = computed(() => {
      if (!currentStats.value.date) return "-";
      return DATE_FORMATTER.format(new Date(currentStats.value.date));
   });

   return {
      history,
      currentStats,
      isLoading,
      error,
      fetchData,
      imagePercentage,
      lastUpdateDate,
   };
};
