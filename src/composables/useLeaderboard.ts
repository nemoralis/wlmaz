import { computed, ref } from "vue";
import type { LeaderboardUser, WikiLovesCountryData } from "../types";

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
   const eventStats = ref<{
      totalPhotos: number;
      totalUsers: number;
      photosUsed: number;
   } | null>(null);

   const yearlyBreakdown = ref<Record<number, { count: number; usage: number }> | null>(null);

   const fetchLeaderboard = async (year?: number | "total") => {
      const target = year ?? selectedYear.value;
      if (typeof target === "number") selectedYear.value = target;

      const cacheKey = `leaderboard_data_${target}`;

      // SWR: Load from local storage
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
         try {
            const parsed = JSON.parse(cached);
            users.value = parsed.users;
            eventStats.value = parsed.eventStats;
            yearlyBreakdown.value = parsed.yearlyBreakdown;
         } catch (e) {
            console.warn("Failed to parse cached leaderboard", e);
         }
      } else {
         users.value = [];
         eventStats.value = null;
         yearlyBreakdown.value = null;
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

         const data: Record<string, WikiLovesCountryData> = await response.json();
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

         // Cache everything
         localStorage.setItem(
            cacheKey,
            JSON.stringify({
               users: users.value,
               eventStats: eventStats.value,
               yearlyBreakdown: yearlyBreakdown.value,
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
      fetchLeaderboard,
   };
};
