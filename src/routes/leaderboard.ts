/**
 * Leaderboard endpoints (/api/leaderboard/*): proxy from wikiloves.toolforge.org
 * with per-year Redis caching, aggregate building (leaderboard.ts) and a
 * background refresh. Serves both the ranking list and individual user stats.
 */
import express from "express";
import type { LeaderboardResponse } from "@/types/api.ts";
import {
   aggregateLeaderboardYears,
   COUNTRY,
   extractCountry,
   FINISHED_TTL,
   isEventFinished,
   parseLeaderboardResponse,
   START_YEAR,
} from "@/utils/leaderboard.ts";
import { logger } from "@/utils/logger.ts";
import redisClient from "@/utils/redis.ts";

const router = express.Router();

const API_BASE = "https://wikiloves.toolforge.org/api/events";

const CACHE_TTL = 3600; // 1 hour — a contest still running keeps changing

/** Maximum age of an in-memory aggregate when upstream is unavailable. */
const STALE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Don't hammer upstream with a background refresh on every request. */
const REFRESH_MIN_INTERVAL_MS = 60 * 1000;

const AGGREGATE_CACHE_KEY = "leaderboard:aggregate";
const AGGREGATE_LOCK_KEY = "leaderboard:aggregate:lock";
const AGGREGATE_LOCK_TTL = 30; // seconds
const AGGREGATE_LOCK_WAIT_MS = 10_000;
const AGGREGATE_LOCK_POLL_MS = 250;

/**
 * Redis key for one event's Azerbaijan slice, shared by the per-year proxy
 * route and the aggregate builder so a single upstream fetch serves both.
 */
function yearCacheKey(eventSlug: string): string {
   return `leaderboard:year:${eventSlug}`;
}

let aggregatePromise: Promise<LeaderboardResponse> | null = null;
let lastAggregate: LeaderboardResponse | null = null;
let lastAggregateAt = 0;
let lastRefreshAttemptAt = 0;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Reads and validates the aggregate cache. A corrupt value counts as a miss. */
async function readCachedAggregate(): Promise<LeaderboardResponse | null> {
   if (!redisClient.isOpen) return null;

   let cached: string | null;
   try {
      cached = await redisClient.get(AGGREGATE_CACHE_KEY);
   } catch (e) {
      logger.error("Redis read error:", e);
      return null;
   }
   if (!cached) return null;

   try {
      return parseLeaderboardResponse(JSON.parse(cached));
   } catch (e) {
      logger.warn("Invalid aggregate cache; discarding it", e);
      try {
         await redisClient.del(AGGREGATE_CACHE_KEY);
      } catch (deleteError) {
         logger.error("Redis delete error:", deleteError);
      }
      return null;
   }
}

/**
 * One Redis lock per refresh so PM2 workers do not all hit toolforge.org at
 * once. Returns the ownership token, "busy" when another worker holds it, or
 * null when Redis is unavailable (single-process fallback: proceed unlocked).
 */
async function acquireAggregateLock(): Promise<string | "busy" | null> {
   if (!redisClient.isOpen) return null;

   const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
   try {
      const result = await redisClient.set(AGGREGATE_LOCK_KEY, token, {
         NX: true,
         EX: AGGREGATE_LOCK_TTL,
      });
      return result === "OK" ? token : "busy";
   } catch (e) {
      logger.error("Redis lock error:", e);
      return null;
   }
}

/** Releases only the lock this process owns (compare-and-delete). */
async function releaseAggregateLock(token: string): Promise<void> {
   try {
      await redisClient.eval(
         "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
         { keys: [AGGREGATE_LOCK_KEY], arguments: [token] },
      );
   } catch (e) {
      logger.error("Redis lock release error:", e);
   }
}

/**
 * Fetches fresh aggregate data from upstream (toolforge.org) with per-year
 * Redis caching.  Extracted so it can be called from both the initial
 * blocking fetch and the background refresh.
 */
async function fetchAggregate(): Promise<LeaderboardResponse> {
   // Try the aggregate cache first; validation keeps corrupt JSON from reaching
   // the client as a "successful" leaderboard.
   const cached = await readCachedAggregate();
   if (cached) return cached;

   const now = new Date();
   const currentYear = now.getFullYear();
   const latestYear = now.getMonth() < 8 ? currentYear - 1 : currentYear;
   const years = Array.from({ length: latestYear - START_YEAR + 1 }, (_, i) => START_YEAR + i);

   const fetchPromises = years.map(async (year) => {
      const eventSlug = `monuments${year}`;
      const eventCacheKey = yearCacheKey(eventSlug);

      try {
         if (redisClient.isOpen) {
            const cached = await redisClient.get(eventCacheKey);
            if (cached) {
               try {
                  return parseLeaderboardResponse(JSON.parse(cached));
               } catch (cacheError) {
                  // A corrupt year entry must not blank that year; drop it and
                  // let the upstream fetch below replace it.
                  logger.warn(
                     `Invalid cached leaderboard year ${eventSlug}; refetching`,
                     cacheError,
                  );
                  await redisClient.del(eventCacheKey);
               }
            }
         }

         const resp = await fetch(`${API_BASE}/${eventSlug}`, {
            signal: AbortSignal.timeout(10000),
            headers: { "User-Agent": "WLMAZ-Tool/1.0" },
         });
         if (!resp.ok) return null;

         // Only the Azerbaijan slice is ever read — see extractCountry
         const country = extractCountry(await resp.json());
         if (!country) return null;

         if (redisClient.isOpen) {
            const ttl = isEventFinished(country[COUNTRY].end, now) ? FINISHED_TTL : CACHE_TTL;
            await redisClient.setEx(eventCacheKey, ttl, JSON.stringify(country));
         }
         return country;
      } catch (e) {
         logger.error(`Failed to fetch ${eventSlug}:`, e);
         return null;
      }
   });

   const results = await Promise.all(fetchPromises);
   const failedYears = results.filter((result) => result === null).length;

   if (failedYears === years.length) {
      throw new Error("Every leaderboard year failed to load");
   }

   const aggregate = aggregateLeaderboardYears(years, results);

   if (failedYears > 0) {
      // A partial aggregate must not displace a complete cached one for an
      // hour; return it to this caller, but let the next request retry.
      logger.warn(
         `Leaderboard aggregate is partial: ${failedYears}/${years.length} years unavailable`,
      );
   } else {
      try {
         if (redisClient.isOpen) {
            await redisClient.setEx(AGGREGATE_CACHE_KEY, CACHE_TTL, JSON.stringify(aggregate));
         }
      } catch (e) {
         logger.error("Redis write error:", e);
      }
   }

   return aggregate;
}

/**
 * Runs one aggregate refresh per process. The promise is cleared only after
 * `lastAggregate` has been updated, so a concurrent request cannot slip into
 * the gap and start a duplicate upstream fetch.
 */
async function loadAggregate(): Promise<LeaderboardResponse> {
   if (aggregatePromise) return aggregatePromise;

   const promise = (async () => {
      const lock = await acquireAggregateLock();

      if (lock === "busy") {
         // Another PM2 worker is refreshing. Wait briefly for it to publish the
         // result instead of making the same upstream calls in parallel.
         const deadline = Date.now() + AGGREGATE_LOCK_WAIT_MS;
         while (Date.now() < deadline) {
            await sleep(AGGREGATE_LOCK_POLL_MS);
            const cached = await readCachedAggregate();
            if (cached) return cached;
         }
         logger.warn("Leaderboard refresh lock stayed busy; fetching anyway");
      }

      try {
         return await fetchAggregate();
      } finally {
         if (typeof lock === "string" && lock !== "busy") {
            await releaseAggregateLock(lock);
         }
      }
   })();

   aggregatePromise = promise;

   try {
      const data = await promise;
      lastAggregate = data;
      lastAggregateAt = Date.now();
      return data;
   } finally {
      if (aggregatePromise === promise) aggregatePromise = null;
   }
}

/**
 * Silently refresh aggregate data in the background.  Called when stale data
 * is being served to the client so the next request gets fresh data.
 */
async function refreshAggregateInBackground(): Promise<void> {
   if (aggregatePromise) return;
   if (Date.now() - lastRefreshAttemptAt < REFRESH_MIN_INTERVAL_MS) return;

   lastRefreshAttemptAt = Date.now();
   try {
      await loadAggregate();
   } catch (e) {
      logger.error("Background leaderboard refresh failed:", e);
   }
}

/**
 * Fetches and aggregates data for all years with stale-while-revalidate.
 *
 * 1. If a fetch is already in flight → piggyback on it.
 * 2. If Redis has fresh data → return it.
 * 3. If a recent in-memory aggregate exists → return it and refresh in the
 *    background. The in-memory copy is bounded by STALE_MAX_AGE_MS so a
 *    permanently broken upstream cannot be masked forever.
 * 4. Otherwise → block and fetch.
 */
async function getAggregateData(): Promise<LeaderboardResponse> {
   // 1. Piggyback on in-flight fetch
   if (aggregatePromise) return aggregatePromise;

   // 2. Try Redis cache
   const cached = await readCachedAggregate();
   if (cached) {
      lastAggregate = cached;
      lastAggregateAt = Date.now();
      return cached;
   }

   // 3. Cache miss — serve a recent stale copy and refresh in background
   if (lastAggregate && Date.now() - lastAggregateAt <= STALE_MAX_AGE_MS) {
      void refreshAggregateInBackground();
      return lastAggregate;
   }

   // 4. No usable stale data — block until fetch completes
   return loadAggregate();
}

/**
 * Aggregates data from all years
 */
router.get("/total", async (_req, res) => {
   try {
      const data = await getAggregateData();
      res.json(data);
   } catch (error: unknown) {
      logger.error("Total leaderboard proxy error:", error);
      res.status(500).json({ error: "Failed to fetch aggregated leaderboard" });
   }
});

/**
 * Get statistics for a specific user across all years
 */
router.get("/user/:username", async (req, res) => {
   try {
      const { username } = req.params;

      // Enforce valid Wikimedia username characters — blocks control
      // chars, newlines (log/Redis injection), and wikitext/API delimiters (|, =).
      if (!username || !/^[A-Za-z0-9_\-.\s]{1,255}$/.test(username)) {
         res.status(400).json({ error: "Invalid username" });
         return;
      }

      const cacheKey = `userstats:${encodeURIComponent(username)}`;

      if (redisClient.isOpen) {
         const cached = await redisClient.get(cacheKey);
         if (cached) {
            res.json(JSON.parse(cached));
            return;
         }
      }

      const data = await getAggregateData();
      if (!data) {
         res.status(500).json({ error: "Failed to fetch aggregated leaderboard" });
         return;
      }
      const countryData = data[COUNTRY];
      if (!countryData) {
         res.status(404).json({ error: "User not found in WLM Azerbaijan records" });
         return;
      }
      const userStats = countryData.users[username];

      if (!userStats) {
         res.status(404).json({ error: "User not found in WLM Azerbaijan records" });
         return;
      }

      // Fetch additional data from Commons API
      let commonsData = null;
      try {
         const commonsResp = await fetch(
            `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=users&usprop=editcount|registration|groups|blockinfo&ususers=${encodeURIComponent(username)}&formatversion=2`,
            {
               signal: AbortSignal.timeout(10000),
               headers: { "User-Agent": "WLMAZ-Tool/1.0" },
            },
         );
         if (commonsResp.ok) {
            const commonsJson = await commonsResp.json();
            if (commonsJson.query?.users?.[0]) {
               const u = commonsJson.query.users[0];
               commonsData = {
                  editcount: u.editcount,
                  registration: u.registration,
                  groups: u.groups || [],
                  blocked: !!u.blockid,
                  blockreason: u.blockreason,
                  blockexpiry: u.blockexpiryrelative,
               };
            }
         }
      } catch (e) {
         logger.error("Failed to fetch from Commons API:", e);
      }

      const result = {
         username,
         total: userStats,
         commons: commonsData,
         country: COUNTRY,
      };

      if (redisClient.isOpen) {
         await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(result));
      }

      res.json(result);
   } catch (error: unknown) {
      logger.error("User stats proxy error:", error);
      res.status(500).json({ error: "Failed to fetch user statistics" });
   }
});

/**
 * Proxy route for leaderboard data to bypass CORS
 */
router.get("/:eventSlug", async (req, res) => {
   try {
      const { eventSlug } = req.params;

      if (!eventSlug || eventSlug.length > 64 || !/^[a-z]+[0-9]{4}$/.test(eventSlug)) {
         res.status(400).json({ error: "Invalid event slug format" });
         return;
      }

      const cacheKey = yearCacheKey(eventSlug);
      if (redisClient.isOpen) {
         const cached = await redisClient.get(cacheKey);
         if (cached) {
            res.json(JSON.parse(cached));
            return;
         }
      }

      const response = await fetch(`${API_BASE}/${eventSlug}`, {
         signal: AbortSignal.timeout(10000),
         headers: { "User-Agent": "WLMAZ-Tool/1.0" },
      });

      if (!response.ok) {
         res.status(response.status).json({
            error: `Upstream API returned ${response.status}`,
            status: response.status,
         });
         return;
      }

      // Upstream answers with every country; only ours is ever read
      const country = extractCountry(await response.json());
      if (!country) {
         res.status(404).json({ error: `No ${COUNTRY} data for ${eventSlug}` });
         return;
      }

      if (redisClient.isOpen) {
         // A finished contest is final, so it only needs an occasional refresh
         const ttl = isEventFinished(country[COUNTRY].end) ? FINISHED_TTL : CACHE_TTL;
         await redisClient.setEx(cacheKey, ttl, JSON.stringify(country));
      }

      res.json(country);
   } catch (error: unknown) {
      logger.error("Leaderboard proxy error:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard from upstream" });
   }
});

export default router;
