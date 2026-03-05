import { NextFunction, Request, Response } from "express";

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
    return;
  }

  next();
};
