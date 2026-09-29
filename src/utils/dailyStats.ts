/**
 * Pure helpers for turning toolforge per-day event statistics
 * (`data: { "YYYYMMDD": { images, joiners, newbie_joiners } }`) into a
 * continuous daily series for line charts. No I/O, unit-testable.
 */

import type { WikiLovesDailyData } from "@/types/api.ts";

/** One day of the chart series. `date` is `YYYY-MM-DD`. */
export interface DailyPoint extends WikiLovesDailyData {
   date: string;
   /**
    * Running totals from the first day of the window. `images`/`joiners` stay
    * the per-day values; these are what the chart plots, so the line ends on
    * the season total the rest of the page shows.
    */
   totalImages: number;
   totalJoiners: number;
}

/** Toolforge event start/end timestamps: `YYYYMMDDHHmmss`. */
type WikiTimestamp = number;

const DAY_MS = 86_400_000;

/**
 * WLM contests are September–October, but the upstream start stamp is 20:00 UTC
 * on 31 August, whose date part reads as 31 August. Any August start is
 * therefore treated as 1 September — and, since 2013's window really did open
 * on 31 August, its bucket is folded into that first day rather than dropped.
 */
const CONTEST_START_MONTH = 9;

/** Safety cap so a malformed window can never spin forever. */
const MAX_WINDOW_DAYS = 400;

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
 * Builds a continuous daily series from sparse toolforge `data`.
 *
 * The API only lists days with activity, which would render a gappy line —
 * so the series is zero-filled across the contest window (`start`/`end`
 * timestamps), falling back to the min/max dates present in the data when
 * no window is given. The window starts on 1 September (see
 * CONTEST_START_MONTH) rather than the upstream 31 August stamp, and each
 * point carries both the day's own counts and the running total. Invalid keys
 * are skipped; an empty result means nothing can be charted.
 */
export function buildDailySeries(
   data: Record<string, WikiLovesDailyData> | null | undefined,
   start?: WikiTimestamp,
   end?: WikiTimestamp,
): DailyPoint[] {
   const byDate = new Map<string, WikiLovesDailyData>();
   let min: string | undefined;
   let max: string | undefined;

   for (const [key, stat] of Object.entries(data ?? {})) {
      const iso = toIsoDate(key);
      if (!iso) continue;
      byDate.set(iso, stat);
      if (!min || iso < min) min = iso;
      if (!max || iso > max) max = iso;
   }

   // Nothing to chart — an empty window of zeros would just be noise
   if (byDate.size === 0) return [];

   let from = timestampToDate(start) ?? min;
   let to = timestampToDate(end) ?? max;
   if (from && to && from > to) [from, to] = [to, from];
   if (!from || !to) return [];

   // Days that fall inside the upstream window but before the chart starts;
   // only 2013 has any (its contest really did open on 31 August).
   let folded: WikiLovesDailyData | null = null;
   if (from.slice(5, 7) === "08") {
      const contestStart = `${from.slice(0, 4)}-0${CONTEST_START_MONTH}-01`;
      // A window entirely inside August has no September day to move to.
      if (contestStart <= to) {
         for (const [date, stat] of byDate) {
            if (date >= from && date < contestStart) {
               folded = folded ?? { images: 0, joiners: 0, newbie_joiners: 0 };
               folded.images += stat.images;
               folded.joiners += stat.joiners;
               folded.newbie_joiners += stat.newbie_joiners;
            }
         }
         from = contestStart;
      }
   }

   const points: DailyPoint[] = [];
   let totalImages = 0;
   let totalJoiners = 0;
   let cursor = Date.parse(`${from}T00:00:00Z`);
   const last = Date.parse(`${to}T00:00:00Z`);
   for (let i = 0; cursor <= last && i < MAX_WINDOW_DAYS; i++, cursor += DAY_MS) {
      const date = new Date(cursor).toISOString().slice(0, 10);
      const stat = byDate.get(date);
      // Folded days belong to the first one plotted, so the totals still add up.
      const images = (stat?.images ?? 0) + (i === 0 ? (folded?.images ?? 0) : 0);
      const joiners = (stat?.joiners ?? 0) + (i === 0 ? (folded?.joiners ?? 0) : 0);
      totalImages += images;
      totalJoiners += joiners;
      points.push({
         date,
         images,
         joiners,
         newbie_joiners:
            (stat?.newbie_joiners ?? 0) + (i === 0 ? (folded?.newbie_joiners ?? 0) : 0),
         totalImages,
         totalJoiners,
      });
   }
   return points;
}
