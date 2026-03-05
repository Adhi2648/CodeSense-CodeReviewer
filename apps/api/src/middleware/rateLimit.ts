import { NextFunction, Request, Response } from "express";
import { checkRateLimit } from "../services/rateLimiter.js";

export const reviewRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
      return;
    }

    const limit = await checkRateLimit(req.user.id);

    res.setHeader("X-RateLimit-Remaining", String(limit.remaining));
    res.setHeader("X-RateLimit-Reset", limit.resetAt.toISOString());

    if (!limit.allowed) {
      res.status(429).json({
        error: "Rate limit exceeded. Maximum 10 review requests per hour.",
        code: "RATE_LIMIT_EXCEEDED"
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
