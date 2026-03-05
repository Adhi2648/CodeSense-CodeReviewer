import { Queue, QueueEvents } from "bullmq";
import { ReviewJob } from "@codesense/shared";
import { redisConnection } from "../lib/redis.js";

export const ANALYSIS_QUEUE_NAME = "code-analysis";

export const analysisQueue = new Queue<ReviewJob>(ANALYSIS_QUEUE_NAME, redisConnection);
export const analysisQueueEvents = new QueueEvents(ANALYSIS_QUEUE_NAME, redisConnection);
