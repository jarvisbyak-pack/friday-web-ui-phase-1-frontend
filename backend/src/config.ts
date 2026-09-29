import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(1000),
  WORKER_STALE_TASK_MS: z.coerce.number().int().positive().default(300000),
  AUTH_SESSION_DAYS: z.coerce.number().int().positive().max(30).default(7),
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash")
});

export const config = envSchema.parse(process.env);
