import { createClient, type RedisClientType } from "redis";
import { config } from "@/config.ts";
import { logger } from "@/utils/logger.ts";

/**
 * Default export: the application's Redis client.
 *
 * In local MediaWiki dev mode (config.isDevUploadMode) Redis is not required —
 * session and rate-limit stores fall back to in-memory defaults, so this
 * exports a minimal stub that satisfies `isOpen`/`ping()` checks.
 */
let redisClient: RedisClientType;

if (config.isDevUploadMode) {
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
      url: config.redisUrl,
   });

   redisClient.on("error", (err) => logger.error("Redis Client Error", err));
   redisClient.on("connect", () => logger.info("Connected to Redis"));

   // Check if open before connecting (to handle hot-reloads in dev)
   if (!redisClient.isOpen) {
      redisClient.connect().catch((err) => logger.error("Redis connect failed", err));
   }
}

export default redisClient;
