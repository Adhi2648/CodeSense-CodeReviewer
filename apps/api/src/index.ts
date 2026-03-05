import cors from "cors";
import express from "express";
import session from "express-session";
import pg from "pg";
import passport from "passport";
import pinoHttp from "pino-http";
import connectPgSimple from "connect-pg-simple";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter, configurePassport } from "./routes/auth.js";
import { reviewRouter } from "./routes/review.js";
import { searchRouter } from "./routes/search.js";
import { historyRouter } from "./routes/history.js";
import { webhookRouter } from "./routes/webhook.js";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { startAnalysisWorker, registerAnalysisWorkerEvents } from "./workers/analysisWorker.js";

const app = express();
const PgSession = connectPgSimple(session);

app.use(pinoHttp({ logger }));
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    }
  })
);
app.use(express.urlencoded({ extended: true }));

const pool = new pg.Pool({
  connectionString: env.DATABASE_URL
});

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/review", reviewRouter);
app.use("/api/search", searchRouter);
app.use("/api/history", historyRouter);
app.use("/api/webhook", webhookRouter);

app.use(errorHandler);

const worker = startAnalysisWorker();
registerAnalysisWorkerEvents(worker);

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "CodeSense API server started");
});

const shutdown = async (): Promise<void> => {
  logger.info("Shutting down CodeSense API");
  server.close();
  await worker.close();
  await Promise.all([prisma.$disconnect(), redis.quit(), pool.end()]);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
