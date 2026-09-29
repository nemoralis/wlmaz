/**
 * Pure leaderboard aggregation helpers for the WLM toolforge proxy.
 *
 * The route layer (src/routes/leaderboard.ts) handles fetching and Redis
 * caching; this module only performs the deterministic merge of per-year
 * country payloads into a single aggregate, plus the two decisions the route
 * needs to make before caching: which slice of the upstream payload to keep
 * and how long it stays valid. It has no I/O so it can be unit tested in
 * isolation.
 */

import type { LeaderboardResponse, WikiLovesUserData } from "@/types/api.ts";

/** Wiki Loves Monuments country name used as the top-level key. */
export const COUNTRY = "Azerbaijan";

/** First year of the WLM competition that contributes to the aggregate. */
export const START_YEAR = 2013;

/** Seconds. TTL for a contest that has already ended — its data never changes. */
export const FINISHED_TTL = 60 * 60 * 24 * 30; // 30 days

/**
 * Keeps only the country we serve out of an upstream event payload.
 *
 * The toolforge API answers with every participating country (~52 of them),
 * while only {@link COUNTRY} is ever read downstream — for 2013 that is
 * 1.4 KB of a 1.4 MB response. Dropping the rest before the value is cached
 * and sent keeps Redis and the client payload at the size we actually need.
 *
 * Returns `null` when the country is absent, so the route can answer 404
 * instead of caching an empty shell under whatever slug was requested.
 */
export function extractCountry(data: unknown): LeaderboardResponse | null {
   if (!data || typeof data !== "object") return null;

   const country = (data as Record<string, unknown>)[COUNTRY];
   if (!country || typeof country !== "object") return null;

   return { [COUNTRY]: country as LeaderboardResponse[string] };
}

/**
 * Whether a contest has ended, i.e. whether its data can be treated as final.
 *
 * `end` is a `YYYYMMDDHHmmss` stamp, not an epoch, so the two are compared as
 * fixed-width `YYYYMMDD` strings — timezone-free and correct for every year.
 * Anything unexpected (missing, zero, malformed) counts as *not* finished so
 * the caller falls back to the short TTL.
 */
export function isEventFinished(end: unknown, now: Date = new Date()): boolean {
   if (typeof end !== "number" || !Number.isFinite(end) || end <= 0) return false;

   const stamp = String(Math.trunc(end)).slice(0, 8);
   if (stamp.length !== 8 || !/^\d{8}$/.test(stamp)) return false;

   return stamp < now.toISOString().slice(0, 10).replace(/-/g, "");
}

/** User records merged across years (yearly data included). */
type MergedUser = WikiLovesUserData & {
   yearly: Record<number, { count: number; usage: number }>;
};

/** Property names that must never be carried into plain-object aggregations. */
const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Merges the per-year upstream responses (one element per element of `years`)
 * into a single aggregate `LeaderboardResponse` keyed by {@link COUNTRY}.
 *
 * The in-memory merge mirrors the shape of the upstream `Azerbaijan` node:
 * totals are summed, per-year tallies are recorded under `years`, and each
 * username accumulates `count`/`usage` across every year they appear in.
 * Elements that returned `null` (fetch failures) or lack the `Azerbaijan`
 * key are skipped.
 *
 * Despite the `Record<...>` types, user maps are built with
 * `Object.create(null)` and hostile prototype names are skipped, so the
 * result can be safely JSON-stringified without pollution vectors.
 */
export function aggregateLeaderboardYears(
   years: number[],
   results: Array<LeaderboardResponse | null>,
): LeaderboardResponse {
   const aggregate: LeaderboardResponse = {
      [COUNTRY]: {
         category: "",
         count: 0,
         usage: 0,
         usercount: 0,
         userreg: 0,
         start: 0,
         end: 0,
         data: Object.create(null),
         users: Object.create(null),
         years: Object.create(null),
      },
   };

   const userMap: Record<string, MergedUser> = Object.create(null);
   const uniqueUsers = new Set<string>();

   results.forEach((data, index) => {
      if (!data || !data[COUNTRY]) return;
      const year = years[index];
      if (year === undefined) return;
      const countryData = data[COUNTRY];

      aggregate[COUNTRY].count += countryData.count || 0;
      aggregate[COUNTRY].usage += countryData.usage || 0;
      aggregate[COUNTRY].years![year] = {
         count: countryData.count,
         usercount: countryData.usercount,
         usage: countryData.usage,
      };

      if (countryData.users) {
         const entries = Object.entries(countryData.users) as [string, WikiLovesUserData][];
         for (const [username, userData] of entries) {
            if (UNSAFE_KEYS.has(username)) {
               continue;
            }

            uniqueUsers.add(username);
            if (!userMap[username]) {
               userMap[username] = {
                  count: 0,
                  usage: 0,
                  reg: userData.reg,
                  yearly: Object.create(null),
               };
            }
            const count = userData.count || 0;
            const usage = userData.usage || 0;
            userMap[username].count += count;
            userMap[username].usage += usage;
            userMap[username].yearly[year] = { count, usage };

            if (userData.reg < userMap[username].reg) {
               userMap[username].reg = userData.reg;
            }
         }
      }
   });

   aggregate[COUNTRY].usercount = uniqueUsers.size;
   aggregate[COUNTRY].users = userMap;

   return aggregate;
}
