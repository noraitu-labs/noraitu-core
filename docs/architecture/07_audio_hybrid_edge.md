# 07 - Optimización Zero-Weight Hybrid Edge en useNoraAudio

Ubicación: `src/hooks/useNoraAudio.ts`

---

## 🎯 Fundamento de Diseño Académico e Industrial (UTN / UNAHUR / UNNE)
Se descartó el empaquetado de modelos ONNX o pipelines pesados en WebAssembly (`@xenova/transformers`) debido a:
1. **Sobrecarga de Red y Bundle**: Evitar descargas de 40 MB a 150 MB en redes móviles de baja conectividad.
2. **Consumo de Memoria RAM**: Prevenir bloqueos del navegador en dispositivos de recursos limitados.
3. **Latencia Cero**: Aprovechar las capacidades nativas ya optimizadas por el hardware del dispositivo.

---

## 🛠️ Arquitectura Implementada

### 1. STT Dual Resiliente en Cascada
* **Motor Primario (Cloud)**: Envío del flujo de audio a `/api/nora-transcribe` (Groq Whisper Turbo) con un `AbortController` de **timeout estricto de 4000ms**.
* **Motor de Respaldo Instantáneo (Edge Nativo)**:
  * Al pulsar el botón de grabación, se activa en segundo plano y en paralelo `window.SpeechRecognition` / `window.webkitSpeechRecognition` configurado en `es-AR` / `es-419`.
  * Si el motor en la nube falla por caída de conexión, error de red o límite de cuota (Rate Limit 429), o si excede los 4000ms, el hook conmuta en **0ms** al buffer capturado por el motor nativo del dispositivo.

### 2. TTS Humano con Calibración Acústica Adaptativa
En lugar de voces robóticas genéricas, se implementó el selector inteligente `selectBestNaturalVoice()` que prioriza:
1. Voces neuronales naturales en línea: `"Natural"`, `"Online"`, con dialectos `es-AR`, `es-419`, `es-MX`.
2. Voces expressivas: `"Sabina"`, `"Elena"`, `"Paulina"`, `"Google español"`.

#### Calibración por Modo Cognitivo:
| Modo | Velocidad (`rate`) | Tono (`pitch`) | Razón de Diseño |
| :--- | :--- | :--- | :--- |
| **Lazarillo** | `1.15` | `1.02` | Agilidad e inmediatez máxima para alertas espaciales y obstáculos físicos. |
| **TEA** | `0.90` | `0.98` | Articulación pausada y clara para prevenir sobrecarga sensorial. |
| **Executive** | `1.05` | `1.00` | Tono cálido, distinguido y profesional de recepcionista de 5 estrellas. |

### 3. Telemetría de Audio Expuesta
El hook expone `activeEngine: "cloud-whisper" | "native-edge"` en tiempo real. La barra superior (`NoraHeader.tsx`) muestra un badge dinámico que indica con total transparencia académica qué motor está procesando la voz en cada momento.
