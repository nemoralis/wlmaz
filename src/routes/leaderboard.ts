import express from "express";
import redisClient from "../utils/redis.ts";

const router = express.Router();

const API_BASE = "https://wikiloves.toolforge.org/api/events";

const COUNTRY = "Azerbaijan";
const START_YEAR = 2013;
const CACHE_TTL = 3600; // 1 hour

/**
 * Fetches and aggregates data for all years
 */
async function getAggregateData() {
    const cacheKey = "leaderboard:aggregate";

    try {
        if (redisClient.isOpen) {
            const cached = await redisClient.get(cacheKey);
            if (cached) return JSON.parse(cached);
        }
    } catch (e) {
        console.error("Redis read error:", e);
    }

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - START_YEAR + 1 }, (_, i) => START_YEAR + i);

    const fetchPromises = years.map(async (year) => {
        try {
            const resp = await fetch(`${API_BASE}/monuments${year}`);
            if (resp.ok) return await resp.json();
            return null;
        } catch (e) {
            console.error(`Failed to fetch monuments${year}:`, e);
            return null;
        }
    });

    const results = await Promise.all(fetchPromises);

    const aggregate: any = {
        [COUNTRY]: {
            count: 0,
            usage: 0,
            usercount: 0,
            users: {},
            years: {}, // Breakdown per year
        },
    };

    const userMap: Record<string, { count: number; usage: number; reg: number }> = {};
    const uniqueUsers = new Set<string>();

    results.forEach((data, index) => {
        if (!data || !data[COUNTRY]) return;
        const year = years[index];
        const countryData = data[COUNTRY];

        aggregate[COUNTRY].count += countryData.count || 0;
        aggregate[COUNTRY].usage += countryData.usage || 0;
        aggregate[COUNTRY].years[year] = {
            count: countryData.count,
            usercount: countryData.usercount,
            usage: countryData.usage,
        };

        if (countryData.users) {
            Object.entries(countryData.users).forEach(([username, userData]: [string, any]) => {
                uniqueUsers.add(username);
                if (!userMap[username]) {
                    userMap[username] = { count: 0, usage: 0, reg: userData.reg };
                }
                userMap[username].count += userData.count || 0;
                userMap[username].usage += userData.usage || 0;
                if (userData.reg < userMap[username].reg) {
                    userMap[username].reg = userData.reg;
                }
            });
        }
    });

    aggregate[COUNTRY].usercount = uniqueUsers.size;
    aggregate[COUNTRY].users = userMap;

    try {
        if (redisClient.isOpen) {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(aggregate));
        }
    } catch (e) {
        console.error("Redis write error:", e);
    }

    return aggregate;
}

/**
 * Aggregates data from all years
 */
router.get("/total", async (_req, res) => {
    try {
        const data = await getAggregateData();
        res.json(data);
    } catch (error: any) {
        console.error("Total leaderboard proxy error:", error);
        res.status(500).json({ error: "Failed to fetch aggregated leaderboard" });
    }
});

/**
 * Get statistics for a specific user across all years
 */
router.get("/user/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const cacheKey = `userstats:${username}`;

        if (redisClient.isOpen) {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                res.json(JSON.parse(cached));
                return;
            }
        }

        const data = await getAggregateData();
        const countryData = data[COUNTRY];
        const userStats = countryData.users[username];

        if (!userStats) {
            res.status(404).json({ error: "User not found in WLM Azerbaijan records" });
            return;
        }

        // Fetch additional data from Commons API
        let commonsData = null;
        try {
            const commonsResp = await fetch(
                `https://commons.wikimedia.org/w/api.php?action=query&format=json&list=users&usprop=editcount|registration|groups|blockinfo&ususers=${encodeURIComponent(username)}&formatversion=2`
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
            console.error("Failed to fetch from Commons API:", e);
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
    } catch (error: any) {
        console.error("User stats proxy error:", error);
        res.status(500).json({ error: "Failed to fetch user statistics" });
    }
});

/**
 * Proxy route for leaderboard data to bypass CORS
 */
router.get("/:eventSlug", async (req, res) => {
    try {
        const { eventSlug } = req.params;

        if (!/^[a-z]+[0-9]{4}$/.test(eventSlug)) {
            res.status(400).json({ error: "Invalid event slug format" });
            return;
        }

        const cacheKey = `leaderboard:${eventSlug}`;
        if (redisClient.isOpen) {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                res.json(JSON.parse(cached));
                return;
            }
        }

        const response = await fetch(`${API_BASE}/${eventSlug}`);

        if (!response.ok) {
            res.status(response.status).json({
                error: `Upstream API returned ${response.status}`,
                status: response.status,
            });
            return;
        }

        const data = await response.json();

        if (redisClient.isOpen) {
            await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(data));
        }

        res.json(data);
    } catch (error: any) {
        console.error("Leaderboard proxy error:", error);
        res.status(500).json({ error: "Failed to fetch leaderboard from upstream" });
    }
});

export default router;

