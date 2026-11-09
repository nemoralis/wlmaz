import { ref } from "vue";
import type { UserStats } from "@/types/api.ts";
import { ApiError, apiFetch } from "@/utils/apiClient.ts";
import { parseUserStats } from "@/utils/apiGuards.ts";

/**
 * The kind of the last failed fetch, when no stats are on screen. The page
 * branches on it (e.g. a dedicated "no WLM records yet" state for 404s)
 * instead of parsing human-readable messages.
 */
export type UserStatsErrorKind =
   "not_found" | "invalid_response" | "timeout" | "server" | "network";

/** Maps an API failure to the message and machine kind shown on the profile page. */
function errorInfo(error: unknown): { message: string; kind: UserStatsErrorKind } {
   if (error instanceof ApiError) {
      if (error.status === 404) {
         return {
            message: "WLM Azərbaycan müsabiqələrində qeydə alınmış şəkliniz tapılmadı.",
            kind: "not_found",
         };
      }
      if (error.code === "invalid_response") {
         return { message: "Statistika cavabı etibarsızdır", kind: "invalid_response" };
      }
      if (error.status >= 500) {
         return { message: `Server xətası: ${error.status}`, kind: "server" };
      }
      if (error.code === "timeout") {
         return { message: "Server vaxtında cavab vermədi", kind: "timeout" };
      }
      if (error.status > 0) {
         return { message: `Xəta: ${error.status}`, kind: "network" };
      }
      return { message: "Şəbəkə xətası", kind: "network" };
   }

   return {
      message: error instanceof Error ? error.message : "Statistikaları yükləmək mümkün olmadı.",
      kind: "network",
   };
}

/**
 * Loads a single user's WLM statistics from /api/leaderboard/user/:name with
 * SWR caching in localStorage.
 */
export const useUserStats = () => {
   const stats = ref<UserStats | null>(null);
   const isLoading = ref(false);
   /** True while a fetch is in flight, even when cached rows are already shown. */
   const isValidating = ref(false);
   const error = ref<string | null>(null);
   const errorKind = ref<UserStatsErrorKind | null>(null);
   /** When the visible stats last came from the server (network), not the cache. */
   const lastFetchedAt = ref<Date | null>(null);
   /**
    * True when a revalidation failed and the page is showing the previous
    * (cached) numbers — the user should know they may not be current.
    */
   const refreshFailed = ref(false);
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
         localStorage.removeItem(`${key}:fetchedAt`);
      } catch {
         // Storage may be unavailable; the in-memory value is still correct.
      }
   };

   /**
    * The sibling `...:fetchedAt` key records when the cached snapshot was
    * written, so the page can say how fresh the numbers are. Kept separate
    * from the stats payload, which the API parser validates as-is.
    */
   const readFetchedAt = (key: string): Date | null => {
      const raw = readCache(`${key}:fetchedAt`);
      if (!raw) return null;
      const date = new Date(raw);
      return Number.isNaN(date.getTime()) ? null : date;
   };

   const writeFetchedAt = (key: string, date: Date): void => {
      writeCache(`${key}:fetchedAt`, date.toISOString());
   };

   const fetchUserStats = async (username: string) => {
      const id = ++requestId;

      // Never keep the previous user's numbers on screen while the new
      // username's request is in flight.
      if (loadedUsername.value !== username) {
         stats.value = null;
         loadedUsername.value = username;
         lastFetchedAt.value = null;
         refreshFailed.value = false;
      }
      error.value = null;
      errorKind.value = null;

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
            lastFetchedAt.value = readFetchedAt(cacheKey);
         } catch (e) {
            console.error("Failed to parse cached stats", e);
            removeCache(cacheKey);
         }
      }

      // A newer call took over while the cache was being read.
      if (id !== requestId) return;

      // Only show the full loading state if we don't have cached data
      isLoading.value = stats.value === null;
      isValidating.value = true;

      try {
         const data = await apiFetch<UserStats>(
            `/api/leaderboard/user/${encodeURIComponent(username)}`,
            { parse: parseUserStats, label: "user stats" },
         );

         if (id !== requestId) return;

         stats.value = data;
         loadedUsername.value = username;
         lastFetchedAt.value = new Date();
         refreshFailed.value = false;
         writeCache(cacheKey, JSON.stringify(data));
         writeFetchedAt(cacheKey, lastFetchedAt.value);
      } catch (err: unknown) {
         if (id !== requestId) return;

         console.error("Failed to fetch user stats:", err);
         if (stats.value) {
            // Stale-while-revalidate: keep the cached numbers on screen and
            // say so, instead of replacing them with an error.
            refreshFailed.value = true;
         } else {
            const info = errorInfo(err);
            error.value = info.message;
            errorKind.value = info.kind;
         }
      } finally {
         if (id === requestId) {
            isLoading.value = false;
            isValidating.value = false;
         }
      }
   };

   /** Clears the previous user's state, e.g. after sign-out. */
   const resetStats = () => {
      requestId += 1;
      stats.value = null;
      loadedUsername.value = null;
      isLoading.value = false;
      isValidating.value = false;
      error.value = null;
      errorKind.value = null;
      lastFetchedAt.value = null;
      refreshFailed.value = false;
   };

   return {
      stats,
      isLoading,
      isValidating,
      error,
      errorKind,
      lastFetchedAt,
      refreshFailed,
      fetchUserStats,
      resetStats,
   };
};
