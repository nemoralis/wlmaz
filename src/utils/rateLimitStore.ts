import { RedisStore, type RedisReply } from "rate-limit-redis";
import redisClient from "@/utils/redis.ts";

/**
 * Builds a Redis-backed store for express-rate-limit.
 *
 * express-rate-limit's RedisStore expects a `sendCommand` callback; our Redis
 * client already wraps `sendCommand`, so we just forward the variadic args and
 * upcast to RedisReply. Each limiter instance gets its own key prefix.
 */
export function createRateLimitRedisStore(prefix: string): InstanceType<typeof RedisStore> {
   return new RedisStore({
      sendCommand: (...args: string[]) => redisClient.sendCommand(args) as Promise<RedisReply>,
      prefix,
   });
}
