import { config } from "../config.js";
import { GeminiProvider } from "./gemini-provider.js";
import type { AiProvider } from "./types.js";

export function createAiProvider(): AiProvider {
  if (config.AI_PROVIDER === "gemini") {
    if (!config.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER=gemini.");
    }
    return new GeminiProvider(config.GEMINI_API_KEY, config.GEMINI_MODEL);
  }

  throw new Error(`Unsupported AI provider: ${config.AI_PROVIDER}`);
}
