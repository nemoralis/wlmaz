import { ref } from "vue";
import type { UserStats } from "@/types/api.ts";
import { ApiError, apiFetch } from "@/utils/apiClient.ts";
import { parseUserStats } from "@/utils/apiGuards.ts";

/** Maps an API failure to the message shown on the profile page. */
function errorMessage(error: unknown): string {
   if (error instanceof ApiError) {
      if (error.status === 404) {
         return "Sizin bu il və ya əvvəlki illərdə WLM Azərbaycan üçün qeydə alınmış şəkliniz tapılmadı.";
      }
      if (error.code === "invalid_response") return "Statistika cavabı etibarsızdır";
      if (error.status > 0) return `Xəta: ${error.status}`;
      if (error.code === "timeout") return "Server vaxtında cavab vermədi";
      return "Şəbəkə xətası";
   }

   return error instanceof Error ? error.message : "Statistikaları yükləmək mümkün olmadı.";
}

/**
 * Loads a single user's WLM statistics from /api/leaderboard/user/:name with
 * SWR caching in localStorage.
 */
export const useUserStats = () => {
   const stats = ref<UserStats | null>(null);
   const isLoading = ref(false);
   const error = ref<string | null>(null);

   const fetchUserStats = async (username: string) => {
      const cacheKey = `user_stats_${username}`;

      // SWR: Load from local storage immediately if available
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
         try {
            stats.value = JSON.parse(cached);
         } catch (e) {
            console.error("Failed to parse cached stats", e);
         }
      }

      // Only show loading if we don't have cached data
      if (!stats.value) {
         isLoading.value = true;
      }

      error.value = null;
      try {
         const data = await apiFetch<UserStats>(
            `/api/leaderboard/user/${encodeURIComponent(username)}`,
            { parse: parseUserStats, label: "user stats" },
         );
         stats.value = data;

         // Save to local storage for next time
         localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch (err: unknown) {
         console.error("Failed to fetch user stats:", err);
         // Don't show error if we have cached data, just log it
         if (!stats.value) {
            error.value = errorMessage(err);
         }
      } finally {
         isLoading.value = false;
      }
   };

   return {
      stats,
      isLoading,
      error,
      fetchUserStats,
   };
};
