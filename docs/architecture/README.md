# Documentación de Arquitectura: Nora Itu Core (Refactorización Modular)

Este directorio contiene la documentación técnica estructurada para desarrolladores y colaboradores open-source del ecosistema **Nora Itu Core**.

---

## 🗂️ Índice de Secciones

1. [01 - Visión y Arquitectura General](./01_arquitectura_general.md)
   * Principios rectores: Desacoplamiento, Cero Costo, Edge-First y Resiliencia Asíncrona.
   * Diagrama de flujo de datos y orquestación.

2. [02 - Hooks de Negocio (Fase 1)](./02_hooks_desacoplados.md)
   * `useNoraVision`: Captura óptica, gradiente de energía de piso y COCO-SSD con esfera del reloj.
   * `useNoraAudio`: STT con Groq Whisper, fallback nativo a Web Speech API y contratos WebAssembly.
   * `useNoraChat`: Orquestador de streaming, reactividad local y persistencia dual *fire-and-forget*.

3. [03 - Motor de Prompts y Personalidad (Fase 2)](./03_motor_prompts.md)
   * Centralización de directivas en `src/lib/prompts/index.ts`.
   * Perfil Recepcionista de Clase Mundial (español neutro).
   * Modos Inclusivos: TEA y Lazarillo (datos métricos y horarios exactos).

4. [04 - Contrato de Adaptadores LLM (Fase 3)](./04_adaptador_llm.md)
   * Interfaz estandarizada `LLMAdapter` en `src/lib/adapters/index.ts`.
   * Normalización de payloads para Groq, SambaNova, Ollama y Transformers.js (WASM).

5. [05 - Capa de Presentación: Page.tsx (Fase 4)](./05_orquestacion_ui.md)
   * Transformación del monolito en una vista pura de orquestación y renderizado.
   * Reducción drástica del tamaño del bundle y aislamiento del ciclo de vida.
