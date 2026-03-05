import { randomUUID } from "node:crypto";
import { RateLimitResult } from "@codesense/shared";
import { redis } from "../lib/redis.js";

const LIMIT = 10;
const WINDOW_MS = 60 * 60 * 1000;

export const checkRateLimit = async (userId: string): Promise<RateLimitResult> => {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  const currentWindowBucket = now - (now % WINDOW_MS);
  const key = `ratelimit:${userId}:${currentWindowBucket}`;
  const member = `${now}:${randomUUID()}`;

  const transaction = redis.multi();
  transaction.zadd(key, now, member);
  transaction.zremrangebyscore(key, 0, windowStart);
  transaction.zcard(key);
  transaction.pexpire(key, WINDOW_MS * 2);
  const result = await transaction.exec();

  const count = Number(result?.[2]?.[1] ?? 0);
  const allowed = count <= LIMIT;

  if (!allowed) {
    await redis.zrem(key, member);
  }

  return {
    allowed,
    remaining: Math.max(0, LIMIT - (allowed ? count : count - 1)),
    resetAt: new Date(currentWindowBucket + WINDOW_MS)
  };
};
