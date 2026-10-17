# 01 - Visión y Arquitectura General

## 🎯 Objetivo del Sistema
**Nora Itu Core** es un asistente conversacional, pedagógico y de asistencia visual de código abierto diseñado para operar con **latencia ultra-baja**, **cero costo operativo recurrente** y **tolerancia total a fallos**.

---

## 🏛️ Principios de Diseño

1. **Edge-First & Inferencia en el Cliente**:
   * Las operaciones de visión por computadora (procesamiento matricial de píxeles, luminancia, detección de piso y reconocimiento de objetos con COCO-SSD) se ejecutan estrictamente en el navegador del usuario utilizando WebAssembly y Web Workers.
   * Esto garantiza privacidad absoluta (no se transmiten videos continuos al servidor) y reduce los costos de red a cero.

2. **Desacoplamiento Estricto**:
   * La interfaz gráfica (`src/app/page.tsx`) desconoce la implementación interna del audio, la cámara o la conexión de red. Se limita a orquestar custom hooks especializados.

3. **Persistencia No Bloqueante (*Fire-and-Forget*)**:
   * Las lecturas de memoria y las escrituras en MongoDB Atlas y Neon PostgreSQL ocurren de forma asíncrona en segundo plano sin detener ni retrasar el streaming de la respuesta para el usuario.

---

## 🔄 Diagrama de Flujo de Datos

```mermaid
graph TD
    User([Usuario / Dispositivo]) <--> UI[Página Principal: src/app/page.tsx]
    
    subgraph Custom Hooks (src/hooks/)
        UI <--> HookVision[useNoraVision]
        UI <--> HookAudio[useNoraAudio]
        UI <--> HookChat[useNoraChat]
    end

    subgraph Procesamiento en el Borde (Client Edge)
        HookVision --> CanvasSampler[Análisis de Luminancia y Bordes]
        HookVision --> LocalCoco[TensorFlow.js + COCO-SSD Lite]
        HookAudio --> LocalTTS[Web Speech API nativo: es-419]
    end

    subgraph Backend & Cloud Inferencia (/api/)
        HookChat --> NoraInference[/api/nora-inference/]
        HookAudio --> NoraTranscribe[/api/nora-transcribe: Whisper/]
        NoraInference --> PromptEngine[src/lib/prompts/index.ts]
        NoraInference --> LLMAdapters[src/lib/adapters/index.ts]
    end

    subgraph Persistencia Asíncrona (Segundo Plano)
        HookChat -.->|fire-and-forget| Mongo[MongoDB Atlas: nora_messages]
        HookChat -.->|fire-and-forget| Neon[Neon Postgres: session logs]
    end
```
