import { computed, ref } from "vue";
import type { LeaderboardUser } from "@/types";
import type { EventStats, LeaderboardResponse, WikiLovesDailyData } from "@/types/api.ts";
import { ApiError, apiFetch } from "@/utils/apiClient.ts";
import { parseLeaderboardResponse } from "@/utils/leaderboard.ts";
import { isFiniteNumber, isRecord } from "@/utils/typeGuards.ts";

const API_BASE = "/api/leaderboard";
const COUNTRY = "Azerbaijan";

// WLM Azerbaijan started in 2013
const START_YEAR = 2013;

/**
 * Parses the API's timestamp format (YYYYMMDDHHmmss) into a Date object.
 *
 * Returns null for malformed values instead of an Invalid Date: the table
 * formatter cannot call Intl.DateTimeFormat on an invalid Date without
 * throwing and taking the whole page down.
 */
function parseWikiDate(timestamp: number): Date | null {
   if (!Number.isFinite(timestamp)) return null;

   const str = String(Math.trunc(timestamp));
   if (!/^\d{14}$/.test(str)) return null;

   const year = Number(str.slice(0, 4));
   const monthIndex = Number(str.slice(4, 6)) - 1;
   const day = Number(str.slice(6, 8));
   const hour = Number(str.slice(8, 10));
   const minute = Number(str.slice(10, 12));
   const second = Number(str.slice(12, 14));

   if (hour > 23 || minute > 59 || second > 59) return null;

   const date = new Date(year, monthIndex, day);
   if (date.getFullYear() !== year || date.getMonth() !== monthIndex || date.getDate() !== day) {
      return null;
   }

   return date;
}

/** Maps an API failure to the message shown above the table. */
function errorMessage(error: unknown, target: number | "total"): string {
   if (error instanceof ApiError) {
      if (error.status === 404) {
         return target === "total" ? "Məlumat tapılmadı" : `${target}-ci il üçün məlumat tapılmadı`;
      }
      if (error.code === "invalid_response") return "API cavabı etibarsızdır";
      if (error.status > 0) return `API xətası: ${error.status}`;
      if (error.code === "timeout") return "Server vaxtında cavab vermədi";
      return "Şəbəkə xətası";
   }

   return error instanceof Error ? error.message : "Məlumat yüklənərkən xəta baş verdi";
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
 * localStorage can be blocked or unavailable (privacy settings, quota, stale
 * permissions). Reads and writes are best-effort so a storage failure behaves
 * like a cache miss instead of an uncaught rejection from the page hook.
 */
function readCache(key: string): string | null {
   try {
      return localStorage.getItem(key);
   } catch (e) {
      console.warn("Failed to read cached leaderboard", e);
      return null;
   }
}

function writeCache(key: string, value: string): void {
   try {
      localStorage.setItem(key, value);
   } catch (e) {
      console.warn("Failed to write cached leaderboard", e);
   }
}

function removeCache(key: string): void {
   try {
      localStorage.removeItem(key);
   } catch (e) {
      console.warn("Failed to remove cached leaderboard", e);
   }
}

function parseEventStats(value: unknown): EventStats | null {
   if (value === undefined || value === null) return null;
   if (
      !isRecord(value) ||
      !isFiniteNumber(value.totalPhotos) ||
      !isFiniteNumber(value.totalUsers) ||
      !isFiniteNumber(value.photosUsed)
   ) {
      throw new TypeError("cached eventStats is invalid");
   }
   return {
      totalPhotos: value.totalPhotos,
      totalUsers: value.totalUsers,
      photosUsed: value.photosUsed,
   };
}

function parseYearlyBreakdown(
   value: unknown,
): Record<number, { count: number; usage: number }> | null {
   if (value === undefined || value === null) return null;
   if (!isRecord(value)) throw new TypeError("cached yearlyBreakdown is invalid");

   const yearly: Record<number, { count: number; usage: number }> = {};
   for (const [year, entry] of Object.entries(value)) {
      if (
         !/^\d{4}$/.test(year) ||
         !isRecord(entry) ||
         !isFiniteNumber(entry.count) ||
         !isFiniteNumber(entry.usage)
      ) {
         throw new TypeError("cached yearlyBreakdown is invalid");
      }
      yearly[Number(year)] = { count: entry.count, usage: entry.usage };
   }
   return yearly;
}

function parseDailyStats(value: unknown): Record<string, WikiLovesDailyData> | null {
   if (value === undefined || value === null) return null;
   if (!isRecord(value)) throw new TypeError("cached dailyStats is invalid");

   const daily: Record<string, WikiLovesDailyData> = {};
   for (const [date, entry] of Object.entries(value)) {
      if (
         !isRecord(entry) ||
         !isFiniteNumber(entry.images) ||
         !isFiniteNumber(entry.joiners) ||
         !isFiniteNumber(entry.newbie_joiners)
      ) {
         throw new TypeError("cached dailyStats is invalid");
      }
      daily[date] = {
         images: entry.images,
         joiners: entry.joiners,
         newbie_joiners: entry.newbie_joiners,
      };
   }
   return daily;
}

function parseEventWindow(value: unknown): { start: number; end: number } | null {
   if (value === undefined || value === null) return null;
   if (!isRecord(value) || !isFiniteNumber(value.start) || !isFiniteNumber(value.end)) {
      throw new TypeError("cached eventWindow is invalid");
   }
   return { start: value.start, end: value.end };
}

/**
 * Rebuilds cached users into the shape the page renders.
 *
 * JSON has no Date type, so `reg` comes back as an ISO string — and
 * `Intl.DateTimeFormat.format()` on a string throws "Invalid time value",
 * taking the whole table down on every visit after the first. A null `reg`
 * means the upstream timestamp was malformed; the page renders an em dash.
 * Throws on anything unusable so the caller can drop the entry and fetch
 * fresh.
 */
function reviveUsers(users: unknown): LeaderboardUser[] {
   if (!Array.isArray(users)) {
      throw new TypeError("cached users is not an array");
   }

   return users.map((user: unknown) => {
      if (!isRecord(user)) {
         throw new TypeError("cached user is not an object");
      }

      const { username, count, usage, rank, reg } = user;
      if (
         typeof username !== "string" ||
         !isFiniteNumber(count) ||
         !isFiniteNumber(usage) ||
         !isFiniteNumber(rank)
      ) {
         throw new TypeError("cached user is missing valid fields");
      }

      if (reg === null) {
         return { username, count, usage, rank, reg: null };
      }

      if (reg instanceof Date) {
         if (Number.isNaN(reg.getTime())) {
            throw new TypeError("cached reg is not a valid date");
         }
         return { username, count, usage, rank, reg };
      }

      if (typeof reg === "string" || typeof reg === "number") {
         const date = new Date(reg);
         if (Number.isNaN(date.getTime())) {
            throw new TypeError(`cached reg is not a date: ${String(reg)}`);
         }
         return { username, count, usage, rank, reg: date };
      }

      throw new TypeError(`cached reg is not a date: ${String(reg)}`);
   });
}

function parseCachedLeaderboard(value: unknown): CachedLeaderboard {
   if (!isRecord(value)) {
      throw new TypeError("cached leaderboard is not an object");
   }

   return {
      users: reviveUsers(value.users),
      eventStats: parseEventStats(value.eventStats),
      yearlyBreakdown: parseYearlyBreakdown(value.yearlyBreakdown),
      dailyStats: parseDailyStats(value.dailyStats),
      eventWindow: parseEventWindow(value.eventWindow),
   };
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

   // Monotonic id for the newest logical fetch. Year switches can leave an
   // older request in flight; without this guard it could resolve last and
   // overwrite the newer year's rows while `selectedYear` shows the new year.
   let requestId = 0;

   const fetchLeaderboard = async (year?: number | "total") => {
      const target = year ?? selectedYear.value;
      if (typeof target === "number") selectedYear.value = target;
      const id = ++requestId;

      const cacheKey = `leaderboard_data_${target}`;

      // SWR: Load from local storage. The cached snapshot is untrusted input,
      // so every field is validated before it reaches the page.
      const cached = readCache(cacheKey);
      const clearState = () => {
         users.value = [];
         eventStats.value = null;
         yearlyBreakdown.value = null;
         dailyStats.value = null;
         eventWindow.value = null;
      };

      if (cached) {
         try {
            const parsed = parseCachedLeaderboard(JSON.parse(cached));
            users.value = parsed.users;
            eventStats.value = parsed.eventStats;
            yearlyBreakdown.value = parsed.yearlyBreakdown;
            dailyStats.value = parsed.dailyStats;
            eventWindow.value = parsed.eventWindow;
         } catch (e) {
            // Unusable entry — hand-edited, or written by an older build. Drop
            // it and fall through to a fresh fetch, so the loading state shows
            // instead of the page rendering rows it cannot format.
            console.warn("Failed to read cached leaderboard", e);
            removeCache(cacheKey);
            clearState();
         }
      } else {
         clearState();
      }

      // The cache decision is the loading decision: rows on screen need only
      // the small revalidating spinner, a cold target needs the skeleton.
      isLoading.value = users.value.length === 0;

      isValidating.value = true;
      error.value = null;

      try {
         const eventSlug = target === "total" ? "total" : `monuments${target}`;
         const data = await apiFetch<LeaderboardResponse>(`${API_BASE}/${eventSlug}`, {
            parse: parseLeaderboardResponse,
            label: "leaderboard",
         });
         // A newer fetch has started; its state is the one the user asked for.
         if (id !== requestId) return;

         const countryData = data[COUNTRY];

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

         // Cache everything. A storage failure only loses the SWR snapshot;
         // the freshly fetched state above is already correct.
         writeCache(
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
         if (id !== requestId) return;
         if (users.value.length === 0) {
            error.value = errorMessage(e, target);
         }
      } finally {
         // Only the newest request owns the shared flags. An older response
         // finishing later must not clear the spinner of the current one.
         if (id === requestId) {
            isLoading.value = false;
            isValidating.value = false;
         }
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
