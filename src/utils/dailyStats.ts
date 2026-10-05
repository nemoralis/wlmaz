/**
 * Pure helpers for turning toolforge per-day event statistics
 * (`data: { "YYYYMMDD": { images, joiners, newbie_joiners } }`) into a daily
 * series for line charts. No I/O, unit-testable.
 */

import type { WikiLovesDailyData } from "@/types/api.ts";

/** One reported day of the chart series. `date` is `YYYY-MM-DD`. */
export interface DailyPoint extends WikiLovesDailyData {
   date: string;
   /**
    * Running totals from the first reported day. `images`/`joiners` stay the
    * per-day values; these are what the chart plots, so the line ends on the
    * season total the rest of the page shows.
    */
   totalImages: number;
   totalJoiners: number;
}

/** Toolforge event start/end timestamps: `YYYYMMDDHHmmss`. */
type WikiTimestamp = number;

/**
 * WLM contests are September–October, but the upstream start stamp is 20:00 UTC
 * on 31 August, whose date part reads as 31 August. Any August start is
 * therefore treated as 1 September — and, since 2013's window really did open
 * on 31 August, its bucket is folded into that first day rather than dropped.
 */
const CONTEST_START_MONTH = 9;

/** Converts a `YYYYMMDD` key to `YYYY-MM-DD`, or null if invalid. */
function toIsoDate(key: string): string | null {
   if (!/^\d{8}$/.test(key)) return null;
   const y = Number(key.slice(0, 4));
   const m = Number(key.slice(4, 6));
   const d = Number(key.slice(6, 8));
   const date = new Date(Date.UTC(y, m - 1, d));
   // Reject rollover dates like 20230231 (Feb 31 → Mar 3)
   if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
      return null;
   }
   return `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`;
}

/** Extracts the `YYYY-MM-DD` part of a `YYYYMMDDHHmmss` timestamp. */
function timestampToDate(ts: WikiTimestamp | undefined): string | null {
   if (!ts) return null;
   const s = String(ts);
   return s.length >= 8 ? toIsoDate(s.slice(0, 8)) : null;
}

/**
 * Moves reported August days onto 1 September — see CONTEST_START_MONTH.
 *
 * Only days that are actually reported get moved, and only when a September day
 * exists to merge them into, so a window that never leaves August keeps its
 * own dates instead of being pushed forward past its own end.
 */
function foldAugustIntoSeptember(
   byDate: Map<string, WikiLovesDailyData>,
   from: string | undefined,
): void {
   if (!from || from.slice(5, 7) !== "08") return;

   const contestStart = `${from.slice(0, 4)}-0${CONTEST_START_MONTH}-01`;
   const august = [...byDate.keys()].filter((date) => date >= from && date < contestStart);
   if (august.length === 0) return;
   if (![...byDate.keys()].some((date) => date >= contestStart)) return;

   const existing = byDate.get(contestStart);
   const merged: WikiLovesDailyData = {
      images: existing?.images ?? 0,
      joiners: existing?.joiners ?? 0,
      newbie_joiners: existing?.newbie_joiners ?? 0,
   };

   for (const date of august) {
      const stat = byDate.get(date) as WikiLovesDailyData;
      merged.images += stat.images;
      merged.joiners += stat.joiners;
      merged.newbie_joiners += stat.newbie_joiners;
      byDate.delete(date);
   }
   byDate.set(contestStart, merged);
}

/**
 * Turns sparse toolforge `data` into one point per reported day, ascending,
 * each carrying that day's own counts plus the running total.
 *
 * Upstream omits days with no activity rather than sending zeros for them, so
 * this does not invent any: a day we have no reading for stays absent, and the
 * chart draws straight through it instead of dipping to a fake zero.
 *
 * `start` is still needed for the September-start normalization — the upstream
 * stamp reads as 31 August. Invalid keys are skipped; an empty result means
 * nothing can be charted.
 */
export function buildDailySeries(
   data: Record<string, WikiLovesDailyData> | null | undefined,
   start?: WikiTimestamp,
): DailyPoint[] {
   const byDate = new Map<string, WikiLovesDailyData>();
   let min: string | undefined;

   for (const [key, stat] of Object.entries(data ?? {})) {
      const iso = toIsoDate(key);
      if (!iso) continue;
      byDate.set(iso, stat);
      if (!min || iso < min) min = iso;
   }

   // Nothing to chart
   if (byDate.size === 0) return [];

   foldAugustIntoSeptember(byDate, timestampToDate(start) ?? min);

   const points: DailyPoint[] = [];
   let totalImages = 0;
   let totalJoiners = 0;
   for (const date of [...byDate.keys()].sort()) {
      const stat = byDate.get(date) as WikiLovesDailyData;
      totalImages += stat.images;
      totalJoiners += stat.joiners;
      points.push({
         date,
         ...stat,
         totalImages,
         totalJoiners,
      });
   }
   return points;
}
