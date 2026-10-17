# 09 - Voice Activity Detection (VAD WebAssembly) y Barge-in

Ubicación: `src/hooks/useNoraVAD.ts`

---

## 🎯 Objetivo Arquitectural
Reemplazar los temporizadores fijos de silencio por un modelo neuronal ligero ejecutado en el cliente vía WebAssembly (`@ricky0123/vad-web` + `onnxruntime-web`), logrando:
1. **Detección milimétrica del cierre de frase**: No cortar al usuario durante pausas breves de reflexión (`redemptionMs: 600`).
2. **Interrupción natural ("Barge-in")**: Si Nora está hablando y el usuario comienza a hablar, la voz del altavoz se silencia de inmediato (`window.speechSynthesis.cancel()`).
3. **Audio PCM normalizado**: Generación directa de blobs WAV a 16 kHz listos para el STT Whisper sin desbordamientos de buffer.

---

## ⚙️ Configuración del Hook `useNoraVAD`

```ts
import { useNoraVAD } from "@/hooks/useNoraVAD";

const vad = useNoraVAD({
  positiveSpeechThreshold: 0.8, // Confianza para iniciar captura
  negativeSpeechThreshold: 0.4, // Confianza para detectar silencio
  redemptionMs: 600,            // Tolerancia de pausa reflexiva
  onSpeechStart: () => {
    // Barge-in: cancelación de voz instantánea
    window.speechSynthesis.cancel();
  },
  onSpeechEnd: (wavBlob) => {
    // Envío directo al pipeline de transcripción
    audio.transcribeAudioBlob(wavBlob);
  },
});
```
