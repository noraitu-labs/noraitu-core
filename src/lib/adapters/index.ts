/**
 * @file index.ts
 * @module src/lib/adapters
 * @description Contratos y adaptadores unificados para proveedores de LLM (Groq, SambaNova, Ollama, WASM).
 * Garantiza un formato de respuesta estándar independiente del motor subyacente.
 */

import { SpatialAlert } from "@/hooks/useNoraVision";

export type SupportedModelProvider = "groq" | "sambanova" | "ollama" | "wasm";

export interface NormalizedLLMResponse {
  text: string;
  spatialAlerts?: {
    clockPosition: string;
    distance: string;
    alertLevel: "info" | "warning" | "danger";
  }[];
  suggestedActions?: string[];
  rawProvider?: SupportedModelProvider;
  latencyMs?: number;
}

export interface LLMRequestPayload {
  prompt: string;
  history?: { role: string; content: string }[];
  visualTelemetry?: string | null;
  imageBase64?: string | null;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMAdapter {
  providerName: SupportedModelProvider;
  isAvailable(): Promise<boolean>;
  generateResponse(payload: LLMRequestPayload): Promise<NormalizedLLMResponse>;
}

/**
 * Normaliza y limpia cualquier respuesta proveniente de modelos crudos:
 * Remueve etiquetas residuales como <thinking>, marcas de markdown no deseadas
 * y extrae alertas espaciales estructuradas si existen.
 */
export function normalizeModelOutput(
  rawText: string,
  provider: SupportedModelProvider,
  spatialAlerts?: SpatialAlert[]
): NormalizedLLMResponse {
  const cleanText = rawText
    .replace(/^Thinking:?\s*/i, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .trim();

  const formattedAlerts = spatialAlerts?.map((a) => ({
    clockPosition: a.clockPosition,
    distance: a.distance,
    alertLevel: a.alertLevel,
  }));

  return {
    text: cleanText,
    spatialAlerts: formattedAlerts,
    rawProvider: provider,
  };
}
