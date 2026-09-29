import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000")
});

export const config = envSchema.parse(process.env);
