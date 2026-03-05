import { SessionUser } from "./auth.js";

declare global {
  namespace Express {
    interface User extends SessionUser {}
    interface Request {
      rawBody?: Buffer;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    reviewStreams?: Record<string, boolean>;
  }
}

export {};
