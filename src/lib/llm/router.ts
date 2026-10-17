// src/lib/llm/router.ts
import { LLMAdapter, LLMRequestParams, UnifiedLLMResponse } from "./types";

export class NoraLLMRouter {
  private adapters: LLMAdapter[] = [];

  constructor(adapters: LLMAdapter[]) {
    this.adapters = adapters;
  }

  /**
   * Ejecuta la inferencia en cascada. Si el proveedor 1 falla (ej. límite gratuito de Groq),
   * salta inmediatamente al proveedor 2 (ej. SambaNova u Ollama local).
   */
  async routeInference(params: LLMRequestParams): Promise<UnifiedLLMResponse> {
    const errors: string[] = [];

    for (const adapter of this.adapters) {
      if (!adapter.isAvailable()) continue;

      const start = performance.now();
      try {
        const response = await adapter.generate(params);
        return {
          ...response,
          latencyMs: Math.round(performance.now() - start),
        };
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.warn(`[NoraRouter] Falló proveedor ${adapter.id}: ${errMsg}. Conmutando...`);
        errors.push(`${adapter.id}: ${errMsg}`);
        // Continúa automáticamente al siguiente adaptador en el bucle
      }
    }

    // Respuesta de emergencia en caso de corte total de internet y sin Ollama local activo
    return {
      text: "Estoy operando en modo desconectado de emergencia. Mis sensores ópticos siguen activos para asistirte.",
      spatialAlerts: [],
      suggestedActions: ["Reintentar conexión", "Verificar servidor local"],
      providerUsed: "fallback-emergency",
      latencyMs: 0,
    };
  }
}

/**
 * Helper para limpiar bloques <thinking> de modelos como Qwen/DeepSeek
 * y normalizar la salida al contrato UnifiedLLMResponse.
 */
export function sanitizeModelOutput(rawText: string): string {
  return rawText
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/^Thinking:?\s*/i, "")
    .trim();
}
