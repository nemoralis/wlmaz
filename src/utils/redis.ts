import { createClient, type RedisClientType } from "redis";
import { logger } from "./logger";

// In local MediaWiki dev mode Redis is not required — session and rate-limit
// stores fall back to in-memory defaults, so we skip the connection entirely.
const DEV_MODE = process.env.MEDIAWIKI_DEV_MODE === "true" && process.env.NODE_ENV !== "production";

let redisClient: RedisClientType;

if (DEV_MODE) {
   // Return a minimal stub so existing `redisClient.isOpen` / `.ping()` checks
   // in leaderboard routes and the health endpoint degrade gracefully.
   redisClient = {
      isOpen: false,
      async ping() {
         throw new Error("Redis unavailable in local dev mode");
      },
      async sendCommand() {
         throw new Error("Redis unavailable in local dev mode");
      },
      async quit() {},
   } as unknown as RedisClientType;
   logger.info("Redis skipped — local MediaWiki dev mode is active");
} else {
   redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
   });

   redisClient.on("error", (err) => logger.error("Redis Client Error", err));
   redisClient.on("connect", () => logger.info("Connected to Redis"));

   // Check if open before connecting (to handle hot-reloads in dev)
   if (!redisClient.isOpen) {
      redisClient.connect().catch((err) => logger.error("Redis connect failed", err));
   }
}

export default redisClient;
