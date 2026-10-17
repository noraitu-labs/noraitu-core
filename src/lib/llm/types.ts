// src/lib/llm/types.ts
import { NoraMode } from "../prompts/types";

export interface SpatialAlertPayload {
  clockPosition: string;
  distance: string;
  alertLevel: "info" | "warning" | "danger";
}

// El contrato de salida inmutable que consume el frontend
export interface UnifiedLLMResponse {
  text: string;
  spatialAlerts?: SpatialAlertPayload[];
  suggestedActions?: string[];
  providerUsed: "groq" | "sambanova" | "ollama-local" | "fallback-emergency";
  latencyMs: number;
}

export interface LLMRequestParams {
  systemPrompt: string;
  userMessage: string;
  history?: { role: "user" | "assistant"; content: string }[];
  temperature: number;
  maxTokens: number;
  mode: NoraMode;
  imageBase64?: string | null;
  visualTelemetry?: string | null;
}

// Todo proveedor (nube o local) debe cumplir este contrato
export interface LLMAdapter {
  id: UnifiedLLMResponse["providerUsed"];
  isAvailable(): boolean;
  generate(params: LLMRequestParams): Promise<UnifiedLLMResponse>;
}
