# 08 - Optimización Institucional y Blindaje de Latencia

Ubicación: `src/hooks/useNoraChat.ts`, `src/lib/prompts/index.ts`, `src/hooks/useNoraAudio.ts`

---

## 🎯 Criterios Institucionales (Evaluación UTN / UNAHUR / UNNE)
Se implementaron tres optimizaciones críticas requeridas para despliegues de alto rendimiento y grado académico:

---

## 1. Ventana de Contexto Deslizante (Sliding Window)
* **Problema resuelto**: En sesiones prolongadas de aula o laboratorios, el historial acumulaba docenas de mensajes, incrementando el tamaño del prompt, el costo de inferencia y la latencia por encima del umbral tolerable.
* **Solución**:
  * En `useNoraChat.ts`, el payload enviado al endpoint `/api/nora-inference` mantiene estrictamente los **últimos 6 mensajes** (`slice(-6)`).
  * El historial completo anterior se descarga y persiste en segundo plano de forma asíncrona hacia MongoDB Atlas (`/api/nora-memory`) y Neon PostgreSQL (`/api/noraitu-stream`).
  * En el endpoint `/api/nora-inference/route.ts`, si el modo activo es `lazarillo`, el historial se omite por completo (`history: []`), garantizando que la inferencia espacial compute únicamente el fotograma actual con latencias **< 350ms**.

---

## 2. Blindaje Absoluto de Identidad Institucional
* **Ubicación**: `src/lib/prompts/index.ts` (`NoraProfiles.executive`).
* **Regla estricta inquebrantable**:
  * Queda **terminantemente prohibido** mencionar arquitecturas, proveedores de inferencia (Groq, Ollama, OpenAI o similares), tokens o implementaciones técnicas de bajo nivel.
  * Respuestas sobre origen o propósito humano y académico:
    > *"Soy Nora, un asistente cognitivo multimodal desarrollado para el ámbito académico e institucional, y estoy aquí para acompañarte y facilitarte lo que necesites."*
  * Se suprimen todas las negativas defensivas o discursos corporativos acartonados.

---

## 3. Preparación de la Interfaz para Voice Activity Detection (VAD)
* **Ubicación**: `src/hooks/useNoraAudio.ts`.
* **Eventos desacoplados expuestos**:
  * `onSpeechStart`: Notifica el inicio de la modulación vocal.
  * `onSpeechEnd`: Notifica el cese de voz en el flujo continuo.
* **Beneficio**: Desacopla la lógica de silencio rígido basada en temporizadores de MediaRecorder, dejando la arquitectura lista para enchufar un detector de actividad de voz (VAD) basado en WebAssembly en la siguiente fase sin alterar la UI ni el hook de chat.
