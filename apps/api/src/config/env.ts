import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://user:password@localhost:5432/codesense"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  GEMINI_API_KEY: z.string().min(1).default("local-dev-key"),
  GITHUB_CLIENT_ID: z.string().min(1).default("local-dev-client-id"),
  GITHUB_CLIENT_SECRET: z.string().min(1).default("local-dev-client-secret"),
  GITHUB_WEBHOOK_SECRET: z.string().min(1).default("local-dev-webhook-secret"),
  SESSION_SECRET: z.string().min(1).default("local-dev-session-secret"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3001)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const flattened = parsed.error.flatten();
  throw new Error(`Invalid environment variables: ${JSON.stringify(flattened.fieldErrors)}`);
}

export const env = parsed.data;
