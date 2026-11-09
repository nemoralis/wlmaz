import { computed, ref } from "vue";
import { isFiniteNumber, isRecord } from "@/utils/typeGuards.ts";

/** One point in the monument-coverage history, as published in stats-history.json. */
export interface StatHistoryItem {
   total: number;
   withImage: number;
   withoutImage: number;
   date: string;
}

const emptyCurrentStats = (): StatHistoryItem => ({
   total: 0,
   withImage: 0,
   withoutImage: 0,
   date: "",
});

/** Runtime validation: the JSON file is an external resource like any API. */
const isStatHistoryItem = (value: unknown): value is StatHistoryItem => {
   if (!isRecord(value)) return false;
   return (
      isFiniteNumber(value.total) &&
      isFiniteNumber(value.withImage) &&
      isFiniteNumber(value.withoutImage) &&
      typeof value.date === "string" &&
      !Number.isNaN(Date.parse(value.date))
   );
};

const parseStatsHistory = (body: unknown): StatHistoryItem[] => {
   if (!Array.isArray(body) || !body.every(isStatHistoryItem)) {
      throw new Error("Statistika məlumatları etibarsızdır");
   }
   return body;
};

/**
 * Loads and formats the monument coverage history (stats-history.json).
 * Exposes the latest snapshot plus derived percentage/last-update strings.
 */
export const useStats = () => {
   const history = ref<StatHistoryItem[]>([]);
   const currentStats = ref<StatHistoryItem>(emptyCurrentStats());
   const isLoading = ref(false);
   const error = ref<string | null>(null);

   const fetchData = async () => {
      isLoading.value = true;
      error.value = null;
      try {
         const res = await fetch("/stats-history.json");
         if (!res.ok) {
            throw new Error("Statistika məlumatları yüklənə bilmədi");
         }

         const data = parseStatsHistory(await res.json());
         history.value = data;
         currentStats.value = data.length > 0 ? data[data.length - 1] : emptyCurrentStats();
      } catch (e) {
         const message =
            e instanceof TypeError
               ? "Şəbəkə xətası"
               : e instanceof SyntaxError
                 ? "Statistika məlumatları etibarsızdır"
                 : e instanceof Error
                   ? e.message
                   : "Failed to load data";
         console.error("Failed to load stats history", e);
         error.value = message;
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
      const date = new Date(currentStats.value.date);
      if (Number.isNaN(date.getTime())) return "-";
      return DATE_FORMATTER.format(date);
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
