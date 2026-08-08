import { createClient } from "redis";
import { logger } from "./logger";

const redisClient = createClient({
   url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));
redisClient.on("connect", () => logger.info("Connected to Redis"));

// Check if open before connecting (to handle hot-reloads in dev)
if (!redisClient.isOpen) {
   redisClient.connect().catch((err) => logger.error("Redis connect failed", err));
}

export default redisClient;
