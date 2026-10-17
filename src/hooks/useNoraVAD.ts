"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface NoraVADOptions {
  onSpeechStart?: () => void;
  onSpeechEnd?: (audioBlob: Blob) => void;
  onVADMisfire?: () => void;
  positiveSpeechThreshold?: number; // Umbral de confianza de voz (default: 0.8)
  negativeSpeechThreshold?: number; // Umbral de silencio (default: 0.4)
  redemptionMs?: number; // Milisegundos de tolerancia antes de cerrar la frase (default: 600)
  enabled?: boolean;
}

export interface NoraVADState {
  isListening: boolean;
  userSpeaking: boolean;
  isModelLoaded: boolean;
  error: string | null;
}

/**
 * useNoraVAD: Hook de Voice Activity Detection basado en WebAssembly (@ricky0123/vad-web + onnxruntime-web).
 * 
 * Capacidades:
 * - Detección neuronal milimétrica de inicio y fin de locución en el cliente (Edge).
 * - Soporte para "Barge-in": interrupción inmediata del altavoz cuando el usuario empieza a hablar.
 * - Evita cortes prematuros durante pausas de reflexión gracias a redemptionMs adaptativos.
 * - Exporta directamente audio PCM normalizado convertido a Blob (audio/wav).
 */
export function useNoraVAD(options: NoraVADOptions = {}) {
  const {
    onSpeechStart,
    onSpeechEnd,
    onVADMisfire,
    positiveSpeechThreshold = 0.8,
    negativeSpeechThreshold = 0.4,
    redemptionMs = 600,
    enabled = true,
  } = options;

  const [state, setState] = useState<NoraVADState>({
    isListening: false,
    userSpeaking: false,
    isModelLoaded: false,
    error: null,
  });

  const myvadRef = useRef<any>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Convierte Float32Array a un Blob WAV estándar
  const float32ToWavBlob = useCallback((audioData: Float32Array, sampleRate = 16000): Blob => {
    const buffer = new ArrayBuffer(44 + audioData.length * 2);
    const view = new DataView(buffer);

    // Escribir cabecera WAV
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + audioData.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size (16 para PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 para PCM)
    view.setUint16(22, 1, true); // NumChannels (Mono)
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * 2, true); // ByteRate
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, "data");
    view.setUint32(40, audioData.length * 2, true);

    // Escribir muestras PCM de 16 bits
    let offset = 44;
    for (let i = 0; i < audioData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, audioData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
  }, []);

  // Iniciar el listener de VAD en el navegador con guardas de concurrencia
  const startVAD = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (myvadRef.current) {
      try {
        await myvadRef.current.start();
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, isListening: true, error: null }));
        }
      } catch (err: any) {
        console.warn("[useNoraVAD] Error reanudando VAD:", err?.message || err);
      }
      return;
    }

    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    try {
      const { MicVAD } = await import("@ricky0123/vad-web");

      const vad = await MicVAD.new({
        positiveSpeechThreshold,
        negativeSpeechThreshold,
        redemptionMs,
        onSpeechStart: () => {
          if (!isMountedRef.current) return;
          setState((prev) => ({ ...prev, userSpeaking: true }));
          // Interrupción inmediata de la voz de Nora (Barge-in / 0ms)
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          if (onSpeechStart) onSpeechStart();
        },
        onSpeechEnd: (audio: Float32Array) => {
          if (!isMountedRef.current) return;
          setState((prev) => ({ ...prev, userSpeaking: false }));
          const wavBlob = float32ToWavBlob(audio, 16000);
          if (onSpeechEnd) onSpeechEnd(wavBlob);
        },
        onVADMisfire: () => {
          if (!isMountedRef.current) return;
          setState((prev) => ({ ...prev, userSpeaking: false }));
          if (onVADMisfire) onVADMisfire();
        },
      });

      // Si el componente se desmontó mientras se resolvía MicVAD.new, liberar recursos
      if (!isMountedRef.current) {
        vad.destroy();
        return;
      }

      myvadRef.current = vad;
      await vad.start();

      setState({
        isListening: true,
        userSpeaking: false,
        isModelLoaded: true,
        error: null,
      });
    } catch (err: any) {
      console.warn("[useNoraVAD] No se pudo inicializar VAD WebAssembly:", err?.message || err);
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          isListening: false,
          error: err?.message || "Error al inicializar VAD",
        }));
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [
    positiveSpeechThreshold,
    negativeSpeechThreshold,
    redemptionMs,
    onSpeechStart,
    onSpeechEnd,
    onVADMisfire,
    float32ToWavBlob,
  ]);

  // Pausar el listener de VAD
  const pauseVAD = useCallback(() => {
    if (myvadRef.current) {
      myvadRef.current.pause();
      setState((prev) => ({ ...prev, isListening: false, userSpeaking: false }));
    }
  }, []);

  // Destruir el listener al desmontar
  const destroyVAD = useCallback(() => {
    if (myvadRef.current) {
      myvadRef.current.destroy();
      myvadRef.current = null;
      setState({
        isListening: false,
        userSpeaking: false,
        isModelLoaded: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (enabled) {
      startVAD().catch(() => {});
    } else {
      pauseVAD();
    }

    return () => {
      isMountedRef.current = false;
      destroyVAD();
    };
  }, [enabled, startVAD, pauseVAD, destroyVAD]);

  return {
    ...state,
    startVAD,
    pauseVAD,
    destroyVAD,
  };
}
