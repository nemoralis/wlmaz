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
   START_YEAR,
} from "@/utils/leaderboard.ts";
import { logger } from "@/utils/logger.ts";
import redisClient from "@/utils/redis.ts";

const router = express.Router();

const API_BASE = "https://wikiloves.toolforge.org/api/events";

const CACHE_TTL = 3600; // 1 hour — a contest still running keeps changing

/**
 * Redis key for one event's Azerbaijan slice, shared by the per-year proxy
 * route and the aggregate builder so a single upstream fetch serves both.
 */
function yearCacheKey(eventSlug: string): string {
   return `leaderboard:year:${eventSlug}`;
}

let aggregatePromise: Promise<LeaderboardResponse> | null = null;
let lastAggregate: LeaderboardResponse | null = null;

/**
 * Fetches fresh aggregate data from upstream (toolforge.org) with per-year
 * Redis caching.  Extracted so it can be called from both the initial
 * blocking fetch and the background refresh.
 */
async function fetchAggregate(): Promise<LeaderboardResponse> {
   try {
      const cacheKey = "leaderboard:aggregate";

      try {
         if (redisClient.isOpen) {
            const cached = await redisClient.get(cacheKey);
            if (cached) return JSON.parse(cached);
         }
      } catch (e) {
         logger.error("Redis read error:", e);
      }

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
               if (cached) return JSON.parse(cached);
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

      const aggregate = aggregateLeaderboardYears(years, results);

      try {
         if (redisClient.isOpen) {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(aggregate));
         }
      } catch (e) {
         logger.error("Redis write error:", e);
      }

      return aggregate;
   } finally {
      aggregatePromise = null;
   }
}

/**
 * Silently refresh aggregate data in the background.  Called when stale data
 * is being served to the client so the next request gets fresh data.
 */
async function refreshAggregateInBackground(): Promise<void> {
   if (aggregatePromise) return;
   aggregatePromise = fetchAggregate();
   try {
      lastAggregate = await aggregatePromise;
   } catch (e) {
      logger.error("Background leaderboard refresh failed:", e);
   } finally {
      aggregatePromise = null;
   }
}

/**
 * Fetches and aggregates data for all years with stale-while-revalidate.
 *
 * 1. If a fetch is already in flight → piggyback on it.
 * 2. If Redis has fresh data → return it.
 * 3. If stale data exists → return it instantly, refresh in background.
 * 4. If no stale data (first load) → block and fetch.
 */
async function getAggregateData() {
   // 1. Piggyback on in-flight fetch
   if (aggregatePromise) return aggregatePromise;

   const cacheKey = "leaderboard:aggregate";

   // 2. Try Redis cache
   try {
      if (redisClient.isOpen) {
         const cached = await redisClient.get(cacheKey);
         if (cached) {
            lastAggregate = JSON.parse(cached);
            return lastAggregate;
         }
      }
   } catch (e) {
      logger.error("Redis read error:", e);
   }

   // 3. Cache miss — serve stale and refresh in background
   if (lastAggregate) {
      refreshAggregateInBackground();
      return lastAggregate;
   }

   // 4. No stale data (first load) — block until fetch completes
   aggregatePromise = fetchAggregate();
   try {
      lastAggregate = await aggregatePromise;
      return lastAggregate;
   } finally {
      aggregatePromise = null;
   }
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
