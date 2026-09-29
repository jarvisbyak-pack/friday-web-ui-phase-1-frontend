import type { GenerateRequest, GenerateResponse } from "./types.js";
import { createAiProvider } from "./provider.js";

export class AiService {
  private readonly provider = createAiProvider();

  generate(request: GenerateRequest): Promise<GenerateResponse> {
    return this.provider.generate(request);
  }
}
