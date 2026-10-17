# 04 - Contrato de Adaptadores LLM (Router)

Ubicación: `src/lib/adapters/index.ts`

---

## 🎯 Propósito del Adaptador
Blindar el núcleo de la aplicación frente a cambios en los proveedores de nube (Groq, SambaNova, Ollama, Transformers.js). Si un modelo cambia de nombre, se da de baja o se migra a inferencia local WebAssembly, el frontend no sufre cambios.

---

## 📑 Interfaz Estandarizada `NormalizedLLMResponse`

Toda llamada a cualquier modelo devuelve exactamente esta estructura predecible:

```ts
export interface NormalizedLLMResponse {
  text: string;
  spatialAlerts?: {
    clockPosition: string;
    distance: string;
    alertLevel: "info" | "warning";
  }[];
  suggestedActions?: string[];
  rawProvider?: "groq" | "sambanova" | "ollama" | "wasm";
  latencyMs?: number;
}
```

---

## 🧹 Función de Normalización `normalizeModelOutput()`
* Remueve automáticamente etiquetas `<thinking>` generadas por modelos de razonamiento (DeepSeek-R1, Qwen 2.5/3, etc.).
* Elimina prefijos parásitos `"Thinking:"` o advertencias innecesarias.
* Estructura las alertas espaciales detectadas por la cámara para que los componentes visuales o de audio puedan resaltarlas al usuario.
