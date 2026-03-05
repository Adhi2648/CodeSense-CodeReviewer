import { Queue, Worker } from "bullmq";
import { CodeChunk } from "@codesense/shared";
import { redisConnection } from "../lib/redis.js";
import { embedChunks } from "../services/embeddings.js";

export interface EmbeddingJob {
  chunks: CodeChunk[];
}

export const EMBEDDING_QUEUE_NAME = "code-embedding";
export const embeddingQueue = new Queue<EmbeddingJob>(EMBEDDING_QUEUE_NAME, redisConnection);

export const startEmbeddingWorker = (): Worker<EmbeddingJob> =>
  new Worker<EmbeddingJob>(
    EMBEDDING_QUEUE_NAME,
    async (job): Promise<void> => {
      await embedChunks(job.data.chunks);
    },
    {
      ...redisConnection,
      concurrency: 3
    }
  );
