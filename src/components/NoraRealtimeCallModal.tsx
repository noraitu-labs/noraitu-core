"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, PhoneOff, Volume2, Sparkles, Send } from "lucide-react";

interface NoraRealtimeCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
}

export default function NoraRealtimeCallModal({
  isOpen,
  onClose,
  sessionId = `session_${Date.now()}`
}: NoraRealtimeCallModalProps) {
  const [isPressingPTT, setIsPressingPTT] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [assistantText, setAssistantText] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "listening" | "streaming" | "speaking">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [textInput, setTextInput] = useState<string>("");

  const recognitionRef = useRef<any>(null);
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inicializar Web Speech Recognition nativo en espaol argentino
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMsg("Tu navegador no soporta Web Speech Recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let currentInterim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentInterim += event.results[i][0].transcript;
      }
      setTranscript(currentInterim);
    };

    recognition.onerror = (e: any) => {
      console.warn("[SpeechRecognition Error]:", e.error);
      if (e.error === "not-allowed") {
        setErrorMsg("Permiso de micrfono denegado en el navegador.");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  // Cola y reproduccin continua con window.speechSynthesis
  const processNextSpeechSentence = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;

    const sentence = speechQueueRef.current.shift()?.trim();
    if (!sentence) {
      if (speechQueueRef.current.length === 0 && status === "speaking") {
        setStatus("idle");
      }
      return;
    }

    isSpeakingRef.current = true;
    setStatus("speaking");

    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = "es-AR";
    utterance.rate = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const spanishVoice = voices.find(
      (v) => v.lang.startsWith("es-AR") || v.lang.startsWith("es-419") || v.lang.startsWith("es")
    );
    if (spanishVoice) utterance.voice = spanishVoice;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      if (speechQueueRef.current.length > 0) {
        processNextSpeechSentence();
      } else {
        setStatus("idle");
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      processNextSpeechSentence();
    };

    window.speechSynthesis.speak(utterance);
  }, [status]);

  const enqueueSentenceForSpeech = useCallback(
    (textChunk: string) => {
      speechQueueRef.current.push(textChunk);
      if (!isSpeakingRef.current) {
        processNextSpeechSentence();
      }
    },
    [processNextSpeechSentence]
  );

  // Consumo del Stream de la API
  const sendQueryToStream = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setStatus("streaming");
      setAssistantText("");
      speechQueueRef.current = [];
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      isSpeakingRef.current = false;

      try {
        const response = await fetch("/api/noraitu-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userMessage: userMessage.trim(),
            sessionId
          }),
          signal: controller.signal
        });

        if (!response.ok || !response.body) {
          throw new Error(`Error en stream: ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sentenceBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const payload = trimmed.replace(/^data:\s*/, "");
            if (payload === "[DONE]") break;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                setAssistantText((prev) => prev + parsed.text);
                sentenceBuffer += parsed.text;

                const splitIndex = sentenceBuffer.search(/[.?!;\n]/);
                if (splitIndex !== -1) {
                  const sentenceToSpeak = sentenceBuffer.slice(0, splitIndex + 1);
                  sentenceBuffer = sentenceBuffer.slice(splitIndex + 1);
                  enqueueSentenceForSpeech(sentenceToSpeak);
                }
              }
            } catch {}
          }
        }

        if (sentenceBuffer.trim()) {
          enqueueSentenceForSpeech(sentenceBuffer.trim());
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("[Stream Reader Error]:", err);
          setErrorMsg("Error al conectar con Nora Itu.");
          setStatus("idle");
        }
      }
    },
    [sessionId, enqueueSentenceForSpeech]
  );

  const startPTT = useCallback(() => {
    if (!recognitionRef.current) return;
    setErrorMsg(null);
    setTranscript("");
    setIsPressingPTT(true);
    setStatus("listening");

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    speechQueueRef.current = [];

    try {
      recognitionRef.current.start();
    } catch {}
  }, []);

  const stopPTT = useCallback(() => {
    if (!recognitionRef.current) return;
    setIsPressingPTT(false);

    try {
      recognitionRef.current.stop();
    } catch {}

    setTimeout(() => {
      setTranscript((current) => {
        if (current.trim()) {
          sendQueryToStream(current.trim());
        } else {
          setStatus("idle");
        }
        return current;
      });
    }, 250);
  }, [sendQueryToStream]);

  const handleClose = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    isSpeakingRef.current = false;
    speechQueueRef.current = [];
    setStatus("idle");
    onClose();
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || status === "streaming") return;
    const msg = textInput.trim();
    setTextInput("");
    setTranscript(msg);
    sendQueryToStream(msg);
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <div
        style={{
          backgroundColor: "#0d1117",
          border: "1px solid #21262d",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "480px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "#f0f6fc",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
        }}
      >
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={20} color="#a855f7" />
            <span style={{ fontWeight: 700, fontSize: "17px" }}>Nora Itu Live</span>
            <span style={{ fontSize: "11px", backgroundColor: "#1f6feb22", color: "#58a6ff", border: "1px solid #1f6feb44", padding: "2px 8px", borderRadius: "12px" }}>
              Neon Core
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: "#21262d",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#8b949e",
              cursor: "pointer"
            }}
          >
            <PhoneOff size={16} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ width: "100%", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid #ef4444", borderRadius: "10px", padding: "8px 12px", marginBottom: "12px", fontSize: "12px", color: "#fca5a5", textAlign: "center" }}>
            {errorMsg}
          </div>
        )}

        <div
          style={{
            width: "100%",
            minHeight: "180px",
            maxHeight: "240px",
            backgroundColor: "#161b22",
            border: "1px solid #30363d",
            borderRadius: "16px",
            padding: "16px",
            overflowY: "auto",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "14px"
          }}
        >
          {transcript && (
            <div>
              <span style={{ color: "#58a6ff", fontWeight: 600 }}>T: </span>
              <span style={{ color: "#c9d1d9" }}>{transcript}</span>
            </div>
          )}
          {assistantText ? (
            <div>
              <span style={{ color: "#d2a8ff", fontWeight: 600 }}>Nora: </span>
              <span style={{ color: "#f0f6fc" }}>{assistantText}</span>
            </div>
          ) : (
            !transcript && (
              <div style={{ color: "#6e7681", margin: "auto", textAlign: "center", fontSize: "13px" }}>
                Presiona y mantn el botn PTT para hablar con Nora o escribe abajo.
              </div>
            )
          )}
        </div>

        <div style={{ marginBottom: "16px", fontSize: "12px", fontWeight: 600, color: status === "listening" ? "#58a6ff" : status === "streaming" ? "#e3b341" : status === "speaking" ? "#d2a8ff" : "#8b949e" }}>
          {status === "listening" && "● Escuchando tu voz..."}
          {status === "streaming" && "● Conectando con Nora Itu..."}
          {status === "speaking" && "● Nora est respondiendo..."}
          {status === "idle" && "Listo para hablar"}
        </div>

        {/* Botn Push-To-Talk */}
        <button
          onMouseDown={startPTT}
          onMouseUp={stopPTT}
          onTouchStart={(e) => {
            e.preventDefault();
            startPTT();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopPTT();
          }}
          style={{
            width: "90px",
            height: "90px",
            borderRadius: "50%",
            border: "none",
            outline: "none",
            backgroundColor: isPressingPTT ? "#da3633" : "#238636",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: isPressingPTT ? "0 0 25px rgba(218, 54, 51, 0.7)" : "0 8px 24px rgba(35, 134, 54, 0.4)",
            transform: isPressingPTT ? "scale(0.94)" : "scale(1)",
            transition: "all 0.15s ease",
            userSelect: "none",
            marginBottom: "16px"
          }}
        >
          <Mic size={28} />
          <span style={{ fontSize: "11px", fontWeight: 700, marginTop: "4px" }}>
            {isPressingPTT ? "SOLT" : "PTT"}
          </span>
        </button>

        {/* Input alternativo por texto */}
        <form onSubmit={handleSendText} style={{ width: "100%", display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="O escribe un mensaje..."
            style={{
              flex: 1,
              backgroundColor: "#161b22",
              border: "1px solid #30363d",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#f0f6fc",
              fontSize: "13px",
              outline: "none"
            }}
          />
          <button
            type="submit"
            disabled={!textInput.trim() || status === "streaming"}
            style={{
              backgroundColor: textInput.trim() ? "#1f6feb" : "#21262d",
              border: "none",
              borderRadius: "10px",
              padding: "0 14px",
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
