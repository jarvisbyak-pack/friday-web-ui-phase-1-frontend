export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}

export interface GenerateResponse {
  text: string;
  provider: string;
  model: string;
}

export interface AiProvider {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}
