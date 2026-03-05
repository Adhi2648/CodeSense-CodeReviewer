import { Worker } from "bullmq";
import { ReviewJob, ReviewResult } from "@codesense/shared";
import { prisma } from "../lib/prisma.js";
import { redisConnection } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { ANALYSIS_QUEUE_NAME } from "../queues/analysisQueue.js";
import { parseFunctions } from "../services/astParser.js";
import { scoreComplexity } from "../services/complexityScorer.js";
import { chunkFunctions } from "../services/chunker.js";
import { embedChunks } from "../services/embeddings.js";
import { runReviewAgentWithStream } from "../services/reviewAgent.js";
import { emitStreamEvent } from "../services/streamHub.js";

const sendProgress = async (
  reviewId: string,
  job: { updateProgress: (value: number) => Promise<void> },
  step: string,
  percent: number
): Promise<void> => {
  await job.updateProgress(percent);
  emitStreamEvent(reviewId, "progress", { step, percent });
};

const ensureRepositoryId = async (payload: ReviewJob): Promise<string> => {
  if (payload.repositoryId) {
    return payload.repositoryId;
  }

  const repository = await prisma.repository.create({
    data: {
      userId: payload.userId,
      githubUrl: `local://review/${payload.reviewId}`,
      name: `snippet-${payload.reviewId.slice(0, 8)}`,
      language: payload.language
    }
  });

  return repository.id;
};

export const startAnalysisWorker = (): Worker<ReviewJob> =>
  new Worker<ReviewJob>(
    ANALYSIS_QUEUE_NAME,
    async (job): Promise<ReviewResult> => {
      const payload = job.data;
      const { reviewId, code, language } = payload;

      try {
        await sendProgress(reviewId, job, "queued", 0);
        await prisma.review.update({
          where: { id: reviewId },
          data: { status: "PROCESSING" }
        });

        const parsedFunctions = parseFunctions(code, language);
        await sendProgress(reviewId, job, "parse", 20);

        const complexity = scoreComplexity(parsedFunctions);
        await sendProgress(reviewId, job, "complexity", 40);

        const chunks = chunkFunctions(parsedFunctions);
        const repositoryId = await ensureRepositoryId(payload);
        const chunksWithRepository = chunks.map((chunk) => ({
          ...chunk,
          repositoryId
        }));
        await sendProgress(reviewId, job, "chunk", 60);

        await embedChunks(chunksWithRepository);
        await sendProgress(reviewId, job, "embed", 80);

        const reviewResult = await runReviewAgentWithStream(code, language, (token) => {
          emitStreamEvent(reviewId, "token", { text: token });
        });

        emitStreamEvent(reviewId, "findings", reviewResult.findings);

        await prisma.review.update({
          where: { id: reviewId },
          data: {
            repositoryId,
            status: "COMPLETED",
            findings: reviewResult.findings,
            refactored: reviewResult.refactored,
            healthScore: complexity.healthScore
          }
        });

        const completePayload = {
          ...reviewResult,
          healthScore: complexity.healthScore,
          complexity: complexity.functions
        };
        emitStreamEvent(reviewId, "complete", completePayload);

        await sendProgress(reviewId, job, "complete", 100);
        return reviewResult;
      } catch (error) {
        await prisma.review.update({
          where: { id: payload.reviewId },
          data: { status: "FAILED" }
        });

        emitStreamEvent(payload.reviewId, "error", {
          message: error instanceof Error ? error.message : "Unknown analysis worker error"
        });

        throw error;
      }
    },
    {
      ...redisConnection,
      concurrency: 3
    }
  );

export const registerAnalysisWorkerEvents = (worker: Worker<ReviewJob>): void => {
  worker.on("completed", (job) => {
    logger.info({ jobId: job?.id }, "Analysis job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Analysis job failed");
  });
};
