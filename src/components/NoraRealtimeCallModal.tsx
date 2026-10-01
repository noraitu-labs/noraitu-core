"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Sparkles, Send, Radio, MessageSquare, Loader2 } from "lucide-react";

interface NoraRealtimeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export default function NoraRealtimeCallModal({
  isOpen,
  onClose,
  sessionId = `call_${Date.now()}`
}: NoraRealtimeCallModalProps) {
  // Estados de llamada
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [pttMode, setPttMode] = useState<boolean>(false);
  const [isPressingPTT, setIsPressingPTT] = useState<boolean>(false);
  const [showTranscript, setShowTranscript] = useState<boolean>(true);

  // Conversación
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [assistantText, setAssistantText] = useState<string>("");
  const [callHistory, setCallHistory] = useState<Array<{ role: "user" | "assistant"; text: string }>>([]);
  const [status, setStatus] = useState<"connecting" | "listening" | "thinking" | "speaking">("connecting");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>("");

  // Refs
  const recognitionRef = useRef<any>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptHistoryRef = useRef<string>("");
  const isMutedRef = useRef<boolean>(false);
  const statusRef = useRef<typeof status>("connecting");
  // ── Historial conversacional persistente durante toda la llamada ──
  const conversationHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const isCallInitializedRef = useRef<boolean>(false);
  const pttModeRef = useRef<boolean>(false);
  // ── Control estricto de vida de la llamada y micrófono ──
  const isCallAliveRef = useRef<boolean>(false);
  // ── Idioma activo de la llamada (estable, nunca cambia de la nada) ──
  const callLanguageRef = useRef<string>("es-419");
  // ── Indicador de si el stream HTTP sigue leyendo chunks del LLM ──
  const isStreamActiveRef = useRef<boolean>(false);

  // ── Audio Hardware Unlocker: desbloquea Autoplay Policy en iOS/Android ──
  useEffect(() => {
    if (isOpen) {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === "suspended") {
          const unlock = () => {
            audioContext.resume().then(() => {
              window.removeEventListener("click", unlock);
              window.removeEventListener("touchstart", unlock);
            }).catch(() => {});
          };
          window.addEventListener("click", unlock);
          window.addEventListener("touchstart", unlock);
        }
      } catch (e) {
        console.warn("AudioContext init bypassed:", e);
      }
    }
  }, [isOpen]);

  // Sincronizar refs
  useEffect(() => {
    pttModeRef.current = pttMode;
  }, [pttMode]);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ── Activador y validador de estado para micrófono con auto-recuperación ──
  const activateMicrophoneSafely = useCallback(() => {
    if (!isCallAliveRef.current || isMutedRef.current || pttModeRef.current) return;
    if (isSpeakingRef.current || isStreamActiveRef.current) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err: any) {
        if (!err?.message?.includes("already started")) {
          setTimeout(() => {
            if (
              isCallAliveRef.current &&
              statusRef.current === "listening" &&
              !isSpeakingRef.current &&
              !isStreamActiveRef.current &&
              !isMutedRef.current
            ) {
              try { recognitionRef.current?.start(); } catch {}
            }
          }, 200);
        }
      }
    }
  }, []);

  // Detección estricta de idioma: NUNCA usar palabras cortas compartidas ("para", "con", "la", "le")
  const checkExplicitLanguageChange = (text: string): string | null => {
    const t = text.toLowerCase();
    // Comandos explícitos de cambio de idioma
    if (/\b(habla|responde|cambia|puedes hablar|speak)\s+(en\s+)?(inglés|ingles|english)\b/i.test(t)) return "en-US";
    if (/\b(habla|responde|cambia|fala|fale)\s+(en\s+)?(portugués|portugues|portuguese|português)\b/i.test(t)) return "pt-BR";
    if (/\b(habla|responde|cambia|parle)\s+(en\s+)?(francés|frances|french|français)\b/i.test(t)) return "fr-FR";
    if (/\b(habla|responde|cambia|parla)\s+(en\s+)?(italiano|italian)\b/i.test(t)) return "it-IT";
    if (/\b(habla|responde|cambia)\s+(en\s+)?(español|castellano|spanish)\b/i.test(t)) return "es-419";

    // Detección por frases completas características de alta confianza
    if (/\b(how are you|what is|thank you very much|good morning|good afternoon|can you help me|nice to meet you|i would like to)\b/i.test(t)) return "en-US";
    if (/\b(como você está|tudo bem|muito obrigado|bom dia|boa tarde|fazer uma pergunta|você pode)\b/i.test(t)) return "pt-BR";
    if (/\b(comment allez-vous|merci beaucoup|bonjour|s'il vous plaît|je voudrais|bonne journée)\b/i.test(t)) return "fr-FR";
    if (/\b(come stai|grazie mille|buongiorno|per favore|vorrei sapere|buona giornata)\b/i.test(t)) return "it-IT";

    return null;
  };

  // Limpieza segura de símbolos sin mutilar palabras
  const cleanForSpeech = (text: string): string => {
    return text
      .replace(/[*#_~`>\[\]\(\)\{\}\\]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Extracción de oraciones completas para evitar palabras fragmentadas en el stream
  const extractNextCompleteSentence = (buffer: string): { sentence: string; remaining: string } | null => {
    const pattern = /([.?!;]+|\n+|(?:,\s+))/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(buffer)) !== null) {
      const punct = match[0];
      const punctEnd = match.index + punct.length;

      // Ignorar números decimales (ej. 3.14 o 10.5)
      const prevChar = buffer[match.index - 1];
      const nextChar = buffer[punctEnd];
      if (punct.includes(".") && prevChar && /\d/.test(prevChar) && nextChar && /\d/.test(nextChar)) {
        continue;
      }

      // Ignorar abreviaturas comunes
      const textBefore = buffer.slice(0, match.index).trim();
      if (punct.includes(".") && /\b(dr|sr|sra|ing|lic|av|etc|ej|pág|pag|núm|num|art|vol|vs)\.?$/i.test(textBefore)) {
        continue;
      }

      // Si es una coma, exigir al menos 25 caracteres para evitar fragmentación excesiva
      if (punct.startsWith(",") && textBefore.length < 25) {
        continue;
      }

      // Bloquear palabras parciales al final del buffer
      if (punctEnd === buffer.length && !punct.includes("\n")) {
        continue;
      }

      const candidate = buffer.slice(0, punctEnd).trim();
      const remaining = buffer.slice(punctEnd);

      if (candidate.length > 0) {
        return { sentence: candidate, remaining };
      }
    }

    return null;
  };

  // ── PIPELINE DE VOZ REAL NEURAL (Deepgram Aura / XTTS v2 / Audio MPEG) ──
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const playNeuralAudioStream = useCallback(async (text: string, voiceModel: string = "aura-2-javier-es"): Promise<boolean> => {
    try {
      const res = await fetch("/api/nora-transcribe?tts=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "audio/mpeg, audio/wav"
        },
        body: JSON.stringify({
          text,
          voice: voiceModel, // "aura-2-javier-es" o "aura-2-diana-es"
          model: "aura-2-latino",
          format: "audio/mpeg"
        })
      });

      if (res.ok && res.headers.get("content-type")?.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve(true);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(false);
          };
          audio.play().catch(() => resolve(false));
        });
      }
    } catch {
      // Degradar fluidamente a síntesis neural local
    }
    return false;
  }, []);

  // ── 1. PROCESADOR DE COLA TTS STREAMING CON VOZ NEURAL HIPERREALISTA ──
  const processNextSpeechSentence = useCallback(async () => {
    if (!isCallAliveRef.current) return;
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) {
      // Parche: si la cola está vacía y el stream terminó, reactivar micrófono
      if (speechQueueRef.current.length === 0 && !isStreamActiveRef.current) {
        setStatus("listening");
        activateMicrophoneSafely();
      }
      return;
    }

    const rawSentence = speechQueueRef.current.shift()?.trim();
    const sentence = rawSentence ? cleanForSpeech(rawSentence) : "";
    if (!sentence) {
      if (speechQueueRef.current.length > 0) {
        processNextSpeechSentence();
      } else if (!isStreamActiveRef.current) {
        isSpeakingRef.current = false;
        setStatus("listening");
        activateMicrophoneSafely();
      }
      return;
    }

    isSpeakingRef.current = true;
    setStatus("speaking");

    // Pausar reconocimiento para que Nora no se escuche a sí misma
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    // 1. Intentar reproducción neural directa de audio/mpeg (Deepgram Aura Latino / XTTS v2)
    const neuralPlayed = await playNeuralAudioStream(sentence, "aura-2-javier-es").catch(() => false);
    if (neuralPlayed) {
      isSpeakingRef.current = false;
      if (!isCallAliveRef.current) return;
      if (speechQueueRef.current.length > 0) {
        setTimeout(processNextSpeechSentence, 130); // Pausa respiratoria natural humana
      } else if (!isStreamActiveRef.current) {
        setStatus("listening");
        activateMicrophoneSafely();
      } else {
        setStatus("thinking");
      }
      return;
    }

    // 2. Fallback de alta fidelidad: Síntesis neural con cadencia humana y pausas respiratorias
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const lang = callLanguageRef.current || "es-419";
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = lang;
      utterance.rate = 0.98; // Cadencia natural humana realista
      utterance.pitch = 1.02;

      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find(v => v.name.toLowerCase().includes("aura-2-javier") || v.name.toLowerCase().includes("aura-2-diana")) ||
        voices.find(v => v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("neural") || v.name.toLowerCase().includes("online")) ||
        voices.find(v => (v.lang.startsWith("es") || v.lang.includes("es-")) && (v.name.includes("Google") || v.name.includes("Sabina") || v.name.includes("Paulina") || v.name.includes("Monica") || v.name.includes("Elena"))) ||
        voices.find(v => v.lang.toLowerCase().startsWith("es-419") || v.lang.toLowerCase().startsWith("es-us")) ||
        voices.find(v => v.lang.toLowerCase().startsWith("es"));
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        if (!isCallAliveRef.current) return;
        if (speechQueueRef.current.length > 0) {
          setTimeout(processNextSpeechSentence, 140); // Pausa respiratoria natural entre oraciones
        } else if (!isStreamActiveRef.current) {
          setStatus("listening");
          activateMicrophoneSafely();
        } else {
          setStatus("thinking");
        }
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        if (!isCallAliveRef.current) return;
        if (speechQueueRef.current.length > 0) {
          setTimeout(() => processNextSpeechSentence(), 50);
        } else if (!isStreamActiveRef.current) {
          setStatus("listening");
          activateMicrophoneSafely();
        } else {
          setStatus("thinking");
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Sin WebSpeech disponible: liberar flag y continuar ciclo
      isSpeakingRef.current = false;
      setTimeout(() => processNextSpeechSentence(), 50);
    }
  }, [activateMicrophoneSafely, cleanForSpeech, playNeuralAudioStream]);

  const enqueueSentenceForSpeech = useCallback(
    (chunk: string) => {
      speechQueueRef.current.push(chunk);
      if (!isSpeakingRef.current) {
        processNextSpeechSentence();
      }
    },
    [processNextSpeechSentence]
  );

  // ── 2. ENVÍO AL ENDPOINT DE INFERENCIA STREAMING ──
  const sendQueryToStream = useCallback(
    async (messageText: string) => {
      const trimmed = messageText.trim();
      if (!trimmed) return;

      // Parar silencios pendientes
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Detener escucha durante inferencia
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }

      // Detectar si el usuario pide explícitamente cambiar de idioma en la llamada
      const requestedLang = checkExplicitLanguageChange(trimmed);
      if (requestedLang) {
        callLanguageRef.current = requestedLang;
      }

      // Añadir al historial visual de la llamada
      setCallHistory(prev => [...prev, { role: "user", text: trimmed }]);
      setUserTranscript("");
      setAssistantText("");
      setStatus("thinking");

      // Registrar turno del usuario en el historial conversacional persistente
      conversationHistoryRef.current.push({ role: "user", content: trimmed });
      // Mantener máximo 20 turnos (10 intercambios) para no saturar el contexto
      if (conversationHistoryRef.current.length > 20) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-20);
      }

      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      isStreamActiveRef.current = true;

      try {
        const response = await fetch("/api/nora-inference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userText: trimmed,
            sessionId,
            // Enviar historial completo de la llamada para mantener el hilo
            history: conversationHistoryRef.current.slice(0, -1), // excluir el último (userText ya lo incluye el route)
            systemPrompt:
              "Eres Nora Itu, asistente de inteligencia artificial creada por MyJNexoraVisual. MODO LLAMADA TELEFÓNICA ACTIVO. Tu estilo es el de una profesional de primer nivel: cálida, empática, segura y directa, como una recepcionista de hotel cinco estrellas. REGLA INQUEBRANTABLE DE IDIOMA: Mantén SIEMPRE el idioma en el que el usuario te habla (por defecto Español Neutro Latinoamericano). NUNCA cambies de idioma espontáneamente ni mezcles idiomas. Solo cambia si el usuario te lo solicita explícitamente (ej: 'háblame en inglés', 'speak english'). Las siguientes palabras están PROHIBIDAS: 'che', 'sos', 'tenés', 'podés', 'laburar', 'posta', 'copado', 'boludo', 'dale', 'mirá', 'pibe'. Usa SIEMPRE: 'tienes', 'puedes', 'eres', 'sabes'. Todas las palabras deben ser COMPLETAS: 'corporativo' (no 'corporivo'), 'tomate', 'chocolate', 'zapatillas'. Dominas una Matriz de Idiomas con diccionarios perfectos en Español, Inglés, Portugués, Francés e Italiano. Tienes prohibido inventar, truncar o distorsionar palabras. Respuestas concisas, fluidas y naturales para llamada. Texto plano limpio, sin asteriscos ni markdown.",
            mode: "general",
            deviceLocation: typeof window !== "undefined" ? (() => {
              try {
                const raw = localStorage.getItem("noraitu_device_loc");
                return raw ? JSON.parse(raw) : null;
              } catch { return null; }
            })() : null,
            clientDateTime: new Date().toLocaleString("es-AR", {
              dateStyle: "full",
              timeStyle: "medium",
              timeZone: "America/Argentina/Buenos_Aires",
            }),
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Respuesta no-OK del servidor (${response.status})`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sentenceBuffer = "";
        let accumulatedFull = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, { stream: true });
          if (!textChunk) continue;

          accumulatedFull += textChunk;
          setAssistantText(accumulatedFull);
          sentenceBuffer += textChunk;

          // Segmentación basada en oraciones completas: bloquea fragmentación de palabras parciales
          let extracted = extractNextCompleteSentence(sentenceBuffer);
          while (extracted) {
            if (extracted.sentence) {
              enqueueSentenceForSpeech(extracted.sentence);
            }
            sentenceBuffer = extracted.remaining;
            extracted = extractNextCompleteSentence(sentenceBuffer);
          }
        }

        if (sentenceBuffer.trim()) {
          enqueueSentenceForSpeech(sentenceBuffer.trim());
        }

        if (accumulatedFull.trim()) {
          // Registrar respuesta de Nora en el historial persistente de la llamada
          conversationHistoryRef.current.push({ role: "assistant", content: accumulatedFull.trim() });
          setCallHistory(prev => [...prev, { role: "assistant", text: accumulatedFull.trim() }]);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("[Call Stream Error]:", err);
          setErrorMsg("Error de conexión durante la llamada.");
          setStatus("listening");
          activateMicrophoneSafely();
        }
      } finally {
        isStreamActiveRef.current = false;
        // Si Nora finalizó la locución y no hay oraciones en cola, reactivar el micrófono inmediatamente
        if (!isSpeakingRef.current && speechQueueRef.current.length === 0) {
          setStatus("listening");
          activateMicrophoneSafely();
        }
      }
    },
    [sessionId, enqueueSentenceForSpeech, activateMicrophoneSafely]
  );

  // ── 3. INICIALIZAR RECONOCIMIENTO CONTINUO AL ABRIR LA LLAMADA ──
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") {
      isCallAliveRef.current = false;
      return;
    }

    isCallAliveRef.current = true;
    setErrorMsg(null);
    setStatus("connecting");
    setCallDuration(0);
    setUserTranscript("");
    setAssistantText("");
    speechQueueRef.current = [];
    isSpeakingRef.current = false;

    // Solo reiniciar el historial si esta es una NUEVA llamada
    if (!isCallInitializedRef.current) {
      conversationHistoryRef.current = [];
      setCallHistory([]);
      isCallInitializedRef.current = true;
      callLanguageRef.current = "es-419";
    }

    // Cronómetro de llamada
    callTimerRef.current = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Tu navegador no soporta reconocimiento de voz continuo.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      if (isCallAliveRef.current && statusRef.current !== "speaking" && statusRef.current !== "thinking") {
        setStatus("listening");
      }
    };

    rec.onresult = (event: any) => {
      if (!isCallAliveRef.current) return;
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }

      const currentSpeech = (final || interim).trim();
      if (!currentSpeech) return;

      setUserTranscript(currentSpeech);
      transcriptHistoryRef.current = currentSpeech;

      // Si está en modo PTT, esperamos a que suelte el botón
      if (pttModeRef.current) return;

      // Detección de pausa natural en llamada manos libres
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(() => {
        const textToSend = transcriptHistoryRef.current.trim();
        if (textToSend && isCallAliveRef.current && statusRef.current === "listening") {
          sendQueryToStream(textToSend);
          transcriptHistoryRef.current = "";
        }
      }, 850);
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      if (e.error === "not-allowed") {
        setErrorMsg("Permiso de micrófono denegado.");
      }
    };

    rec.onend = () => {
      // Si la llamada sigue viva y estamos en modo escucha, reactivar automáticamente
      if (!isCallAliveRef.current) return;
      if (statusRef.current === "listening" && !isSpeakingRef.current && !isStreamActiveRef.current && !isMutedRef.current && !pttModeRef.current) {
        try { rec.start(); } catch {}
      }
    };

    recognitionRef.current = rec;

    // Pre-cargar voces nativas del navegador
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // Conectar llamada de inmediato
    try {
      rec.start();
      setStatus("listening");
    } catch {}

    // Saludo de bienvenida automático si inicia la llamada
    const welcomeChimeTimeout = setTimeout(() => {
      if (isCallAliveRef.current) {
        enqueueSentenceForSpeech("Hola, gracias por comunicarte. Soy Nora, su asistente virtual. ¿En qué puedo ayudarle hoy?");
      }
    }, 400);

    // ── WATCHDOG / VALIDADOR DE ESTADO: MANTIENE EL BUCLE CONTINUO ACTIVO ──
    const voiceWatchdog = setInterval(() => {
      if (!isCallAliveRef.current) return;

      // 1. Evitar que Chrome suspenda SpeechSynthesis a los 15s
      if (isSpeakingRef.current && typeof window !== "undefined" && "speechSynthesis" in window) {
        if (window.speechSynthesis.paused) {
          try { window.speechSynthesis.resume(); } catch {}
        }
      }

      // 2. Validador de escucha: si Nora finalizó y no estamos en mute ni PTT, asegurar que el micrófono está activo
      if (
        statusRef.current === "listening" &&
        !isSpeakingRef.current &&
        !isStreamActiveRef.current &&
        !isMutedRef.current &&
        !pttModeRef.current
      ) {
        activateMicrophoneSafely();
      }
    }, 1200);

    return () => {
      // LIMPIEZA ABSOLUTA AL CERRAR O DESMONTAR EL MODAL
      isCallAliveRef.current = false;
      isCallInitializedRef.current = false;
      isStreamActiveRef.current = false;
      clearTimeout(welcomeChimeTimeout);
      clearInterval(voiceWatchdog);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        const r = recognitionRef.current;
        recognitionRef.current = null;
        r.onend = null;
        r.onerror = null;
        r.onresult = null;
        try { r.abort(); } catch {}
        try { r.stop(); } catch {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      speechQueueRef.current = [];
      isSpeakingRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── 4. CONTROLES DE LA LLAMADA ──
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (status === "listening" && isCallAliveRef.current && recognitionRef.current) {
        try { recognitionRef.current.start(); } catch {}
      }
    } else {
      setIsMuted(true);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    }
  };

  const handleEndCall = () => {
    // 1. Apagar flag de vida inmediatamente
    isCallAliveRef.current = false;
    isCallInitializedRef.current = false;

    // 2. Abortar petición de red si está en vuelo
    if (abortControllerRef.current) abortControllerRef.current.abort();

    // 3. Detener y purgar síntesis de voz y stream neural
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    speechQueueRef.current = [];
    isSpeakingRef.current = false;

    // 4. Detener y desvincular reconocimiento de voz
    if (recognitionRef.current) {
      const r = recognitionRef.current;
      recognitionRef.current = null;
      r.onend = null;
      r.onerror = null;
      r.onresult = null;
      try { r.abort(); } catch {}
      try { r.stop(); } catch {}
    }

    // 5. Limpiar temporizadores
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

    // 6. Notificar al componente padre
    onClose();
  };

  // Manejo de PTT Manual (si el usuario activa ese modo)
  const handlePttDown = () => {
    if (!pttMode || !recognitionRef.current) return;
    setIsPressingPTT(true);
    setStatus("listening");
    setUserTranscript("");
    transcriptHistoryRef.current = "";
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    try { recognitionRef.current.start(); } catch {}
  };

  const handlePttUp = () => {
    if (!pttMode || !recognitionRef.current) return;
    setIsPressingPTT(false);
    try { recognitionRef.current.stop(); } catch {}
    setTimeout(() => {
      const text = transcriptHistoryRef.current.trim();
      if (text) {
        sendQueryToStream(text);
      } else {
        setStatus("listening");
      }
    }, 200);
  };

  const handleSendManualText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || status === "thinking") return;
    const msg = textInput.trim();
    setTextInput("");
    sendQueryToStream(msg);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleEndCall}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(2, 4, 8, 0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#05070c",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "28px",
          width: "100%",
          maxWidth: "420px",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "#ffffff",
          boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.95), 0 0 35px rgba(56, 189, 248, 0.1)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Cabecera de la llamada */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "9px",
                height: "9px",
                borderRadius: "50%",
                backgroundColor: status === "listening" ? "#22c55e" : status === "speaking" ? "#38bdf8" : "#f59e0b",
                boxShadow: status === "listening" ? "0 0 10px #22c55e" : status === "speaking" ? "0 0 10px #38bdf8" : "0 0 10px #f59e0b"
              }}
            />
            <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "0.04em", color: "#ffffff" }}>
              Nora Itu <span style={{ color: "#38bdf8" }}>PRO</span>
            </span>
            <span style={{ fontSize: "11px", backgroundColor: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.25)", padding: "2px 8px", borderRadius: "12px", fontWeight: 700, letterSpacing: "0.03em" }}>
              {formatTimer(callDuration)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setShowTranscript(s => !s)}
              title={showTranscript ? "Ocultar transcripción" : "Ver transcripción"}
              style={{
                background: showTranscript ? "rgba(255, 255, 255, 0.08)" : "none",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "10px",
                padding: "7px",
                color: "#94a3b8",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={handleEndCall}
              title="Cerrar llamada"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#f87171",
                cursor: "pointer"
              }}
            >
              <PhoneOff size={15} />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ width: "100%", backgroundColor: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", padding: "8px 12px", marginBottom: "14px", fontSize: "12px", color: "#fca5a5", textAlign: "center" }}>
            {errorMsg}
          </div>
        )}

        {/* ─── ESFERA DE AUDIO REACTIVA / NORA AVATAR ─── */}
        <div style={{ position: "relative", margin: "14px 0 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Ondas pulsantes de fondo */}
          <div
            style={{
              position: "absolute",
              width: status === "speaking" ? "145px" : status === "listening" ? "130px" : "115px",
              height: status === "speaking" ? "145px" : status === "listening" ? "130px" : "115px",
              borderRadius: "50%",
              backgroundColor: status === "speaking" ? "rgba(56, 189, 248, 0.2)" : status === "listening" ? "rgba(34, 197, 94, 0.15)" : "rgba(99, 102, 241, 0.1)",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              transition: "all 0.3s ease"
            }}
          />

          <div
            style={{
              position: "relative",
              width: "92px",
              height: "92px",
              borderRadius: "50%",
              border: `2px solid ${status === "speaking" ? "#38bdf8" : status === "listening" ? "#4ade80" : "#6366f1"}`,
              boxShadow: `0 0 25px ${status === "speaking" ? "rgba(56, 189, 248, 0.4)" : status === "listening" ? "rgba(74, 222, 128, 0.4)" : "rgba(99, 102, 241, 0.25)"}`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0b0f19",
              transition: "all 0.3s ease"
            }}
          >
            <img
              src="/avatar-nora.png"
              alt="Nora"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            {status === "thinking" && (
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={28} className="animate-spin" color="#38bdf8" />
              </div>
            )}
          </div>
        </div>

        {/* Estado conversacional dinámico */}
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          <div style={{ fontSize: "13.5px", fontWeight: 700, letterSpacing: "0.03em", color: status === "speaking" ? "#38bdf8" : status === "listening" ? "#4ade80" : status === "thinking" ? "#fbbf24" : "#ffffff" }}>
            {status === "listening" && (isMuted ? "Micrófono Silenciado" : "● Nora te escucha con atención")}
            {status === "speaking" && "● Nora te está hablando..."}
            {status === "thinking" && "● Nora está procesando..."}
            {status === "connecting" && "● Conectando llamada neural..."}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", letterSpacing: "0.02em" }}>
            {!pttMode ? "Llamada manos libres continua • Habla normalmente" : "Modo PTT activado • Mantén presionado para hablar"}
          </div>
        </div>

        {/* ─── PANEL DE TRANSCRIPCIÓN CONVERSACIONAL EN VIVO ─── */}
        {showTranscript && (
          <div
            style={{
              width: "100%",
              minHeight: "120px",
              maxHeight: "170px",
              backgroundColor: "rgba(10, 15, 26, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "16px",
              padding: "12px 14px",
              overflowY: "auto",
              marginBottom: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px"
            }}
          >
            {callHistory.map((item, idx) => (
              <div key={idx} style={{ lineHeight: "1.45" }}>
                <span style={{ fontWeight: 700, letterSpacing: "0.02em", color: item.role === "user" ? "#38bdf8" : "#a78bfa" }}>
                  {item.role === "user" ? "Tú: " : "Nora: "}
                </span>
                <span style={{ color: "#ffffff" }}>{item.text}</span>
              </div>
            ))}

            {/* Texto en progreso */}
            {userTranscript && (
              <div style={{ lineHeight: "1.45", fontStyle: "italic", opacity: 0.9 }}>
                <span style={{ fontWeight: 700, color: "#38bdf8" }}>Tú (hablando): </span>
                <span style={{ color: "#93c5fd" }}>{userTranscript}</span>
              </div>
            )}
            {status === "speaking" && assistantText && !callHistory.some(h => h.text === assistantText) && (
              <div style={{ lineHeight: "1.45" }}>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>Nora: </span>
                <span style={{ color: "#ffffff" }}>{assistantText}</span>
              </div>
            )}

            {callHistory.length === 0 && !userTranscript && !assistantText && (
              <div style={{ color: "#64748b", margin: "auto", textAlign: "center", fontSize: "12px", letterSpacing: "0.02em" }}>
                Habla con naturalidad. Nora responderá con voz neural hiperrealista.
              </div>
            )}
          </div>
        )}

        {/* ─── CONTROLES PRINCIPALES DE LLAMADA (Círculo centrado elegante #dc2626) ─── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "22px", marginBottom: "18px", width: "100%" }}>
          {/* Silenciar micrófono */}
          <button
            onClick={toggleMute}
            title={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: isMuted ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.1)",
              backgroundColor: isMuted ? "rgba(239, 68, 68, 0.2)" : "rgba(15, 23, 42, 0.7)",
              color: isMuted ? "#f87171" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)"
            }}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Botón PTT Opcional o Botón Centrado de Finalizar Llamada */}
          {pttMode ? (
            <button
              onMouseDown={handlePttDown}
              onMouseUp={handlePttUp}
              onTouchStart={(e) => { e.preventDefault(); handlePttDown(); }}
              onTouchEnd={(e) => { e.preventDefault(); handlePttUp(); }}
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: isPressingPTT ? "#dc2626" : "#16a34a",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: isPressingPTT ? "0 0 25px rgba(220, 38, 38, 0.6)" : "0 6px 20px rgba(22, 163, 74, 0.4)",
                transform: isPressingPTT ? "scale(0.96)" : "scale(1)",
                transition: "all 0.15s ease"
              }}
            >
              <Radio size={24} />
              <span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px", letterSpacing: "0.04em" }}>
                {isPressingPTT ? "SOLTAR" : "HABLAR"}
              </span>
            </button>
          ) : (
            /* Botón de Finalizar Llamada centrado de forma elegante */
            <button
              onClick={handleEndCall}
              title="Cortar llamada"
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                border: "none",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(220, 38, 38, 0.45), 0 0 12px rgba(220, 38, 38, 0.25)",
                transition: "transform 0.15s ease",
              }}
            >
              <PhoneOff size={24} />
              <span style={{ fontSize: "9px", fontWeight: 800, marginTop: "3px", letterSpacing: "0.06em" }}>CORTAR</span>
            </button>
          )}

          {/* Toggle PTT / Manos Libres */}
          <button
            onClick={() => setPttMode(p => !p)}
            title={pttMode ? "Cambiar a Manos Libres" : "Cambiar a Push To Talk"}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: pttMode ? "2px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
              backgroundColor: pttMode ? "rgba(56, 189, 248, 0.18)" : "rgba(15, 23, 42, 0.7)",
              color: pttMode ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.4)"
            }}
          >
            <Radio size={20} />
          </button>
        </div>

        {/* Input de texto complementario */}
        <form onSubmit={handleSendManualText} style={{ width: "100%", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="O escribe algo aquí durante la llamada..."
            style={{
              flex: 1,
              backgroundColor: "rgba(10, 15, 26, 0.8)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "9999px",
              padding: "10px 16px",
              color: "#ffffff",
              fontSize: "13px",
              outline: "none",
              letterSpacing: "0.02em"
            }}
          />
          <button
            type="submit"
            disabled={!textInput.trim() || status === "thinking"}
            style={{
              backgroundColor: textInput.trim() ? "#0284c7" : "rgba(255, 255, 255, 0.05)",
              border: "none",
              borderRadius: "9999px",
              padding: "0 16px",
              color: "#ffffff",
              cursor: textInput.trim() ? "pointer" : "default"
            }}
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
