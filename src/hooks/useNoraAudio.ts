"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { NoraMode } from "@/lib/prompts/types";

export type AudioEngineType = "cloud-whisper" | "native-edge";

export interface NoraAudioState {
  isRecording: boolean;
  isTranscribing: boolean;
  isSpeaking: boolean;
  activeEngine: AudioEngineType;
  transcript: string;
  error: string | null;
}

export interface UseNoraAudioOptions {
  onTranscriptionComplete?: (text: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  defaultMode?: NoraMode;
}

/**
 * useNoraAudio: Hook de Grado Industrial "Zero-Weight Hybrid Edge".
 * 
 * 1. STT Dual Resiliente:
 *    - Primario: /api/nora-transcribe (Groq Whisper Turbo) con timeout estricto de 4000ms.
 *    - Respaldo Instantáneo (0 MB / Costo Cero): Web Speech API (window.SpeechRecognition / webkitSpeechRecognition)
 *      configurado en es-AR / es-419 ante fallas de red, rate limit (429) o latencia.
 * 
 * 2. TTS Humano Adaptativo:
 *    - Prioriza voces neuronales locales/naturales (Google español, Microsoft Sabina/Elena/Natural Online).
 *    - Calibración por modo: "lazarillo" (ágil y directo: rate 1.15), "tea" (pausado y nítido: rate 0.90, pitch 0.98),
 *      "executive" (armónico y cálido: rate 1.05).
 * 
 * 3. Telemetría de Motor y Preparación VAD (Voice Activity Detection):
 *    - Expone activeEngine ("cloud-whisper" | "native-edge").
 *    - Dispara onSpeechStart y onSpeechEnd desacoplados para fácil reemplazo por VAD WASM.
 */
export function useNoraAudio(options: UseNoraAudioOptions = {}) {
  const { onTranscriptionComplete, onSpeechStart, onSpeechEnd, defaultMode = "executive" } = options;

  const [state, setState] = useState<NoraAudioState>({
    isRecording: false,
    isTranscribing: false,
    isSpeaking: false,
    activeEngine: "cloud-whisper",
    transcript: "",
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const nativeRecognitionRef = useRef<any>(null);
  const nativeTranscriptBufferRef = useRef<string>("");
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeModeRef = useRef<NoraMode>(defaultMode);

  // Selector inteligente de voces neuronales / naturales del navegador
  const selectBestNaturalVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Criterios de prioridad para voces naturales en español neutro / rioplatense
    const priorityChecks = [
      (v: SpeechSynthesisVoice) =>
        (v.name.includes("Natural") || v.name.includes("Online")) &&
        (v.lang.startsWith("es-AR") || v.lang.startsWith("es-419") || v.lang.startsWith("es-MX") || v.lang.startsWith("es-US")),
      (v: SpeechSynthesisVoice) =>
        (v.name.includes("Sabina") || v.name.includes("Elena") || v.name.includes("Paulina") || v.name.includes("Jimena")) &&
        !v.lang.includes("es-ES"),
      (v: SpeechSynthesisVoice) =>
        v.name.includes("Google") && (v.lang.startsWith("es-419") || v.lang.startsWith("es-US") || v.lang.startsWith("es-AR")),
      (v: SpeechSynthesisVoice) => v.lang === "es-AR" || v.lang === "es-419",
      (v: SpeechSynthesisVoice) => v.lang.startsWith("es") && !v.lang.includes("es-ES"),
      (v: SpeechSynthesisVoice) => v.lang.startsWith("es"),
    ];

    for (const check of priorityChecks) {
      const match = voices.find(check);
      if (match) return match;
    }

    return voices.find((v) => v.default && v.lang.startsWith("es")) || null;
  }, []);

  // Síntesis de voz con calibración acústica adaptativa al modo cognitivo
  const speakText = useCallback(
    (text: string, onEnd?: () => void, overrideMode?: NoraMode): Promise<void> => {
      return new Promise((resolve) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
          resolve();
          return;
        }

        window.speechSynthesis.cancel();

        const cleanText = text
          .replace(/[*#_~`>\[\]\(\)\{\}\\]+/g, " ")
          .replace(/<think>[\s\S]*?<\/think>/gi, "")
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
          .replace(/^Thinking:?\s*/i, "")
          .replace(/\s+/g, " ")
          .trim();

        if (!cleanText) {
          resolve();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "es-419";

        // Calibración acústica según el modo activo
        const currentMode = overrideMode || activeModeRef.current;
        if (currentMode === "lazarillo") {
          utterance.rate = 1.15; // Ágil y directo para alertas espaciales inmediatas
          utterance.pitch = 1.02;
        } else if (currentMode === "tea") {
          utterance.rate = 0.90; // Pausado, articulado y libre de sobrecarga sensorial
          utterance.pitch = 0.98;
        } else {
          utterance.rate = 1.05; // Recepcionista de clase mundial, natural y cálida
          utterance.pitch = 1.0;
        }

        const naturalVoice = selectBestNaturalVoice();
        if (naturalVoice) {
          utterance.voice = naturalVoice;
        }

        utterance.onstart = () => {
          setState((prev) => ({ ...prev, isSpeaking: true }));
        };

        utterance.onend = () => {
          setState((prev) => ({ ...prev, isSpeaking: false }));
          if (onEnd) onEnd();
          resolve();
        };

        utterance.onerror = (e) => {
          console.warn("[useNoraAudio] Error en SpeechSynthesis:", e);
          setState((prev) => ({ ...prev, isSpeaking: false }));
          if (onEnd) onEnd();
          resolve();
        };

        currentUtteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [selectBestNaturalVoice]
  );

  // Detener cualquier reproducción vocal en curso
  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setState((prev) => ({ ...prev, isSpeaking: false }));
  }, []);

  // Inicializar motor de reconocimiento nativo Web Speech (Edge Fallback / Standby)
  const initNativeRecognition = useCallback(() => {
    if (typeof window === "undefined") return null;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-AR";

      recognition.onspeechstart = () => {
        if (onSpeechStart) onSpeechStart();
      };

      recognition.onspeechend = () => {
        if (onSpeechEnd) onSpeechEnd();
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        nativeTranscriptBufferRef.current = (final || interim).trim();
      };

      recognition.onerror = (event: any) => {
        console.warn("[useNoraAudio Native STT]:", event?.error);
      };

      return recognition;
    } catch {
      return null;
    }
  }, [onSpeechStart, onSpeechEnd]);

  // Iniciar captura de audio
  const startRecording = useCallback(async () => {
    try {
      stopSpeaking();
      nativeTranscriptBufferRef.current = "";

      // 1. Iniciar captura nativa en paralelo como fail-safe instantáneo (0 MB / 0ms)
      if (!nativeRecognitionRef.current) {
        nativeRecognitionRef.current = initNativeRecognition();
      }
      try {
        nativeRecognitionRef.current?.start();
      } catch {
        // Ignorar si ya estaba iniciado
      }

      // 2. Iniciar captura de MediaStream para Whisper Cloud
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100);
      setState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
        activeEngine: "cloud-whisper",
      }));
    } catch (err: any) {
      console.error("[useNoraAudio] Error iniciando micrófono:", err);
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: "No se pudo acceder al micrófono. Verifica los permisos del navegador.",
      }));
    }
  }, [stopSpeaking, initNativeRecognition]);

  // Detener grabación y procesar con estrategia dual STT
  const stopRecordingAndTranscribe = useCallback(async (): Promise<string | null> => {
    return new Promise((resolve) => {
      // Detener reconocimiento nativo
      try {
        nativeRecognitionRef.current?.stop();
      } catch {
        // No-op
      }

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        setState((prev) => ({ ...prev, isRecording: false }));
        const fallbackText = nativeTranscriptBufferRef.current.trim();
        if (fallbackText) {
          setState((prev) => ({ ...prev, activeEngine: "native-edge", transcript: fallbackText }));
          if (onTranscriptionComplete) onTranscriptionComplete(fallbackText);
          resolve(fallbackText);
          return;
        }
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        recorder.stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        // Si el audio es un clic insignificante pero el motor nativo escuchó algo, usarlo
        if (audioBlob.size < 1500) {
          const nativeText = nativeTranscriptBufferRef.current.trim();
          if (nativeText) {
            setState((prev) => ({
              ...prev,
              isRecording: false,
              isTranscribing: false,
              activeEngine: "native-edge",
              transcript: nativeText,
            }));
            if (onTranscriptionComplete) onTranscriptionComplete(nativeText);
            resolve(nativeText);
            return;
          }
          setState((prev) => ({ ...prev, isRecording: false, isTranscribing: false }));
          resolve(null);
          return;
        }

        setState((prev) => ({ ...prev, isRecording: false, isTranscribing: true }));

        // Timeout estricto de 4000ms para Groq Whisper
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), 4000);

        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");

          const response = await fetch("/api/nora-transcribe", {
            method: "POST",
            body: formData,
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();
          const recognizedText = data.text?.trim() || "";

          if (!recognizedText && nativeTranscriptBufferRef.current.trim()) {
            throw new Error("Cloud Whisper devolvió texto vacío, conmutando a Edge");
          }

          setState((prev) => ({
            ...prev,
            isTranscribing: false,
            activeEngine: "cloud-whisper",
            transcript: recognizedText,
          }));

          if (onTranscriptionComplete) onTranscriptionComplete(recognizedText);
          resolve(recognizedText);
        } catch (err: any) {
          clearTimeout(timeoutId);
          console.warn("[useNoraAudio STT Failover -> Native Edge]:", err?.message || err);

          // FALLBACK INSTANTÁNEO AL RECONOCIMIENTO NATIVO
          const nativeText = nativeTranscriptBufferRef.current.trim();
          if (nativeText) {
            setState((prev) => ({
              ...prev,
              isTranscribing: false,
              activeEngine: "native-edge",
              transcript: nativeText,
            }));
            if (onTranscriptionComplete) onTranscriptionComplete(nativeText);
            resolve(nativeText);
            return;
          }

          setState((prev) => ({
            ...prev,
            isTranscribing: false,
            error: "No se pudo procesar la voz por red ni localmente.",
          }));
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, [onTranscriptionComplete]);

  // Cancelar grabación activa sin procesar
  const cancelRecording = useCallback(() => {
    try {
      nativeRecognitionRef.current?.stop();
    } catch {}
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
    nativeTranscriptBufferRef.current = "";
    setState((prev) => ({ ...prev, isRecording: false, isTranscribing: false }));
  }, []);

  // Actualizar el modo cognitivo activo para la calibración acústica
  const setCognitiveMode = useCallback((newMode: NoraMode) => {
    activeModeRef.current = newMode;
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      try {
        nativeRecognitionRef.current?.stop();
      } catch {}
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Transcribir un Blob de audio arbitrario (ej. generado por useNoraVAD en WAV o WebM)
  const transcribeAudioBlob = useCallback(
    async (blob: Blob): Promise<string | null> => {
      setState((prev) => ({ ...prev, isTranscribing: true }));
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 4000);

      try {
        const formData = new FormData();
        const extension = blob.type.includes("wav") ? "audio.wav" : "audio.webm";
        formData.append("file", blob, extension);

        const response = await fetch("/api/nora-transcribe", {
          method: "POST",
          body: formData,
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const recognizedText = data.text?.trim() || "";

        setState((prev) => ({
          ...prev,
          isTranscribing: false,
          activeEngine: "cloud-whisper",
          transcript: recognizedText,
        }));

        if (onTranscriptionComplete && recognizedText) {
          onTranscriptionComplete(recognizedText);
        }

        return recognizedText;
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn("[useNoraAudio transcribeAudioBlob fallback]:", err?.message || err);
        const fallback = nativeTranscriptBufferRef.current.trim();
        if (fallback) {
          setState((prev) => ({
            ...prev,
            isTranscribing: false,
            activeEngine: "native-edge",
            transcript: fallback,
          }));
          if (onTranscriptionComplete) onTranscriptionComplete(fallback);
          return fallback;
        }

        setState((prev) => ({
          ...prev,
          isTranscribing: false,
          error: "No se pudo transcribir el audio.",
        }));
        return null;
      }
    },
    [onTranscriptionComplete]
  );

  return {
    ...state,
    startRecording,
    stopRecordingAndTranscribe,
    transcribeAudioBlob,
    cancelRecording,
    speakText,
    stopSpeaking,
    setCognitiveMode,
  };
}
