# 06 - Router y Adaptadores LLM (Fase 3)

Ubicación: `src/lib/llm/`

---

## 🎯 Objetivo de la Fase 3
Eliminar el acoplamiento rígido con el SDK de Groq o cualquier proveedor cloud individual, permitiendo conmutar en 0ms entre:
1. **Groq Cloud (LPU)**: Con rotación de modelos si uno cae en Rate Limit o es dado de baja (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `llama-3.3-70b-versatile`).
2. **Ollama Local**: Para inferencia local (offline) sin costo en `http://localhost:11434` con timeout de 3000ms (*fail-fast*).
3. **Emergency Fallback**: Modo desconectado seguro si no hay internet ni servidor local activo.

---

## 📁 Archivos Implementados

### 1. `src/lib/llm/types.ts`
Define el contrato unificado:
* `UnifiedLLMResponse`: Payload estándar con `text`, `spatialAlerts`, `suggestedActions`, `providerUsed` y `latencyMs`.
* `LLMRequestParams`: Entrada estricta generada por `buildSystemPrompt`.
* Interfaz `LLMAdapter`:
  ```ts
  export interface LLMAdapter {
    id: UnifiedLLMResponse["providerUsed"];
    isAvailable(): boolean;
    generate(params: LLMRequestParams): Promise<UnifiedLLMResponse>;
  }
  ```

### 2. `src/lib/llm/adapters/groqAdapter.ts`
* Consume `groq-sdk` de forma segura.
* Si el modelo primario falla, itera transparentemente por los modelos autorizados en la cuenta sin arrojar error al usuario.
* Desinfecta etiquetas de razonamiento (`<think>` y `<thinking>`) antes de emitir respuesta.

### 3. `src/lib/llm/adapters/ollamaAdapter.ts`
* Conecta con la API local de Ollama (`/api/chat`).
* Usa un `AbortController` con timeout de 3000ms para no demorar la experiencia del usuario si Ollama no está encendido en esa máquina.

### 4. `src/lib/llm/router.ts`
* Orquesta la cascada de proveedores:
  ```ts
  const llmRouter = new NoraLLMRouter([
    new GroqAdapter(),
    new OllamaAdapter(),
  ]);
  ```
* Sanitiza salidas de texto plano con `sanitizeModelOutput()`.
* Mide la latencia real en milisegundos (`latencyMs`).

### 5. `/api/nora-inference/route.ts`
* Refactorizado para utilizar `buildSystemPrompt(mode, context)` (Fase 2) y `llmRouter.routeInference(params)` (Fase 3).
* Mantiene la persistencia asíncrona dual (*fire-and-forget*) a Neon PostgreSQL y MongoDB Atlas.
