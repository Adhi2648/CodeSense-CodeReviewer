import IORedis, { RedisOptions } from "ioredis";
import { env } from "../config/env.js";

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true
};

export const redis = new IORedis(env.REDIS_URL, redisOptions);
export const redisConnection = { connection: redis };
