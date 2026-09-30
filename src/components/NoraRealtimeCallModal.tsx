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
  // IMPORTANTE: Este ref NO se debe limpiar en cada re-render del useEffect.
  // Solo se limpia cuando isOpen pasa de false a true (nueva llamada).
  const conversationHistoryRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const isCallInitializedRef = useRef<boolean>(false);
  const pttModeRef = useRef<boolean>(false);

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

  // Detección automática de idioma para los 5 idiomas principales
  const detectSentenceLanguage = (text: string): string => {
    const t = text.toLowerCase();
    if (/\b(the|and|is|you|that|this|with|for|are|have|from|in|what|how|hello|thank|welcome|please|world)\b/i.test(t)) return "en-US";
    if (/\b(você|voce|não|nao|com|para|uma|este|obrigado|muito|tudo|fazer|olá|ola|bom|dia|senhor)\b/i.test(t)) return "pt-BR";
    if (/\b(le|la|les|des|du|avec|pour|dans|est|vous|nous|merci|bonjour|s'il|oui|non|monde)\b/i.test(t)) return "fr-FR";
    if (/\b(il|lo|la|i|gli|le|di|con|per|sono|grazie|ciao|questo|bene|perché|perche|mondo)\b/i.test(t)) return "it-IT";
    return "es-419";
  };

  // Limpieza segura de símbolos sin mutilar palabras que contengan "at", "barra", etc.
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

  // ── 1. PROCESADOR DE COLA TTS STREAMING MULTI-IDIOMA ──
  const processNextSpeechSentence = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;

    const rawSentence = speechQueueRef.current.shift()?.trim();
    const sentence = rawSentence ? cleanForSpeech(rawSentence) : "";
    if (!sentence) {
      if (speechQueueRef.current.length === 0 && statusRef.current === "speaking") {
        setStatus("listening");
        if (!isMutedRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
      }
      return;
    }

    isSpeakingRef.current = true;
    setStatus("speaking");

    // Pausar reconocimiento para que Nora no se escuche a sí misma
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const lang = detectSentenceLanguage(sentence);
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = lang.split("-")[0];
    const voice =
      voices.find(v => v.lang.toLowerCase() === lang.toLowerCase()) ||
      voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) ||
      voices.find(v => v.name.includes("Google") && v.lang.startsWith(langPrefix)) ||
      voices.find(v => v.name.includes("Sabina") || v.name.includes("Elena") || v.name.includes("Paulina") || v.name.includes("Monica")) ||
      voices.find(v => v.lang.startsWith("es"));
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processNextSpeechSentence();
      } else {
        setStatus("listening");
        if (!isMutedRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processNextSpeechSentence();
      } else {
        setStatus("listening");
        if (!isMutedRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  }, []);

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
              "Eres Nora Itu, asistente de inteligencia artificial creada por MyJNexoraVisual. MODO LLAMADA TELEFÓNICA ACTIVO. Tu estilo es el de una profesional de primer nivel: cálida, empática, segura y directa, como una recepcionista de hotel cinco estrellas. REGLA ABSOLUTA: Hablas EXCLUSIVAMENTE en ESPAÑOL NEUTRO LATINOAMERICANO. Las siguientes palabras están PROHIBIDAS: 'che', 'sos', 'tenés', 'podés', 'laburar', 'posta', 'copado', 'boludo', 'dale', 'mirá', 'pibe'. Usa SIEMPRE: 'tienes', 'puedes', 'eres', 'sabes'. Todas las palabras deben ser COMPLETAS: 'corporativo' (no 'corporivo'), 'tomate', 'chocolate', 'zapatillas'. Dominas una Matriz de Idiomas con diccionarios perfectos en Español, Inglés, Portugués, Francés e Italiano. Tienes prohibido inventar, truncar o distorsionar palabras. Eres traductora de élite si el usuario cambia de idioma. Respuestas concisas, fluidas y naturales para llamada. Texto plano limpio, sin asteriscos ni markdown.",
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
          if (!isMutedRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        }
      }
    },
    [sessionId, enqueueSentenceForSpeech]
  );

  // ── 3. INICIALIZAR RECONOCIMIENTO CONTINUO AL ABRIR LA LLAMADA ──
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    setErrorMsg(null);
    setStatus("connecting");
    setCallDuration(0);
    setUserTranscript("");
    setAssistantText("");
    speechQueueRef.current = [];
    isSpeakingRef.current = false;

    // Solo reiniciar el historial si esta es una NUEVA llamada (isOpen acaba de pasar a true)
    // Evitar borrar el historial en re-renders causados por cambios de pttMode u otras deps
    if (!isCallInitializedRef.current) {
      conversationHistoryRef.current = [];
      setCallHistory([]);
      isCallInitializedRef.current = true;
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
      if (statusRef.current !== "speaking" && statusRef.current !== "thinking") {
        setStatus("listening");
      }
    };

    rec.onresult = (event: any) => {
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

      // Detección de pausa natural en llamada manos libres:
      // Reiniciar el timer de silencio en cada palabra dicha
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(() => {
        const textToSend = transcriptHistoryRef.current.trim();
        if (textToSend && statusRef.current === "listening") {
          sendQueryToStream(textToSend);
          transcriptHistoryRef.current = "";
        }
      }, 850); // 850ms de pausa natural indican fin de frase en conversación real
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return;
      if (e.error === "not-allowed") {
        setErrorMsg("Permiso de micrófono denegado.");
      }
    };

    rec.onend = () => {
      // Si la llamada sigue activa y no está hablando Nora ni muteado el mic, reactivarlo
      if (isOpen && statusRef.current === "listening" && !isMutedRef.current && !pttModeRef.current) {
        try { rec.start(); } catch {}
      }
    };

    recognitionRef.current = rec;

    // Conectar llamada de inmediato
    try {
      rec.start();
      setStatus("listening");
    } catch {}

    // Saludo de bienvenida automático si inicia la llamada
    const welcomeChimeTimeout = setTimeout(() => {
      enqueueSentenceForSpeech("Hola, gracias por comunicarte. Soy Nora, su asistente virtual. ¿En qué puedo ayudarle hoy?");
    }, 400);

    return () => {
      clearTimeout(welcomeChimeTimeout);
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      // Cuando isOpen era true al montar este efecto y ahora se desmonta porque isOpen → false,
      // marcamos para reinicio limpio la próxima llamada.
      // Si isOpen sigue true (efecto se re-ejecutó por pttMode), NO tocamos el flag.
      if (!isOpen) {
        isCallInitializedRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── 4. CONTROLES DE LA LLAMADA ──
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (status === "listening" && recognitionRef.current) {
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
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(3, 7, 18, 0.88)",
        backdropFilter: "blur(18px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      <div
        style={{
          backgroundColor: "#0b0f19",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: "28px",
          width: "100%",
          maxWidth: "460px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "#f8fafc",
          boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.85), 0 0 40px rgba(99, 102, 241, 0.15)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Cabecera de la llamada */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: status === "listening" ? "#22c55e" : status === "speaking" ? "#a855f7" : "#eab308",
                boxShadow: status === "listening" ? "0 0 10px #22c55e" : "0 0 10px #a855f7"
              }}
            />
            <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "0.3px" }}>Llamada con Nora</span>
            <span style={{ fontSize: "11px", backgroundColor: "rgba(99,102,241,0.18)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
              {formatTimer(callDuration)}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => setShowTranscript(s => !s)}
              title={showTranscript ? "Ocultar texto" : "Ver texto"}
              style={{
                background: showTranscript ? "rgba(255,255,255,0.1)" : "none",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "6px",
                color: "#94a3b8",
                cursor: "pointer"
              }}
            >
              <MessageSquare size={15} />
            </button>
            <button
              onClick={handleEndCall}
              title="Cerrar llamada"
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
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
          <div style={{ width: "100%", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "10px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: "#fca5a5", textAlign: "center" }}>
            {errorMsg}
          </div>
        )}

        {/* ─── ESFERA DE AUDIO REACTIVA / NORA AVATAR ─── */}
        <div style={{ position: "relative", margin: "16px 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Ondas pulsantes de fondo */}
          <div
            style={{
              position: "absolute",
              width: status === "speaking" ? "140px" : status === "listening" ? "125px" : "110px",
              height: status === "speaking" ? "140px" : status === "listening" ? "125px" : "110px",
              borderRadius: "50%",
              backgroundColor: status === "speaking" ? "rgba(168, 85, 247, 0.25)" : status === "listening" ? "rgba(34, 197, 94, 0.2)" : "rgba(99, 102, 241, 0.15)",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              transition: "all 0.3s ease"
            }}
          />

          <div
            style={{
              position: "relative",
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              border: `3px solid ${status === "speaking" ? "#c084fc" : status === "listening" ? "#4ade80" : "#6366f1"}`,
              boxShadow: `0 0 25px ${status === "speaking" ? "rgba(192,132,252,0.5)" : status === "listening" ? "rgba(74,222,128,0.5)" : "rgba(99,102,241,0.3)"}`,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#111827",
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
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Loader2 size={28} className="animate-spin" color="#c084fc" />
              </div>
            )}
          </div>
        </div>

        {/* Estado conversacional dinámico */}
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: status === "speaking" ? "#c084fc" : status === "listening" ? "#4ade80" : status === "thinking" ? "#e3b341" : "#94a3b8" }}>
            {status === "listening" && (isMuted ? "Micrófono Silenciado" : "● Nora te escucha con atención...")}
            {status === "speaking" && "● Nora te está hablando..."}
            {status === "thinking" && "● Nora está pensando la respuesta..."}
            {status === "connecting" && "● Conectando llamada..."}
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            {!pttMode ? "Llamada manos libres activa · Hablá normalmente" : "Modo PTT activado · Mantené presionado para hablar"}
          </div>
        </div>

        {/* ─── PANEL DE TRANSCRIPCIÓN CONVERSACIONAL EN VIVO ─── */}
        {showTranscript && (
          <div
            style={{
              width: "100%",
              minHeight: "130px",
              maxHeight: "180px",
              backgroundColor: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "12px 14px",
              overflowY: "auto",
              marginBottom: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              fontSize: "13px"
            }}
          >
            {callHistory.map((item, idx) => (
              <div key={idx} style={{ lineHeight: "1.4" }}>
                <span style={{ fontWeight: 700, color: item.role === "user" ? "#38bdf8" : "#c084fc" }}>
                  {item.role === "user" ? "Vos: " : "Nora: "}
                </span>
                <span style={{ color: "#e2e8f0" }}>{item.text}</span>
              </div>
            ))}

            {/* Texto en progreso */}
            {userTranscript && (
              <div style={{ lineHeight: "1.4", fontStyle: "italic", opacity: 0.9 }}>
                <span style={{ fontWeight: 700, color: "#38bdf8" }}>Vos (hablando): </span>
                <span style={{ color: "#93c5fd" }}>{userTranscript}</span>
              </div>
            )}
            {status === "speaking" && assistantText && !callHistory.some(h => h.text === assistantText) && (
              <div style={{ lineHeight: "1.4" }}>
                <span style={{ fontWeight: 700, color: "#c084fc" }}>Nora: </span>
                <span style={{ color: "#f8fafc" }}>{assistantText}</span>
              </div>
            )}

            {callHistory.length === 0 && !userTranscript && !assistantText && (
              <div style={{ color: "#64748b", margin: "auto", textAlign: "center", fontSize: "12px" }}>
                Hablá con libertad. Nora te escucha y responde de inmediato.
              </div>
            )}
          </div>
        )}

        {/* ─── CONTROLES PRINCIPALES DE LLAMADA ─── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginBottom: "16px", width: "100%" }}>
          {/* Silenciar micrófono */}
          <button
            onClick={toggleMute}
            title={isMuted ? "Activar micrófono" : "Silenciar micrófono"}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: isMuted ? "2px solid #ef4444" : "1px solid rgba(255,255,255,0.15)",
              backgroundColor: isMuted ? "rgba(239,68,68,0.2)" : "rgba(30,41,59,0.8)",
              color: isMuted ? "#f87171" : "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Botón PTT Opcional si el modo PTT está activo */}
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
                boxShadow: isPressingPTT ? "0 0 25px rgba(220,38,38,0.7)" : "0 6px 20px rgba(22,163,74,0.4)",
                transform: isPressingPTT ? "scale(0.95)" : "scale(1)",
                transition: "all 0.15s ease"
              }}
            >
              <Radio size={24} />
              <span style={{ fontSize: "10px", fontWeight: 700, marginTop: "2px" }}>
                {isPressingPTT ? "SOLTÁ" : "HABLAR"}
              </span>
            </button>
          ) : (
            /* Botón de Finalizar Llamada en manos libres */
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
                boxShadow: "0 8px 25px rgba(220, 38, 38, 0.45)",
                transition: "transform 0.15s ease",
              }}
            >
              <PhoneOff size={24} />
              <span style={{ fontSize: "9.5px", fontWeight: 700, marginTop: "2px" }}>CORTAR</span>
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
              border: pttMode ? "2px solid #38bdf8" : "1px solid rgba(255,255,255,0.15)",
              backgroundColor: pttMode ? "rgba(56,189,248,0.2)" : "rgba(30,41,59,0.8)",
              color: pttMode ? "#38bdf8" : "#94a3b8",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <Radio size={19} />
          </button>
        </div>

        {/* Input de texto complementario por si el usuario prefiere escribir algo puntual */}
        <form onSubmit={handleSendManualText} style={{ width: "100%", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="O escribe algo aquí durante la llamada..."
            style={{
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              padding: "9px 12px",
              color: "#f8fafc",
              fontSize: "12.5px",
              outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={!textInput.trim() || status === "thinking"}
            style={{
              backgroundColor: textInput.trim() ? "#6366f1" : "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: "12px",
              padding: "0 14px",
              color: "#ffffff",
              cursor: textInput.trim() ? "pointer" : "default"
            }}
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
