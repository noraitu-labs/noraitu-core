// src/lib/llm/adapters/ollamaAdapter.ts
import { LLMAdapter, LLMRequestParams, UnifiedLLMResponse } from "../types";
import { sanitizeModelOutput } from "../router";

export class OllamaAdapter implements LLMAdapter {
  id: UnifiedLLMResponse["providerUsed"] = "ollama-local";
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    const defaultLocal = process.env.NODE_ENV === "development" && process.env.ENABLE_LOCAL_OLLAMA === "true" ? "http://localhost:11434" : "";
    this.baseUrl = (process.env.OLLAMA_TUNNEL_URL || process.env.OLLAMA_BASE_URL || defaultLocal).trim();
    this.defaultModel = process.env.OLLAMA_MODEL?.trim() || "llama3.2";
  }

  isAvailable(): boolean {
    // Si no está explícitamente deshabilitado por variable de entorno, se considera elegible
    return process.env.DISABLE_OLLAMA !== "true" && Boolean(this.baseUrl);
  }

  async generate(params: LLMRequestParams): Promise<UnifiedLLMResponse> {
    const { systemPrompt, userMessage, history = [], temperature } = params;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: userMessage },
    ];

    const controller = new AbortController();
    // Timeout corto de 3000ms para no demorar al usuario si Ollama no está corriendo localmente
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.defaultModel,
          messages,
          stream: false,
          options: {
            temperature,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Ollama local respondió con status ${res.status}`);
      }

      const data = await res.json();
      const rawText = data?.message?.content || "";
      const cleanText = sanitizeModelOutput(rawText);

      return {
        text: cleanText,
        providerUsed: "ollama-local",
        latencyMs: 0,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw new Error(`Ollama no alcanzable en ${this.baseUrl}: ${err?.message || err}`);
    }
  }
}
