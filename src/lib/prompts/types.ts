// src/lib/prompts/types.ts

// El contexto dinámico que viene de useNoraVision.ts y otros estados
export interface NoraContext {
  timeOfDay: string;       // ej: "10:30 AM"
  location: string;        // ej: "Ituzaingó, Corrientes"
  userName?: string;       // ej: "Javier"
  visionAlerts?: {
    clockPosition: string;
    distance: string;
    alertLevel: "info" | "warning" | "danger";
    description: string;
  }[];
  isDark?: boolean;
}

export type NoraMode = "executive" | "lazarillo" | "tea";

// El esquema estricto de la personalidad
export interface PromptProfile {
  id: NoraMode;
  systemDirective: string;
  // Reglas de formato y comportamiento específicas
  constraints: string[];
  // Parámetros óptimos sugeridos para el LLM
  parameters: {
    temperature: number;
    maxTokens: number;
  };
}
