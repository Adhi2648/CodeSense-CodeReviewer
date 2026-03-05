import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { semanticSearch } from "../services/vectorSearch.js";

const searchSchema = z.object({
  query: z.string().min(1),
  repositoryId: z.string().min(1)
});

export const searchRouter = Router();

searchRouter.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { query, repositoryId } = searchSchema.parse(req.body);
    const topK = 5;
    const results = await semanticSearch(query, repositoryId, topK);
    res.status(200).json({ results });
  })
);
