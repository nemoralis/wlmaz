import { computed, ref } from "vue";
import type { LeaderboardUser } from "@/types";
import type { EventStats, LeaderboardResponse, WikiLovesDailyData } from "@/types/api.ts";

const API_BASE = "/api/leaderboard";
const COUNTRY = "Azerbaijan";

// WLM Azerbaijan started in 2013
const START_YEAR = 2013;

/**
 * Parses the API's timestamp format (YYYYMMDDHHmmss) into a Date object
 */
function parseWikiDate(timestamp: number): Date {
   const str = timestamp.toString();
   const year = parseInt(str.substring(0, 4));
   const month = parseInt(str.substring(4, 6)) - 1;
   const day = parseInt(str.substring(6, 8));
   return new Date(year, month, day);
}

/** The snapshot written to localStorage, as read back. */
interface CachedLeaderboard {
   users: LeaderboardUser[];
   eventStats: EventStats | null;
   yearlyBreakdown: Record<number, { count: number; usage: number }> | null;
   dailyStats: Record<string, WikiLovesDailyData> | null;
   eventWindow: { start: number; end: number } | null;
}

/**
 * Rebuilds cached users into the shape the page renders.
 *
 * JSON has no Date type, so `reg` comes back as an ISO string — and
 * `Intl.DateTimeFormat.format()` on a string throws "Invalid time value",
 * taking the whole table down on every visit after the first. Throws on
 * anything unusable so the caller can drop the entry and fetch fresh.
 */
function reviveUsers(users: unknown): LeaderboardUser[] {
   if (!Array.isArray(users)) {
      throw new TypeError("cached users is not an array");
   }

   return users.map((user: Record<string, unknown>) => {
      const reg = user.reg instanceof Date ? user.reg : new Date(user.reg as string | number);
      if (Number.isNaN(reg.getTime())) {
         throw new TypeError(`cached reg is not a date: ${String(user.reg)}`);
      }
      return { ...user, reg } as LeaderboardUser;
   });
}

/**
 * Leaderboard state for the rankings page: per-year or aggregate ("total")
 * views, SWR caching in localStorage, and derived event stats.
 */
export const useLeaderboard = () => {
   const users = ref<LeaderboardUser[]>([]);
   const isLoading = ref(false);
   const isValidating = ref(false);
   const error = ref<string | null>(null);

   // Default to the previous year if we're early in the current year
   // WLM typically happens in September, so Jan 2026 shouldn't default to 2026
   const currentMonth = new Date().getMonth(); // 0-indexed, 8 is September
   const defaultYear = currentMonth < 8 ? new Date().getFullYear() - 1 : new Date().getFullYear();
   const selectedYear = ref<number | "total">(defaultYear);

   // Available years for WLM Azerbaijan
   const availableYears = computed(() => {
      const now = new Date();
      const currentYear = now.getFullYear();
      // Only show current year if we are in or after September (Month index 8)
      const latestAvailableYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;

      const years: number[] = [];
      for (let year = latestAvailableYear; year >= START_YEAR; year--) {
         years.push(year);
      }
      return years;
   });

   // Event stats for the selected year
   const eventStats = ref<EventStats | null>(null);

   const yearlyBreakdown = ref<Record<number, { count: number; usage: number }> | null>(null);

   // Per-day stats of the selected year (toolforge `data`), for the daily chart
   const dailyStats = ref<Record<string, WikiLovesDailyData> | null>(null);

   // Contest window (YYYYMMDDHHmmss) of the selected year, bounds the chart axis
   const eventWindow = ref<{ start: number; end: number } | null>(null);

   const fetchLeaderboard = async (year?: number | "total") => {
      const target = year ?? selectedYear.value;
      if (typeof target === "number") selectedYear.value = target;

      const cacheKey = `leaderboard_data_${target}`;

      // SWR: Load from local storage
      const cached = localStorage.getItem(cacheKey);
      const clearState = () => {
         users.value = [];
         eventStats.value = null;
         yearlyBreakdown.value = null;
         dailyStats.value = null;
         eventWindow.value = null;
      };

      if (cached) {
         try {
            const parsed = JSON.parse(cached) as CachedLeaderboard;
            users.value = reviveUsers(parsed.users);
            eventStats.value = parsed.eventStats;
            yearlyBreakdown.value = parsed.yearlyBreakdown;
            dailyStats.value = parsed.dailyStats ?? null;
            eventWindow.value = parsed.eventWindow ?? null;
         } catch (e) {
            // Unusable entry — hand-edited, or written by an older build. Drop
            // it and fall through to a fresh fetch, so the loading state shows
            // instead of the page rendering rows it cannot format.
            console.warn("Failed to read cached leaderboard", e);
            localStorage.removeItem(cacheKey);
            clearState();
         }
      } else {
         clearState();
      }

      if (users.value.length === 0) {
         isLoading.value = true;
      }

      isValidating.value = true;
      error.value = null;

      try {
         const eventSlug = target === "total" ? "total" : `monuments${target}`;
         const response = await fetch(`${API_BASE}/${eventSlug}`);

         if (!response.ok) {
            if (response.status === 404) {
               throw new Error(
                  target === "total"
                     ? "Məlumat tapılmadı"
                     : `${target}-ci il üçün məlumat tapılmadı`,
               );
            }
            throw new Error(`API xətası: ${response.status}`);
         }

         const data: LeaderboardResponse = await response.json();
         const countryData = data[COUNTRY];

         if (!countryData || !countryData.users) {
            throw new Error(
               target === "total"
                  ? "Azərbaycan məlumatı tapılmadı"
                  : `${target}-ci il üçün Azərbaycan məlumatı tapılmadı`,
            );
         }

         // Transform users object into sorted array
         const userList: LeaderboardUser[] = Object.entries(countryData.users)
            .map(([username, userData]) => ({
               username,
               count: userData.count,
               usage: userData.usage,
               reg: parseWikiDate(userData.reg),
               rank: 0, // Will be set after sorting
            }))
            .sort((a, b) => b.count - a.count) // Sort by photo count descending
            .map((user, index) => ({
               ...user,
               rank: index + 1,
            }));

         users.value = userList;

         // Set event stats
         eventStats.value = {
            totalPhotos: countryData.count,
            totalUsers: countryData.usercount,
            photosUsed: countryData.usage,
         };

         // Set yearly breakdown if available (for "total" view)
         if (countryData.years) {
            yearlyBreakdown.value = countryData.years;
         }

         // Per-day stats + contest window exist only on single-year payloads
         // (the "total" aggregate carries an empty `data`), so the daily chart
         // is per-year by design.
         dailyStats.value =
            countryData.data && Object.keys(countryData.data).length > 0 ? countryData.data : null;
         eventWindow.value =
            countryData.start && countryData.end
               ? { start: countryData.start, end: countryData.end }
               : null;

         // Cache everything
         localStorage.setItem(
            cacheKey,
            JSON.stringify({
               users: users.value,
               eventStats: eventStats.value,
               yearlyBreakdown: yearlyBreakdown.value,
               dailyStats: dailyStats.value,
               eventWindow: eventWindow.value,
            }),
         );
      } catch (e: unknown) {
         console.error("Failed to fetch leaderboard:", e);
         if (users.value.length === 0) {
            error.value = e instanceof Error ? e.message : "Məlumat yüklənərkən xəta baş verdi";
         }
      } finally {
         isLoading.value = false;
         isValidating.value = false;
      }
   };

   return {
      users,
      isLoading,
      isValidating,
      error,
      selectedYear,
      availableYears,
      eventStats,
      yearlyBreakdown,
      dailyStats,
      eventWindow,
      fetchLeaderboard,
   };
};
