import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

type TrendRow = {
  createdAt: Date;
  healthScore: number | null;
  language: string;
};

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  language: z.string().optional(),
  sortBy: z.enum(["date", "health", "language"]).default("date"),
});

const toOrderBy = (
  sortBy: "date" | "health" | "language",
): { createdAt: "desc" } | { healthScore: "desc" } | { language: "asc" } => {
  if (sortBy === "health") {
    return { healthScore: "desc" };
  }
  if (sortBy === "language") {
    return { language: "asc" };
  }
  return { createdAt: "desc" };
};

export const historyRouter = Router();

historyRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsedQuery = querySchema.parse(req.query);
    const skip = (parsedQuery.page - 1) * parsedQuery.limit;

    const where = {
      userId: req.user!.id,
      ...(parsedQuery.language ? { language: parsedQuery.language } : {}),
    };

    const [total, reviews, trendRows] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        orderBy: toOrderBy(parsedQuery.sortBy),
        skip,
        take: parsedQuery.limit,
      }),
      prisma.review.findMany({
        where: { userId: req.user!.id },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, healthScore: true, language: true },
      }),
    ]);

    res.status(200).json({
      page: parsedQuery.page,
      limit: parsedQuery.limit,
      total,
      reviews,
      trend: trendRows.map((row: TrendRow) => ({
        date: row.createdAt.toISOString(),
        healthScore: row.healthScore ?? 0,
        language: row.language,
      })),
    });
  }),
);
