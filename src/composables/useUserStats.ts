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
   const loadedUsername = ref<string | null>(null);
   /** Latest request; an older user's response must not replace the current one. */
   let requestId = 0;

   const readCache = (key: string): string | null => {
      try {
         return localStorage.getItem(key);
      } catch {
         return null;
      }
   };

   const writeCache = (key: string, value: string): void => {
      try {
         localStorage.setItem(key, value);
      } catch (e) {
         console.error("Failed to cache user stats", e);
      }
   };

   const removeCache = (key: string): void => {
      try {
         localStorage.removeItem(key);
      } catch {
         // Storage may be unavailable; the in-memory value is still correct.
      }
   };

   const fetchUserStats = async (username: string) => {
      const id = ++requestId;

      // Never keep the previous user's numbers on screen while the new
      // username's request is in flight.
      if (loadedUsername.value !== username) {
         stats.value = null;
         loadedUsername.value = username;
      }
      error.value = null;

      const cacheKey = `user_stats_${username}`;

      // SWR: Load from local storage immediately if available. The cached JSON
      // is untrusted input, so it goes through the same parser as the API.
      const cached = readCache(cacheKey);
      if (cached) {
         try {
            const parsed = parseUserStats(JSON.parse(cached));
            if (parsed.username !== username) {
               throw new Error("Cached stats belong to a different user");
            }
            stats.value = parsed;
         } catch (e) {
            console.error("Failed to parse cached stats", e);
            removeCache(cacheKey);
         }
      }

      // A newer call took over while the cache was being read.
      if (id !== requestId) return;

      // Only show loading if we don't have cached data
      isLoading.value = stats.value === null;

      try {
         const data = await apiFetch<UserStats>(
            `/api/leaderboard/user/${encodeURIComponent(username)}`,
            { parse: parseUserStats, label: "user stats" },
         );

         if (id !== requestId) return;

         stats.value = data;
         loadedUsername.value = username;
         writeCache(cacheKey, JSON.stringify(data));
      } catch (err: unknown) {
         if (id !== requestId) return;

         console.error("Failed to fetch user stats:", err);
         // Don't show error if we have cached data, just log it
         if (!stats.value) {
            error.value = errorMessage(err);
         }
      } finally {
         if (id === requestId) isLoading.value = false;
      }
   };

   /** Clears the previous user's state, e.g. after sign-out. */
   const resetStats = () => {
      requestId += 1;
      stats.value = null;
      loadedUsername.value = null;
      isLoading.value = false;
      error.value = null;
   };

   return {
      stats,
      isLoading,
      error,
      fetchUserStats,
      resetStats,
   };
};
