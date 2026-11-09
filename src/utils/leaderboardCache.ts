/**
 * The leaderboard localStorage snapshot codec.
 *
 * `useLeaderboard` owns fetching; this module owns the untrusted-side
 * contract: validating the cached JSON before any of it reaches the page.
 * JSON has no Date type and no guarantees about its shape (hand-edited,
 * stale-schema, older builds), so every field is re-validated here — the
 * same boundary `apiGuards` enforces for network payloads.
 */

import type { LeaderboardUser } from "@/types";
import type { EventStats, WikiLovesDailyData } from "@/types/api.ts";
import { isFiniteNumber, isRecord } from "@/utils/typeGuards.ts";

/** The snapshot written to localStorage, as read back. */
export interface CachedLeaderboard {
   users: LeaderboardUser[];
   eventStats: EventStats | null;
   yearlyBreakdown: Record<number, { count: number; usage: number }> | null;
   dailyStats: Record<string, WikiLovesDailyData> | null;
   eventWindow: { start: number; end: number } | null;
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
export function reviveUsers(users: unknown): LeaderboardUser[] {
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

/** Validates the whole snapshot; throws on anything unusable. */
export function parseCachedLeaderboard(value: unknown): CachedLeaderboard {
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
