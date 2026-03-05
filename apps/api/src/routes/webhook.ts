import crypto from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { analysisQueue } from "../queues/analysisQueue.js";

const pullRequestWebhookSchema = z.object({
  action: z.string(),
  sender: z
    .object({
      id: z.number(),
      login: z.string(),
      avatar_url: z.string().optional()
    })
    .optional(),
  repository: z
    .object({
      html_url: z.string(),
      name: z.string(),
      language: z.string().optional()
    })
    .optional(),
  pull_request: z
    .object({
      title: z.string().optional(),
      body: z.string().nullable().optional()
    })
    .optional()
});

const supportedActions = new Set(["opened", "synchronize", "reopened"]);

const verifyWebhookSignature = (rawBody: Buffer | undefined, signature: string | undefined): boolean => {
  if (!rawBody || !signature) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", env.GITHUB_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const expected = `sha256=${digest}`;
  if (expected.length !== signature.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

export const webhookRouter = Router();

webhookRouter.post("/github", async (req, res, next) => {
  try {
    const signature = req.header("X-Hub-Signature-256");
    const isValid = verifyWebhookSignature(req.rawBody, signature);

    if (!isValid) {
      res.status(401).json({ error: "Invalid webhook signature", code: "INVALID_SIGNATURE" });
      return;
    }

    if (req.header("X-GitHub-Event") !== "pull_request") {
      res.status(200).json({ ok: true });
      return;
    }

    const payload = pullRequestWebhookSchema.parse(req.body);
    if (!supportedActions.has(payload.action)) {
      res.status(200).json({ ok: true });
      return;
    }

    if (!payload.sender || !payload.repository) {
      res.status(200).json({ ok: true });
      return;
    }

    const user = await prisma.user.upsert({
      where: { githubId: String(payload.sender.id) },
      update: {
        username: payload.sender.login,
        avatarUrl: payload.sender.avatar_url ?? null
      },
      create: {
        githubId: String(payload.sender.id),
        username: payload.sender.login,
        avatarUrl: payload.sender.avatar_url ?? null
      }
    });

    const existingRepository = await prisma.repository.findFirst({
      where: {
        userId: user.id,
        name: payload.repository.name
      }
    });

    const repository = existingRepository
      ? await prisma.repository.update({
          where: { id: existingRepository.id },
          data: {
            githubUrl: payload.repository.html_url,
            language: payload.repository.language ?? null
          }
        })
      : await prisma.repository.create({
          data: {
            userId: user.id,
            githubUrl: payload.repository.html_url,
            name: payload.repository.name,
            language: payload.repository.language ?? null
          }
        });

    const code = [
      `# PR: ${payload.pull_request?.title ?? "Untitled PR"}`,
      payload.pull_request?.body ?? "",
      "# Note",
      "Webhook payload does not include full file patch body by default.",
      "A GitHub App token-based fetch can be added to pull changed files in production."
    ].join("\n\n");

    const language = (repository.language ?? "javascript").toLowerCase();

    const review = await prisma.review.create({
      data: {
        userId: user.id,
        repositoryId: repository.id,
        code,
        language,
        status: "PENDING"
      }
    });

    const job = await analysisQueue.add("webhook-pr-analysis", {
      reviewId: review.id,
      code,
      language,
      userId: user.id,
      repositoryId: repository.id
    });

    await prisma.review.update({
      where: { id: review.id },
      data: { jobId: String(job.id) }
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});
