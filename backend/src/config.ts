import "dotenv/config";
import { z } from "zod";

const booleanEnv = z.enum(["true", "false"]).default("false").transform(value => value === "true");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(1000),
  WORKER_STALE_TASK_MS: z.coerce.number().int().positive().default(300000),
  AUTH_SESSION_DAYS: z.coerce.number().int().positive().max(30).default(7),
  FILE_STORAGE_DIR: z.string().min(1).default("./storage"),
  FILE_MAX_BYTES: z.coerce.number().int().positive().max(52428800).default(10485760),
  CODE_WORKSPACE_ROOT: z.string().min(1).default("."),
  CODE_ALLOWED_COMMANDS: z.string().default("npm test,npm run build"),
  CODE_COMMAND_TIMEOUT_MS: z.coerce.number().int().positive().max(600000).default(120000),
  CODE_MAX_OUTPUT_BYTES: z.coerce.number().int().positive().max(5000000).default(500000),
  FRIDAY_ALLOW_CODE_EXECUTION: booleanEnv,
  AI_PROVIDER: z.enum(["gemini"]).default("gemini"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_API_URL: z.string().url().default("https://api.github.com"),
  FRIDAY_ALLOW_GITHUB_MUTATIONS: booleanEnv
});

export const config = envSchema.parse(process.env);
