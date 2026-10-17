# 02 - Hooks de Negocio Desacoplados

Ubicación: `src/hooks/`

---

## 1. `useNoraVision.ts`
Gestiona el ciclo de vida de la cámara y la visión por computadora local.

### Responsabilidades:
* `startCamera(facingMode)` / `stopCamera()`: Inicialización segura de MediaStreams y limpieza de tracks en el desmontaje.
* `ensureCocoModel()`: Inyección dinámica en runtime de `@tensorflow/tfjs` y `@tensorflow-models/coco-ssd` vía scripts async sin impactar el bundle inicial de Next.js.
* `extractOpticalTelemetry(canvas)`:
  * Divide el fotograma en 3 bandas horizontales (izquierda, centro, derecha) para balance lateral.
  * Muestrea el tercio inferior (`y > h * 0.65`) con cálculo de gradiente de energía para alertar de desniveles, cables o bordes a nivel del suelo.
* `mapPredictionsToAlerts()`:
  * Mapea las coordenadas `bbox` a la **esfera del reloj**: `9 en punto`, `10 en punto`, `12 en punto`, `2 en punto`, `3 en punto`.
  * Calcula distancias métricas aproximadas: `< 1 metro (alcance inmediato)`, `~ 1.5 metros`, `> 2 metros`.

---

## 2. `useNoraAudio.ts`
Gestiona la captura de micrófono, el reconocimiento de voz (STT) y la síntesis vocal (TTS).

### Responsabilidades:
* `startRecording()`: Captura con `MediaRecorder` y selección adaptativa de MIME type (`audio/webm;codecs=opus` o fallback).
* `stopRecordingAndTranscribe()`: Envío del blob de audio a `/api/nora-transcribe` (Groq Whisper Turbo) con control de umbral mínimo de tamaño de audio.
* `speakText(text)`: Síntesis de voz con fallback ultra-rápido (0ms) a `window.speechSynthesis` (Web Speech API) configurada con acento `es-419` y desinfección total de caracteres markdown (`*`, `#`, `_`).
* Interfaz `AudioEngineAdapter`: Deja el contrato formal para enchufar librerías de inferencia local en WebAssembly (`@xenova/transformers`).

---

## 3. `useNoraChat.ts`
Orquesta el streaming conversacional y la reactividad de la memoria.

### Responsabilidades:
* Lectura progresiva mediante `ReadableStreamDefaultReader` con soporte de `AbortController`.
* Precarga no bloqueante de memoria histórica desde `/api/nora-memory` al montar el componente.
* Envío de telemetría y mensajes hacia `/api/nora-inference`.
* Persistencia dual *fire-and-forget* a `/api/noraitu-stream` (Neon Postgres) y `/api/nora-memory` (MongoDB Atlas).
* Filtro en caliente de etiquetas de pensamiento residuales (`<thinking>` o prefijos `Thinking:`).
