// src/lib/llm/adapters/groqAdapter.ts
import Groq from "groq-sdk";
import { LLMAdapter, LLMRequestParams, UnifiedLLMResponse } from "../types";
import { sanitizeModelOutput } from "../router";

export class GroqAdapter implements LLMAdapter {
  id: UnifiedLLMResponse["providerUsed"] = "groq";
  private client: Groq | null = null;
  private candidateModels = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
  ];

  constructor() {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (apiKey) {
      this.client = new Groq({ apiKey });
    }
  }

  isAvailable(): boolean {
    return Boolean(this.client && process.env.GROQ_API_KEY?.trim());
  }

  async generate(params: LLMRequestParams): Promise<UnifiedLLMResponse> {
    if (!this.client) {
      throw new Error("Cliente Groq no inicializado o sin API Key.");
    }

    const { systemPrompt, userMessage, history = [], temperature, maxTokens } = params;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: userMessage },
    ];

    let lastError: any = null;

    // Rotación interna de modelos autorizados por si alguno entra en rate limit o es dado de baja
    for (const model of this.candidateModels) {
      try {
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });

        const rawText = response.choices[0]?.message?.content || "";
        const cleanText = sanitizeModelOutput(rawText);

        return {
          text: cleanText,
          providerUsed: "groq",
          latencyMs: 0, // El router calcula la latencia total
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[GroqAdapter] Modelo ${model} falló:`, err?.message || err);
        // Continuar al siguiente modelo en candidateModels
      }
    }

    throw lastError || new Error("Todos los modelos de Groq candidatos fallaron.");
  }
}
