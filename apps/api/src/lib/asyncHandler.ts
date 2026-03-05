import { NextFunction, Request, Response } from "express";

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler =
  (handler: AsyncRoute) =>
  (req: Request, res: Response, next: NextFunction): void => {
    void handler(req, res, next).catch(next);
  };
