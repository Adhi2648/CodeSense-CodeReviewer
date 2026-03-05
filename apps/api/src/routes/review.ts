import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { analysisQueue } from "../queues/analysisQueue.js";
import { requireAuth } from "../middleware/auth.js";
import { reviewRateLimitMiddleware } from "../middleware/rateLimit.js";
import { registerStreamClient, unregisterStreamClient } from "../services/streamHub.js";

const createReviewSchema = z.object({
  code: z.string().min(1),
  language: z.string().min(1),
  repositoryId: z.string().optional()
});

export const reviewRouter = Router();

reviewRouter.post(
  "/",
  requireAuth,
  reviewRateLimitMiddleware,
  asyncHandler(async (req, res) => {
    const parsedBody = createReviewSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
      return;
    }

    const review = await prisma.review.create({
      data: {
        userId,
        repositoryId: parsedBody.repositoryId,
        code: parsedBody.code,
        language: parsedBody.language,
        status: "PENDING"
      }
    });

    const job = await analysisQueue.add("analysis", {
      reviewId: review.id,
      code: parsedBody.code,
      language: parsedBody.language,
      userId,
      repositoryId: parsedBody.repositoryId
    });

    await prisma.review.update({
      where: { id: review.id },
      data: { jobId: String(job.id) }
    });

    res.status(202).json({ reviewId: review.id, jobId: String(job.id) });
  })
);

reviewRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      }
    });

    if (!review) {
      res.status(404).json({ error: "Review not found", code: "REVIEW_NOT_FOUND" });
      return;
    }

    res.status(200).json(review);
  })
);

reviewRouter.get(
  "/:id/stream",
  requireAuth,
  asyncHandler(async (req, res) => {
    const review = await prisma.review.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id
      },
      select: { id: true, status: true, findings: true, refactored: true, healthScore: true }
    });

    if (!review) {
      res.status(404).json({ error: "Review not found", code: "REVIEW_NOT_FOUND" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    res.write(
      `event: progress\ndata: ${JSON.stringify({
        step: "connected",
        percent: review.status === "COMPLETED" ? 100 : 0
      })}\n\n`
    );

    if (review.status === "COMPLETED") {
      res.write(`event: findings\ndata: ${JSON.stringify(review.findings ?? [])}\n\n`);
      res.write(
        `event: complete\ndata: ${JSON.stringify({
          findings: review.findings ?? [],
          refactored: review.refactored ?? "",
          summary: "",
          healthScore: review.healthScore ?? 0
        })}\n\n`
      );
      res.end();
      return;
    }

    registerStreamClient(review.id, res);

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: {}\n\n`);
    }, 15000);

    req.on("close", () => {
      clearInterval(keepAlive);
      unregisterStreamClient(review.id, res);
      res.end();
    });
  })
);
