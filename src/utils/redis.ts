import { createClient } from "redis";

const redisClient = createClient({
   url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));

// Check if open before connecting (to handle hot-reloads in dev)
if (!redisClient.isOpen) {
   redisClient.connect().catch(console.error);
}

export default redisClient;
