"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PhoneOff, Sparkles, Volume2, VolumeX, Mic, Hand, Radio, AlertTriangle, Play, Send } from "lucide-react";
import { useNoraOfflineGPS } from "@/hooks/useNoraOfflineGPS";
import { dispatchSOS } from "@/lib/nora/protocols/sosDispatcher";
import { useNoraLazarilloHaptics } from "@/hooks/useNoraLazarilloHaptics";
import { executeLocalInference } from "@/lib/nora/webgpu/localEngine";
import { normalizePhoneticTextForSpeech } from "@/lib/nora/phoneticNormalizer";

interface NoraRealtimeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVoiceUri?: string;
  activeMode?: string;
  onMessageLogged?: (userText: string, assistantText: string) => void;
  initialHistory?: { role: string; content: string }[];
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function NoraRealtimeCallModal({
  isOpen,
  onClose,
  selectedVoiceUri,
  activeMode = "general",
  onMessageLogged,
  initialHistory = []
}: NoraRealtimeCallModalProps) {
  const { isOnline, coords } = useNoraOfflineGPS();
  const { emitSinglePulse, startDangerAlertLoop, clearHapticAlerts } = useNoraLazarilloHaptics();

  const [isEngineReady, setIsEngineReady] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [callState, setCallState] = useState<"connecting" | "listening" | "thinking" | "speaking">("connecting");
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [assistantText, setAssistantText] = useState<string>("");
  const [callDuration, setCallDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isTriggeringSOS, setIsTriggeringSOS] = useState<boolean>(false);
  const [typedMessage, setTypedMessage] = useState<string>("");

  // Modos de interacción y accesibilidad (Flujo Continuo / Manos Libres por defecto)
  const [interactionMode, setInteractionMode] = useState<"hands_free" | "push_to_talk">("hands_free");
  const interactionModeRef = useRef<"hands_free" | "push_to_talk">(interactionMode);
  const [isPushTalking, setIsPushTalking] = useState<boolean>(false);
  const [accessibleAnnouncement, setAccessibleAnnouncement] = useState<string>("Llamada con Nora iniciada. Te escucha.");
  const [micError, setMicError] = useState<string | null>(null);

  // 🎧 Modo Coexistencia con Lector de Pantalla del Sistema (TalkBack / VoiceOver)
  const [useSystemScreenReader, setUseSystemScreenReader] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem("nora_use_system_screen_reader") === "true";
      } catch {}
    }
    return false;
  });

  const toggleSystemScreenReader = useCallback(() => {
    setUseSystemScreenReader((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("nora_use_system_screen_reader", String(next));
        } catch {}
      }
      setAccessibleAnnouncement(
        next
          ? "Modo Lector del Sistema activado. Las respuestas serán leídas por TalkBack o VoiceOver."
          : "Modo Lector del Sistema desactivado. Nora hablará con su sintetizador de audio."
      );
      return next;
    });
  }, []);

  // Control de estado y memoria de conversación
  const isNoraSpeakingRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const historyRef = useRef<{ role: string; content: string }[]>(initialHistory || []);

  useEffect(() => {
    if (initialHistory && initialHistory.length > 0) {
      historyRef.current = [...initialHistory];
    }
  }, [initialHistory]);
  const activeModeRef = useRef<string>(activeMode);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const liveTranscriptRef = useRef<string>("");
  const recognitionRef = useRef<any>(null);

  // Audio Pipeline Refs (Web Audio API Nativa)
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micGainNodeRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // VAD Calibrado Antirruido y Filtro de Interrupciones (VAD Watchdog 700ms)
  const isSpeakingRef = useRef<boolean>(false);
  const silenceStartRef = useRef<number | null>(null);
  const noiseFloorRef = useRef<number>(14);
  const speechStartTimeRef = useRef<number>(0);
  const cooldownTimerRef = useRef<any>(null);
  const interruptionSoundStartRef = useRef<number | null>(null);
  const lastInterruptedResponseRef = useRef<{ text: string; timestamp: number } | null>(null);
  const lastCompletedAssistantTextRef = useRef<string>("");

  useEffect(() => {
    activeModeRef.current = activeMode;
  }, [activeMode]);

  useEffect(() => {
    interactionModeRef.current = interactionMode;
  }, [interactionMode]);

  // 🔔 Tono auditivo suave para personas no videntes
  const playAccessibleChime = useCallback((type: "start" | "end" | "connected") => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = audioContextRef.current || new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;

      if (type === "start") {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "end") {
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(390, now + 0.1);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "connected") {
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {}
  }, []);

  // 2. Temporizador de llamada y Screen Wake Lock
  const callWakeLockRef = useRef<any>(null);

  const requestCallWakeLock = useCallback(async () => {
    if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
      try {
        if (!callWakeLockRef.current || callWakeLockRef.current.released) {
          callWakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          console.log("[Nora Call] Screen Wake Lock activo durante la llamada");
        }
      } catch (err) {
        console.warn("[Nora Call] Wake Lock aviso:", err);
      }
    }
  }, []);

  const releaseCallWakeLock = useCallback(() => {
    if (callWakeLockRef.current) {
      try {
        callWakeLockRef.current.release();
      } catch (e) {}
      callWakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    let timer: any = null;
    if (isOpen) {
      requestCallWakeLock();
      const handleVis = async () => {
        if (document.visibilityState === "visible" && isOpen) {
          await requestCallWakeLock();
        }
      };
      document.addEventListener("visibilitychange", handleVis);

      if (isEngineReady) {
        setCallDuration(0);
        timer = setInterval(() => setCallDuration((d) => d + 1), 1000);
      }

      return () => {
        document.removeEventListener("visibilitychange", handleVis);
        releaseCallWakeLock();
        if (timer) clearInterval(timer);
      };
    } else {
      releaseCallWakeLock();
    }
  }, [isOpen, isEngineReady, requestCallWakeLock, releaseCallWakeLock]);

  const speechHeartbeatRef = useRef<any>(null);
  const speechKeepAliveRef = useRef<any>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const clearSpeechHeartbeat = useCallback(() => {
    if (speechHeartbeatRef.current) {
      clearTimeout(speechHeartbeatRef.current);
      speechHeartbeatRef.current = null;
    }
    if (speechKeepAliveRef.current) {
      clearInterval(speechKeepAliveRef.current);
      speechKeepAliveRef.current = null;
    }
  }, []);

  // Reanudar escucha limpia tras delay de seguridad
  const resumeListening = useCallback(() => {
    clearSpeechHeartbeat();
    activeUtteranceRef.current = null;
    isNoraSpeakingRef.current = false;
    isSpeakingRef.current = false;
    silenceStartRef.current = null;
    setCallState("listening");
    setAccessibleAnnouncement("Nora te escucha.");

    // Reactivar micrófono de forma limpia
    if (micGainNodeRef.current && audioContextRef.current) {
      try {
        micGainNodeRef.current.gain.setValueAtTime(1.0, audioContextRef.current.currentTime);
      } catch {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });
    }
  }, [clearSpeechHeartbeat]);

  const resetSpeechHeartbeat = useCallback((durationMs?: number) => {
    clearSpeechHeartbeat();
    const timeout = durationMs || 35000;
    speechHeartbeatRef.current = setTimeout(() => {
      // Solo recuperar si realmente se excedió el tiempo total estimado de la locución
      if (isNoraSpeakingRef.current) {
        console.warn("[Nora Voice Heartbeat] Fin de tiempo de seguridad de locución. Liberando canal...");
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          try { window.speechSynthesis.cancel(); } catch {}
        }
        activeUtteranceRef.current = null;
        isNoraSpeakingRef.current = false;
        resumeListening();
        playAccessibleChime("start");
        setAccessibleAnnouncement("Canal de audio restablecido. Nora te escucha.");
      }
    }, timeout);

    // 🛡️ Chrome/Chromium SpeechSynthesis Keep-Alive Pulse (Evita que el navegador pause a los 15s)
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechKeepAliveRef.current = setInterval(() => {
        try {
          if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        } catch {}
      }, 5000);
    }
  }, [clearSpeechHeartbeat, playAccessibleChime, resumeListening]);

  // 3. Detener audio de Nora de forma absoluta y limpia
  const stopNoraSpeech = useCallback(() => {
    clearSpeechHeartbeat();
    activeUtteranceRef.current = null;
    isNoraSpeakingRef.current = false;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
        currentAudioSourceRef.current.disconnect();
      } catch {}
      currentAudioSourceRef.current = null;
    }
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    clearHapticAlerts();
  }, [clearHapticAlerts, clearSpeechHeartbeat]);

  // Cierre limpio de llamada y liberación total de hardware
  const handleCleanExit = useCallback(() => {
    stopNoraSpeech();
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => {
        t.stop();
        t.enabled = false;
      });
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsEngineReady(false);
    onClose();
  }, [onClose, stopNoraSpeech]);

  // 5. Reproducción de Audio Completa y Fonéticamente Humana (Con Heartbeat Watchdog)
  const playRealNoraAudio = useCallback(
    async (_audioBase64: string | null, fullText: string, customPhoneticText?: string) => {
      if (isMuted || !fullText || !fullText.trim()) {
        resumeListening();
        return;
      }

      stopNoraSpeech();
      isNoraSpeakingRef.current = true;
      setCallState("speaking");
      setAssistantText(fullText);
      lastCompletedAssistantTextRef.current = fullText;

      const spokenText = customPhoneticText || normalizePhoneticTextForSpeech(fullText);

      // 🎧 MODO COEXISTENCIA DE AUDIO: Si usa TalkBack o VoiceOver, no reproducir SpeechSynthesis de la app
      if (useSystemScreenReader) {
        isNoraSpeakingRef.current = false;
        setAccessibleAnnouncement(`Nora responde: ${spokenText}`);
        setTimeout(() => {
          resumeListening();
        }, Math.min(8000, Math.max(2000, spokenText.length * 40)));
        return;
      }

      setAccessibleAnnouncement("Nora está respondiendo.");

      // Reproducción continua de texto completo mediante SpeechSynthesis con Heartbeat
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();

          const spokenText = customPhoneticText || normalizePhoneticTextForSpeech(fullText);
          const estimatedDurationMs = Math.max(15000, Math.round((spokenText.length / 8) * 1000) + 8000);

          const utterance = new SpeechSynthesisUtterance(spokenText);
          activeUtteranceRef.current = utterance; // 🛡️ Evita Garbage Collection prematuro en Chrome/Edge
          utterance.lang = "es-AR";
          utterance.rate = 1.02;
          utterance.pitch = 1.05;

          const voices = window.speechSynthesis.getVoices();
          const spanishVoice = voices.find(v =>
            (v.lang.startsWith("es-AR") || v.lang.startsWith("es-419") || v.lang.startsWith("es-US") || v.lang.startsWith("es")) &&
            (v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("paulina") || v.name.toLowerCase().includes("elena") || v.name.toLowerCase().includes("sabina") || v.name.toLowerCase().includes("monica") || v.name.toLowerCase().includes("natural"))
          ) || voices.find(v => v.lang.startsWith("es"));

          if (spanishVoice) {
            utterance.voice = spanishVoice;
          }

          utterance.onstart = () => {
            resetSpeechHeartbeat(estimatedDurationMs);
          };

          utterance.onend = () => {
            clearSpeechHeartbeat();
            activeUtteranceRef.current = null;
            isNoraSpeakingRef.current = false;
            if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
            // Delay de seguridad de 350ms para evitar que el micrófono capture el eco final
            cooldownTimerRef.current = setTimeout(() => {
              resumeListening();
              playAccessibleChime("start");
            }, 350);
          };

          utterance.onerror = (err) => {
            console.warn("[SpeechSynthesis Error]:", err);
            clearSpeechHeartbeat();
            activeUtteranceRef.current = null;
            isNoraSpeakingRef.current = false;
            resumeListening();
            playAccessibleChime("start");
          };

          resetSpeechHeartbeat(estimatedDurationMs);
          window.speechSynthesis.speak(utterance);
          return;
        } catch (e) {
          console.warn("[SpeechSynthesis Error]:", e);
          clearSpeechHeartbeat();
        }
      }

      setTimeout(() => {
        resumeListening();
      }, 3500);
    },
    [clearSpeechHeartbeat, isMuted, playAccessibleChime, resetSpeechHeartbeat, resumeListening, stopNoraSpeech]
  );

  // 6. Protocolo SOS Lazarillo Híbrido
  const handleExecuteSOS = useCallback(
    async (customNote?: string) => {
      setIsTriggeringSOS(true);
      startDangerAlertLoop();
      setAccessibleAnnouncement("Activando protocolo de auxilio y geolocalización SOS...");
      try {
        const result = await dispatchSOS({
          lat: coords?.lat,
          lng: coords?.lng,
          isOnline,
          customNote
        });

        if (result.method === "SMS" && result.smsUri) {
          setTimeout(() => {
            window.location.href = result.smsUri!;
          }, 1500);
        }
      } catch (err: any) {
        console.warn("[SOS Trigger Warning]:", err);
        window.location.href = "tel:911";
      } finally {
        setIsTriggeringSOS(false);
      }
    },
    [coords, isOnline, startDangerAlertLoop]
  );

  // 7. Enviar audio con Telemetría
  const sendVoiceAudioTurn = useCallback(
    async (audioBlob: Blob, mimeType: string) => {
      if (isProcessingRef.current) return;

      const clientText = liveTranscriptRef.current.trim();
      liveTranscriptRef.current = ""; // Limpieza atómica inmediata

      if (audioBlob.size < 80 && !clientText) {
        setCallState("listening");
        return;
      }

      stopNoraSpeech();
      isProcessingRef.current = true;
      setCallState("thinking");
      setAccessibleAnnouncement("Nora está procesando tu mensaje...");
      playAccessibleChime("end");
      setUserTranscript(clientText ? `"${clientText}"` : "Escuchando tu consulta...");

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = ((reader.result as string) || "").split(",")[1];
        if (!base64 && !clientText) {
          isProcessingRef.current = false;
          resumeListening();
          return;
        }

        try {
          const controller = new AbortController();
          abortControllerRef.current = controller;

          let text = "";
          let phoneticText = "";
          let resAudio: string | null = null;
          let transcribedUserText = clientText;

          try {
            const interruptedContext = lastInterruptedResponseRef.current;
            const res = await fetch("/api/noraitu-realtime-proxy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: clientText,
                audioBase64: base64,
                mimeType,
                history: historyRef.current.slice(-16),
                mode: activeModeRef.current,
                lastInterruptedResponse: interruptedContext
              }),
              signal: controller.signal
            });

            if (res.ok) {
              const data = await res.json();
              text = data.text || "";
              phoneticText = data.phoneticText || "";
              resAudio = data.audioBase64 || null;
              transcribedUserText = data.transcribedUserText || clientText;
            } else {
              throw new Error("HTTP_FAILED");
            }
          } catch (fetchErr: any) {
            console.warn("[Voice Modal] Red no disponible o error HTTP. Conmutando a Inferencia Local Offline...", fetchErr?.message);
            const userPrompt = clientText || "Consulta docente por voz";
            const localRes = await executeLocalInference(
              userPrompt,
              historyRef.current,
              activeModeRef.current
            );
            text = localRes.text;
            transcribedUserText = userPrompt;
          }

          if (transcribedUserText && !transcribedUserText.includes("Escuchando") && !transcribedUserText.includes("[Sonido")) {
            setUserTranscript(`"${transcribedUserText}"`);
            historyRef.current.push({ role: "user", content: transcribedUserText });

            if (/\b(emergencia|auxilio|socorro|me caí|me perdi|me perdí|ayuda urgente)\b/i.test(transcribedUserText)) {
              handleExecuteSOS(transcribedUserText);
              return;
            }
          }

          if (text) {
            historyRef.current.push({ role: "assistant", content: text });
            if (historyRef.current.length > 20) {
              historyRef.current = historyRef.current.slice(-20);
            }
            if (onMessageLogged) {
              onMessageLogged(transcribedUserText || "🎙️ [Voz]", text);
            }
            playRealNoraAudio(resAudio, text, phoneticText);
          } else {
            resumeListening();
          }
        } catch (err: any) {
          if (err.name !== "AbortError") {
            console.error("[Realtime Voice Error]:", err);
          }
          resumeListening();
        } finally {
          isProcessingRef.current = false;
        }
      };

      reader.readAsDataURL(audioBlob);
    },
    [handleExecuteSOS, onMessageLogged, playAccessibleChime, playRealNoraAudio, resumeListening, stopNoraSpeech]
  );

  // 8. Inicialización Asíncrona Controlada por User Gesture (Tap Físico)
  const startUnifiedAudioEngine = useCallback(async () => {
    if (isEngineReady) return;
    setIsInitializing(true);
    setMicError(null);

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = audioContextRef.current || new AudioCtx({ latencyHint: "interactive" });
      audioContextRef.current = audioCtx;

      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      // Stream de Micrófono con Fallback Progresivo Seguro
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      } catch (e1) {
        console.warn("[Mic Init with constraints failed, trying basic audio:true]:", e1);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e2) {
          console.error("[Mic Access Denied / Not Available]:", e2);
          throw new Error("MIC_DENIED");
        }
      }

      if (!stream) throw new Error("MIC_DENIED");
      micStreamRef.current = stream;

      const source = audioCtx.createMediaStreamSource(stream);

      // GainNode de Control Permanente
      const micGain = audioCtx.createGain();
      micGain.gain.setValueAtTime(1.0, audioCtx.currentTime);
      micGainNodeRef.current = micGain;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.2;

      source.connect(micGain);
      micGain.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/mp4";

      let recorder: MediaRecorder | null = null;

      const createAndStartRecorder = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          return;
        }
        audioChunksRef.current = [];
        speechStartTimeRef.current = Date.now();
        recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const clientText = liveTranscriptRef.current.trim();
          if (blob.size > 80 || clientText) {
            sendVoiceAudioTurn(blob, mimeType);
          } else {
            setCallState("listening");
          }
        };

        recorder.start(80);
        mediaRecorderRef.current = recorder;
      };

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const SILENCE_TIMEOUT_MS = 1000;
      const MAX_SPEECH_DURATION_MS = 45000;

      setIsEngineReady(true);
      setCallState("listening");
      setMicError(null);
      playAccessibleChime("connected");
      emitSinglePulse("CONFIRM_VOZ");
      setAccessibleAnnouncement("Conectado con Nora. Lista para escucharte.");

      // Inicializar SpeechRecognition nativo en paralelo si el navegador lo soporta
      if (typeof window !== "undefined") {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const rec = new SpeechRec();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = "es-AR";
            rec.onresult = (e: any) => {
              let cur = "";
              for (let i = e.resultIndex; i < e.results.length; ++i) {
                cur += e.results[i][0].transcript;
              }
              if (cur.trim()) {
                liveTranscriptRef.current = cur.trim();
                setUserTranscript(`"${cur.trim()}"`);
              }
            };
            rec.onerror = () => {};
            try { rec.start(); } catch {}
            recognitionRef.current = rec;
          } catch {}
        }
      }

      const monitorAudioLoop = () => {
        if (!micStreamRef.current) return;

        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round(avg * 2.3)));

        const now = Date.now();

        // 🛡️ Calibración continua del piso de ruido ambiental (Adaptive Noise Floor)
        if (!isSpeakingRef.current && !isNoraSpeakingRef.current && !isProcessingRef.current) {
          noiseFloorRef.current = Math.min(32, Math.max(6, noiseFloorRef.current * 0.95 + avg * 0.05));
        }

        // 🛡️ FILTRO DE PROTECCIÓN DURANTE HABLA DE NORA (VAD WATCHDOG Anti-Eco y Anti-Ruido)
        if (isNoraSpeakingRef.current) {
          // Exigir volumen nítidamente superior al piso de ruido y persistencia humana (>850ms)
          const interruptThreshold = Math.max(38, noiseFloorRef.current + 20);
          if (avg > interruptThreshold) {
            if (interruptionSoundStartRef.current === null) {
              interruptionSoundStartRef.current = now;
            } else if (now - interruptionSoundStartRef.current >= 850) {
              // Interrupción legítima deliberada del usuario
              lastInterruptedResponseRef.current = {
                text: lastCompletedAssistantTextRef.current,
                timestamp: now
              };
              interruptionSoundStartRef.current = null;
              stopNoraSpeech();
              isSpeakingRef.current = true;
              speechStartTimeRef.current = now;
              createAndStartRecorder();
              setCallState("listening");
              setAccessibleAnnouncement("Te escucho...");
            }
          } else {
            // Sonido transitorio, eco del altavoz o ruido breve: descartar
            interruptionSoundStartRef.current = null;
          }

          animFrameRef.current = requestAnimationFrame(monitorAudioLoop);
          return;
        }

        if (isProcessingRef.current) {
          animFrameRef.current = requestAnimationFrame(monitorAudioLoop);
          return;
        }

        if (interactionModeRef.current === "push_to_talk") {
          animFrameRef.current = requestAnimationFrame(monitorAudioLoop);
          return;
        }

        // Umbral dinámico adaptativo calibrado según el entorno real
        const dynamicThreshold = Math.max(10, noiseFloorRef.current + 5);

        if (avg > dynamicThreshold) {
          silenceStartRef.current = null;
          if (!isSpeakingRef.current) {
            isSpeakingRef.current = true;
            createAndStartRecorder();
            setCallState("listening");
          }
        } else {
          if (isSpeakingRef.current) {
            if (silenceStartRef.current === null) {
              silenceStartRef.current = now;
            } else if (now - silenceStartRef.current > SILENCE_TIMEOUT_MS) {
              isSpeakingRef.current = false;
              silenceStartRef.current = null;
              if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                mediaRecorderRef.current.stop();
              }
            }
          }
        }

        if (isSpeakingRef.current && now - speechStartTimeRef.current > MAX_SPEECH_DURATION_MS) {
          isSpeakingRef.current = false;
          silenceStartRef.current = null;
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
        }

        animFrameRef.current = requestAnimationFrame(monitorAudioLoop);
      };

      monitorAudioLoop();
    } catch (err: any) {
      console.warn("[Audio Engine Init Error]:", err);
      const msg = err?.name === "NotAllowedError" || err?.message === "MIC_DENIED"
        ? "Por favor permite el acceso al micrófono en tu navegador y vuelve a presionar el botón."
        : "No se pudo conectar el micrófono. Por favor verifica los permisos.";
      setMicError(msg);
      setIsEngineReady(false);
    } finally {
      setIsInitializing(false);
    }
  }, [emitSinglePulse, interactionMode, isEngineReady, playAccessibleChime, sendVoiceAudioTurn]);

  // Auto-conexión suave al abrir el modal (aprovecha el gesto de clic del usuario)
  useEffect(() => {
    if (isOpen && !isEngineReady && !isInitializing) {
      startUnifiedAudioEngine().catch(() => {});
    }
  }, [isOpen, isEngineReady, isInitializing, startUnifiedAudioEngine]);

  // Cleanup de seguridad al desmontar
  useEffect(() => {
    return () => {
      stopNoraSpeech();
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
        micStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stopNoraSpeech]);

  // 9. Controles Push-to-Talk con Desbloqueo Explícito
  const handlePushTalkStart = async () => {
    if (!isEngineReady) {
      await startUnifiedAudioEngine();
      return;
    }

    if (callState === "speaking") stopNoraSpeech();
    setIsPushTalking(true);
    emitSinglePulse("CONFIRM_VOZ");

    if (micStreamRef.current) {
      if (micGainNodeRef.current && audioContextRef.current) {
        micGainNodeRef.current.gain.setValueAtTime(1.0, audioContextRef.current.currentTime);
      }
      micStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = true;
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      audioChunksRef.current = [];
      const recorder = new MediaRecorder(micStreamRef.current, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 1000) {
          sendVoiceAudioTurn(blob, mimeType);
        } else {
          setCallState("listening");
        }
      };

      recorder.start(80);
      mediaRecorderRef.current = recorder;
    }
  };

  const handlePushTalkEnd = () => {
    setIsPushTalking(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // 💬 Envío de texto dentro del Modo Voz sin perder el audio
  const handleSendTypedMessage = async () => {
    if (!typedMessage.trim() || callState === "thinking") return;
    const textToSend = typedMessage.trim();
    setTypedMessage("");

    if (callState === "speaking") stopNoraSpeech();
    setCallState("thinking");
    setUserTranscript(textToSend);
    setAccessibleAnnouncement(`Enviando: ${textToSend}`);

    if (onMessageLogged) {
      onMessageLogged(textToSend, "");
    }

    try {
      const res = await fetch("/api/noraitu-realtime-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: historyRef.current.slice(-6),
          mode: activeModeRef.current
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          setAssistantText(data.text);
          historyRef.current.push({ role: "user", content: textToSend });
          historyRef.current.push({ role: "assistant", content: data.text });
          if (onMessageLogged) onMessageLogged(textToSend, data.text);

          if (data.audioBase64) {
            await playRealNoraAudio(data.audioBase64, data.text);
          } else {
            setAccessibleAnnouncement(data.text);
            resumeListening();
          }
        } else {
          resumeListening();
        }
      } else {
        resumeListening();
      }
    } catch (e) {
      console.warn("[Typed Voice Turn Error]:", e);
      resumeListening();
    }
  };

  // 🔄 Recuperación de AudioContext al volver a la pestaña
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && audioContextRef.current) {
        if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume().catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // ⌨️ Accesibilidad por Teclado
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        if (interactionMode === "push_to_talk" && !isPushTalking) {
          handlePushTalkStart();
        } else if (callState === "speaking") {
          stopNoraSpeech();
        }
      } else if (e.code === "Escape") {
        handleCleanExit();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && interactionMode === "push_to_talk" && isPushTalking && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        handlePushTalkEnd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isOpen, callState, interactionMode, isPushTalking, handleCleanExit, stopNoraSpeech]);

  if (!isOpen) return null;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Llamada de voz en vivo con Nora"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/90 backdrop-blur-2xl animate-fade-in select-none"
    >
      {/* Región Dinámica Asertiva para TalkBack (Android) y VoiceOver (iOS) */}
      <div 
        id="nora-call-a11y-live-region"
        role="status" 
        aria-live="assertive" 
        aria-atomic="true" 
        className="sr-only"
      >
        {accessibleAnnouncement}
      </div>

      <div className="relative w-full max-w-md overflow-hidden bg-gradient-to-b from-slate-900 via-[#070b14] to-slate-950 border border-cyan-500/30 rounded-3xl shadow-2xl p-5 sm:p-6 flex flex-col items-center justify-between min-h-[590px]">
        
        {/* Cabecera del Modal */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                Nora Realtime Voice
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-mono">HD</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {isOnline ? "En Línea (Soberano)" : "Modo Offline"} • {formatDuration(callDuration)}
              </p>
            </div>
          </div>

          <button
            onClick={handleCleanExit}
            role="button"
            aria-label="Finalizar y cerrar llamada con Nora"
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Pantalla Previa de Conexión Segura si no se ha hecho tap */}
        {!isEngineReady ? (
          <div className="my-auto flex flex-col items-center justify-center w-full py-8 text-center space-y-5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-cyan-500 via-teal-400 to-indigo-500 flex items-center justify-center shadow-xl shadow-cyan-500/30 animate-pulse">
              <Sparkles size={40} className="text-slate-950" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4 className="text-white font-bold text-base">Llamada de Voz con Nora</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Toca el botón para activar el audio de alta fidelidad y hablar en tiempo real.
              </p>
              {micError && (
                <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs text-center animate-fadeIn">
                  ⚠️ {micError}
                </div>
              )}
            </div>
            <button
              onClick={startUnifiedAudioEngine}
              role="button"
              aria-label="Iniciar llamada segura de voz con Nora"
              disabled={isInitializing}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500 hover:opacity-90 active:scale-95 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Play size={18} className="fill-slate-950" />
              <span>{isInitializing ? "Conectando micrófono..." : "Iniciar Llamada Segura"}</span>
            </button>
          </div>
        ) : (
          <>
            {/* Barra de Modos de Accesibilidad */}
            <div className="w-full flex flex-wrap items-center justify-center gap-1.5 mt-2">
              <button
                type="button"
                role="button"
                aria-pressed={interactionMode === "hands_free"}
                aria-label="Modo Flujo Continuo Manos Libres"
                onClick={() => setInteractionMode("hands_free")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  interactionMode === "hands_free"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Radio size={11} />
                <span>Manos Libres</span>
              </button>
              <button
                type="button"
                role="button"
                aria-pressed={interactionMode === "push_to_talk"}
                aria-label="Modo Pulsar para Hablar"
                onClick={() => setInteractionMode("push_to_talk")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  interactionMode === "push_to_talk"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                    : "bg-slate-800/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <Hand size={11} />
                <span>Pulsar p/ Hablar</span>
              </button>

              {/* Botón Accesible: Modo Lector del Sistema (TalkBack / VoiceOver) */}
              <button
                type="button"
                role="button"
                aria-pressed={useSystemScreenReader}
                aria-label={`Lector de Pantalla del Sistema TalkBack o VoiceOver ${useSystemScreenReader ? "activado" : "desactivado"}`}
                onClick={toggleSystemScreenReader}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition border cursor-pointer ${
                  useSystemScreenReader
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm"
                    : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-slate-200"
                }`}
              >
                <Radio size={11} className={useSystemScreenReader ? "text-amber-400 animate-pulse" : ""} />
                <span>{useSystemScreenReader ? "Lector SO (TalkBack/VoiceOver) Activo" : "Lector SO"}</span>
              </button>
            </div>

            {/* Orb Central Reactivo Accesible */}
            <div className="flex-1 w-full flex flex-col items-center justify-center py-3">
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  role="button"
                  aria-label={`Estado de Nora: ${
                    callState === "speaking"
                      ? "Respondiendo a tu consulta. Toca para interrumpir."
                      : callState === "thinking"
                      ? "Procesando respuesta"
                      : isSpeakingRef.current || isPushTalking
                      ? "Escuchando tu voz. Toca para enviar consulta."
                      : "En espera. Habla cuando desees."
                  }`}
                  aria-pressed={callState === "speaking" || isSpeakingRef.current}
                  onClick={() => {
                    if (callState === "speaking") {
                      // 1. Si Nora habla, interrumpir y escuchar
                      stopNoraSpeech();
                      resumeListening();
                      playAccessibleChime("start");
                    } else if (callState === "thinking") {
                      // 2. Si Nora está pensando o bloqueada, cancelar de inmediato
                      if (abortControllerRef.current) {
                        abortControllerRef.current.abort();
                        abortControllerRef.current = null;
                      }
                      isProcessingRef.current = false;
                      resumeListening();
                      playAccessibleChime("start");
                    } else if (isSpeakingRef.current || (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording")) {
                      // 3. Si el usuario está hablando, forzar envío de inmediato
                      isSpeakingRef.current = false;
                      silenceStartRef.current = null;
                      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                        mediaRecorderRef.current.stop();
                      }
                    } else {
                      // 4. Si está en espera, resetear estado y asegurar escucha activa
                      isSpeakingRef.current = false;
                      silenceStartRef.current = null;
                      resumeListening();
                      playAccessibleChime("start");
                    }
                  }}
                  className={`w-36 h-36 rounded-full transition-all duration-100 flex items-center justify-center cursor-pointer ${
                    callState === "speaking"
                      ? "bg-gradient-to-tr from-cyan-400 via-emerald-400 to-teal-300 animate-pulse shadow-2xl shadow-cyan-500/50 scale-105"
                      : callState === "thinking"
                      ? "bg-gradient-to-tr from-purple-500 via-pink-500 to-indigo-500 animate-spin shadow-2xl shadow-purple-500/50"
                      : isSpeakingRef.current || isPushTalking
                      ? "bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-2xl shadow-emerald-500/40 scale-102 ring-4 ring-emerald-500/30"
                      : "bg-gradient-to-tr from-slate-800 via-slate-700 to-slate-800 opacity-90"
                  }`}
                  style={{
                    transform: `scale(${1 + (audioLevel / 100) * 0.22})`
                  }}
                >
                  <div className="absolute inset-1 rounded-full bg-slate-950/40 backdrop-blur-xs flex flex-col items-center justify-center text-center">
                    <span className="text-3xl" aria-hidden="true">
                      {callState === "speaking"
                        ? "🗣️"
                        : callState === "thinking"
                        ? "⚡"
                        : isSpeakingRef.current || isPushTalking
                        ? "🎙️"
                        : "✨"}
                    </span>
                    {isSpeakingRef.current && (
                      <span className="text-[10px] text-emerald-300 font-mono mt-1 font-semibold">Enviar ya</span>
                    )}
                  </div>
                </button>
              </div>

              {/* Subtítulos */}
              <div className="w-full mt-3 px-3 min-h-[65px] flex flex-col items-center justify-center">
                {callState === "thinking" ? (
                  <p className="text-xs text-purple-300 font-medium animate-pulse" role="status">
                    ⚡ Nora está pensando...
                  </p>
                ) : assistantText ? (
                  <div className="max-w-sm bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg">
                    <p className="text-xs text-emerald-300 font-medium leading-relaxed">
                      "{assistantText}"
                    </p>
                  </div>
                ) : userTranscript ? (
                  <p className="text-xs text-cyan-300 font-medium italic line-clamp-2 max-w-xs">
                    {userTranscript}
                  </p>
                ) : (
                  <div className="space-y-1 text-center">
                    <p className="text-xs text-slate-300 font-medium">
                      {interactionMode === "hands_free"
                        ? "Te escucho atentamente y sin cortes"
                        : "Mantené presionado el botón o Espacio para hablar"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {interactionMode === "hands_free"
                        ? "Hablá con libertad. Nora te escucha y te responde."
                        : "Pulsá cuando quieras hablar."}
                    </p>
                  </div>
                )}
              </div>

              {/* Entrada de Texto Híbrida en Modo Voz */}
              <div className="w-full flex items-center gap-2 mt-2 px-1">
                <input
                  type="text"
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typedMessage.trim()) {
                      handleSendTypedMessage();
                    }
                  }}
                  aria-label="Escribe tu consulta por texto para la llamada"
                  placeholder="Escribe aquí si prefieres tipear..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-500 transition-colors"
                />
                <button
                  onClick={handleSendTypedMessage}
                  role="button"
                  aria-label="Enviar texto a Nora"
                  disabled={!typedMessage.trim() || callState === "thinking"}
                  className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:opacity-90 disabled:opacity-30 text-slate-950 font-bold transition-all cursor-pointer shrink-0 shadow-md shadow-cyan-500/20"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

            {/* Modo Pulsar para Hablar */}
            {interactionMode === "push_to_talk" && (
              <div className="w-full flex justify-center py-1">
                <button
                  role="button"
                  aria-pressed={isPushTalking}
                  aria-label="Mantén presionado para hablar con Nora"
                  onMouseDown={handlePushTalkStart}
                  onMouseUp={handlePushTalkEnd}
                  onTouchStart={handlePushTalkStart}
                  onTouchEnd={handlePushTalkEnd}
                  className={`w-full py-2.5 rounded-2xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    isPushTalking
                      ? "bg-emerald-500 text-slate-950 scale-98 shadow-emerald-500/30"
                      : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                  }`}
                >
                  <Mic size={16} className={isPushTalking ? "animate-pulse" : ""} />
                  <span>{isPushTalking ? "Nora te está escuchando..." : "Mantener presionado para hablar"}</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Barra Inferior */}
        <div className="w-full flex items-center justify-between pt-3 border-t border-slate-800/60 mt-auto">
          <button
            onClick={() => {
              if (isMuted) {
                setIsMuted(false);
              } else {
                stopNoraSpeech();
                setIsMuted(true);
              }
            }}
            role="button"
            aria-pressed={isMuted}
            aria-label={isMuted ? "Reanudar micrófono y voz de Nora" : "Silenciar micrófono y voz de Nora"}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isMuted
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            }`}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          {/* Botón SOS Lazarillo Inmediato */}
          <button
            onClick={() => handleExecuteSOS("Solicitud manual de auxilio")}
            disabled={isTriggeringSOS}
            role="button"
            aria-label="Activar protocolo de auxilio y geolocalización SOS"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-rose-600/40 border border-rose-400/40 cursor-pointer transition-all animate-pulse"
          >
            <AlertTriangle size={14} />
            <span>{isTriggeringSOS ? "Enviando..." : "SOS AUXILIO"}</span>
          </button>

          <button
            onClick={handleCleanExit}
            role="button"
            aria-label="Finalizar llamada con Nora"
            className="w-11 h-11 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
          >
            <PhoneOff size={18} />
          </button>
        </div>

      </div>
    </div>
  );
}
