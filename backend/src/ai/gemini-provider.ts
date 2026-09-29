import type { AiProvider, GenerateRequest, GenerateResponse } from "./types.js";

export class GeminiProvider implements AiProvider {
  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string
  ) {}

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const model = request.model ?? this.defaultModel;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: request.messages
            .filter(message => message.role !== "system")
            .map(message => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }]
            })),
          systemInstruction: request.messages.find(message => message.role === "system")
            ? {
                parts: [
                  {
                    text: request.messages.find(message => message.role === "system")?.content ?? ""
                  }
                ]
              }
            : undefined,
          generationConfig:
            request.temperature === undefined ? undefined : { temperature: request.temperature }
        })
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${detail.slice(0, 1000)}`);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map(part => part.text ?? "").join("") ?? "";

    if (!text) {
      throw new Error("Gemini returned no generated text.");
    }

    return { text, provider: "gemini", model };
  }
}
