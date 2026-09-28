"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  Trash2, 
  Copy, 
  Check, 
  Bot, 
  User, 
  Mic, 
  MicOff, 
  Camera, 
  Image as ImageIcon, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff, 
  FlipHorizontal, 
  X, 
  Eye, 
  Puzzle, 
  Zap, 
  PhoneCall,
  Loader2,
  RefreshCw,
  Layers
} from "lucide-react";
import NoraRealtimeCallModal from "../components/NoraRealtimeCallModal";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageBase64?: string | null;
  mode?: "general" | "tea" | "lazarillo";
  timestamp: string;
}

export default function NoraTitanUniversalPage() {
  // Estados de Chat y Sesión
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<"general" | "tea" | "lazarillo">("general");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados de Imagen Adjunta
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Estados de Conectividad Offline
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Estados de Audio / TTS
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // Estados de Dictado por Voz (STT)
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Estados de Modal Realtime Call
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Estados de Cámara Multimodal Titán
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraCapturing, setCameraCapturing] = useState<boolean>(false);
  const [cameraAnalysisResult, setCameraAnalysisResult] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Inicialización de Sesión, Storage Offline y Escucha de Conectividad
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Conectividad
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // ID de Sesión
    const storedSession = localStorage.getItem("noraitu_session_id") || `nora_${Date.now()}`;
    setSessionId(storedSession);
    localStorage.setItem("noraitu_session_id", storedSession);

    // Mensajes guardados offline
    const saved = localStorage.getItem(`noraitu_history_${storedSession}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {}
    } else {
      setMessages([
        {
          id: "welcome_1",
          role: "assistant",
          content: "¡Hola! Soy Nora Titán Universal, la superinteligencia agéntica de Ituzaingó. Estoy lista para asistirte con chat de alta velocidad, análisis visual con tu cámara y modo de inclusión TEA. ¿En qué te puedo ayudar hoy?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          mode: "general"
        }
      ]);
    }

    // Inicializar Web Speech Recognition nativo
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-AR";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputMessage(transcript);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Guardar en Storage al actualizar mensajes
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;
    localStorage.setItem(`noraitu_history_${sessionId}`, JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sessionId]);

  // Manejo de Cámara Multimodal Titán
  const startCamera = async (mode: "user" | "environment") => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
      setCameraAnalysisResult("");
    } catch (err) {
      alert("No se pudo acceder a la cámara. Por favor autoriza los permisos de video.");
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCameraAnalysisResult("");
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const captureFrameFromCamera = (): string | null => {
    if (!videoRef.current) return null;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  };

  // Capturar y analizar en vivo dentro del visor de cámara
  const handleAnalyzeCameraLive = async () => {
    const base64 = captureFrameFromCamera();
    if (!base64) return;

    setCameraCapturing(true);
    setCameraAnalysisResult("Analizando fotograma en vivo con Nora Titán...");

    const userMsg = activeMode === "lazarillo"
      ? "Lazarillo Visual: Describe el espacio con esfera de reloj y advierte desniveles u obstáculos."
      : activeMode === "tea"
      ? "Modo TEA: Describe en palabras sencillas, ordenadas y sin sobrecarga lo que ves en la toma."
      : "Describe detalladamente lo que observas en esta toma espacial.";

    try {
      const response = await fetch("/api/noraitu-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userMsg,
          imageBase64: base64,
          sessionId,
          mode: activeMode
        })
      });

      if (!response.ok || !response.body) throw new Error("Error en el stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulated += parsed.text;
                setCameraAnalysisResult(accumulated);
              }
            } catch {}
          }
        }
      }

      // Reproducir por voz el análisis
      if (accumulated) {
        speakText(accumulated);
      }
    } catch (err: any) {
      setCameraAnalysisResult("⚠️ Error al analizar la imagen: " + (err?.message || "Intenta nuevamente"));
    } finally {
      setCameraCapturing(false);
    }
  };

  // Capturar fotograma para enviarlo al chat central
  const handleUsePhotoInChat = () => {
    const base64 = captureFrameFromCamera();
    if (base64) {
      setAttachedImage(base64);
      stopCamera();
    }
  };

  // Carga de archivo de imagen manual
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Manejo de Síntesis de Voz (TTS)
  const speakText = (text: string, msgId?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    if (isSpeaking && speakingMsgId === msgId) {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-AR";
    // Si estamos en modo TEA, usamos ritmo más pausado y tono suave
    utterance.rate = activeMode === "tea" ? 0.88 : 0.98;
    utterance.pitch = activeMode === "tea" ? 0.95 : 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setSpeakingMsgId(msgId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Manejo de STT (Dictado)
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("El reconocimiento de voz no está soportado en este navegador.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Envío de Mensaje al Chat Central
  const handleSendMessage = async () => {
    const trimmed = inputMessage.trim();
    if ((!trimmed && !attachedImage) || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const assistantMsgId = `nora_${Date.now()}`;
    const imageToSend = attachedImage;

    const newMsg: Message = {
      id: userMsgId,
      role: "user",
      content: trimmed,
      imageBase64: imageToSend,
      mode: activeMode,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");
    setAttachedImage(null);
    setIsLoading(true);

    // Placeholder para la respuesta con streaming
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        mode: activeMode,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }
    ]);

    try {
      const response = await fetch("/api/noraitu-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: trimmed,
          imageBase64: imageToSend,
          sessionId,
          mode: activeMode
        })
      });

      if (!response.ok || !response.body) throw new Error("Error al conectar con Nora");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullAssistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                fullAssistantText += parsed.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === assistantMsgId ? { ...m, content: fullAssistantText } : m))
                );
              }
            } catch {}
          }
        }
      }

      // Si es modo TEA o Lazarillo, reproducir automáticamente en voz amigable
      if (fullAssistantText && (activeMode === "tea" || activeMode === "lazarillo")) {
        speakText(fullAssistantText, assistantMsgId);
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: "⚠️ No pude procesar tu mensaje. " + (err?.message || "Revisa tu conexión.") }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    if (confirm("¿Deseas reiniciar la conversación de Nora Titán?")) {
      const newSid = `nora_${Date.now()}`;
      setSessionId(newSid);
      localStorage.setItem("noraitu_session_id", newSid);
      setMessages([
        {
          id: "welcome_reset",
          role: "assistant",
          content: "Conversación reiniciada. ¿En qué puedo asistirte ahora?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          mode: activeMode
        }
      ]);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: activeMode === "tea" ? "#07111e" : "#080c14",
      color: "#f0f6fc",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>

      {/* HEADER DE CONTROL PRINCIPAL */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: activeMode === "tea" ? "rgba(7, 17, 30, 0.92)" : "rgba(8, 12, 20, 0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: activeMode === "tea" ? "1px solid rgba(56, 189, 248, 0.2)" : "1px solid rgba(255, 255, 255, 0.08)",
        padding: "12px 20px"
      }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          
          {/* Logo y Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "12px",
              background: activeMode === "tea" 
                ? "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" 
                : "linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)"
            }}>
              {activeMode === "tea" ? <Puzzle size={20} color="#ffffff" /> : <Bot size={20} color="#ffffff" />}
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "17px", fontWeight: 800, letterSpacing: "-0.5px" }}>
                  NORA TITÁN UNIVERSAL
                </span>
                <span style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "20px",
                  backgroundColor: activeMode === "tea" ? "rgba(56, 189, 248, 0.15)" : "rgba(139, 92, 246, 0.15)",
                  color: activeMode === "tea" ? "#38bdf8" : "#a78bfa",
                  fontWeight: 700,
                  border: "1px solid currentColor"
                }}>
                  {activeMode === "tea" ? "MODO TEA" : activeMode === "lazarillo" ? "LAZARILLO" : "CORE V3"}
                </span>
              </div>
              <div style={{ fontSize: "11px", color: "#8b949e", display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: isOnline ? "#3fb950" : "#d29922" }}></span>
                  {isOnline ? "Neon Online" : "Modo Offline Local"}
                </span>
                <span>•</span>
                <span>Multimodal + Voz PTT</span>
              </div>
            </div>
          </div>

          {/* Selector de Modo Adaptativo y Acciones Rápidas */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            
            {/* Botón Selector de Modos */}
            <div style={{
              display: "inline-flex",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: "10px",
              padding: "3px",
              border: "1px solid rgba(255, 255, 255, 0.1)"
            }}>
              <button
                onClick={() => setActiveMode("general")}
                style={{
                  border: "none",
                  backgroundColor: activeMode === "general" ? "#238636" : "transparent",
                  color: activeMode === "general" ? "#ffffff" : "#8b949e",
                  padding: "6px 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <Zap size={13} />
                <span>Titán</span>
              </button>

              <button
                onClick={() => setActiveMode("tea")}
                style={{
                  border: "none",
                  backgroundColor: activeMode === "tea" ? "#0284c7" : "transparent",
                  color: activeMode === "tea" ? "#ffffff" : "#8b949e",
                  padding: "6px 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <Puzzle size={13} />
                <span>Inclusión TEA</span>
              </button>

              <button
                onClick={() => setActiveMode("lazarillo")}
                style={{
                  border: "none",
                  backgroundColor: activeMode === "lazarillo" ? "#7c3aed" : "transparent",
                  color: activeMode === "lazarillo" ? "#ffffff" : "#8b949e",
                  padding: "6px 12px",
                  borderRadius: "7px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px"
                }}
              >
                <Eye size={13} />
                <span>Lazarillo</span>
              </button>
            </div>

            {/* Botón Llamada Realtime PTT */}
            <button
              onClick={() => setIsCallModalOpen(true)}
              style={{
                backgroundColor: "#238636",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 15px rgba(35, 134, 54, 0.4)"
              }}
            >
              <PhoneCall size={14} />
              <span>Llamada PTT</span>
            </button>

            {/* Reiniciar Chat */}
            <button
              onClick={handleClearHistory}
              title="Reiniciar conversación"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: "#8b949e",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                padding: "8px 10px",
                cursor: "pointer"
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* BANNER INFORMATIVO EN MODO TEA */}
      {activeMode === "tea" && (
        <div style={{
          backgroundColor: "rgba(14, 165, 233, 0.1)",
          borderBottom: "1px solid rgba(56, 189, 248, 0.2)",
          padding: "10px 20px",
          fontSize: "13px",
          color: "#7dd3fc",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px"
        }}>
          <Puzzle size={16} />
          <span>
            <strong>Modo Inclusión TEA Activo:</strong> Estructura ordenada en pasos secuenciales, lenguaje literal predecible y baja sobrecarga sensorial con voz pausada.
          </span>
        </div>
      )}

      {/* ÁREA DE MENSAJES Y CHAT */}
      <div style={{
        flex: 1,
        maxWidth: "900px",
        width: "100%",
        margin: "0 auto",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        boxSizing: "border-box"
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                gap: "12px",
                alignItems: "flex-start"
              }}
            >
              {/* Avatar */}
              <div style={{
                width: "34px",
                height: "34px",
                borderRadius: "10px",
                backgroundColor: isUser ? "#1f6feb" : activeMode === "tea" ? "#0284c7" : "#8957e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}>
                {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
              </div>

              {/* Burbuja */}
              <div style={{
                maxWidth: "80%",
                backgroundColor: isUser 
                  ? "rgba(31, 111, 235, 0.15)" 
                  : activeMode === "tea"
                  ? "rgba(14, 165, 233, 0.08)"
                  : "rgba(22, 27, 34, 0.8)",
                border: isUser 
                  ? "1px solid rgba(56, 139, 253, 0.3)" 
                  : activeMode === "tea"
                  ? "1px solid rgba(56, 189, 248, 0.25)"
                  : "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "16px 18px",
                lineHeight: 1.6,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
              }}>
                {/* Imagen adjunta en el mensaje si existe */}
                {msg.imageBase64 && (
                  <div style={{ marginBottom: "12px" }}>
                    <img 
                      src={msg.imageBase64} 
                      alt="Captura analizada" 
                      style={{ maxWidth: "100%", maxHeight: "260px", borderRadius: "10px", objectFit: "cover", border: "1px solid rgba(255, 255, 255, 0.1)" }} 
                    />
                  </div>
                )}

                {/* Contenido del Mensaje */}
                <div style={{ fontSize: "14px", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {msg.content || (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#8b949e" }}>
                      <Loader2 size={14} className="animate-spin" /> Pensando...
                    </span>
                  )}
                </div>

                {/* Footer de la burbuja: hora y acciones */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", fontSize: "11px", color: "#8b949e" }}>
                  <span>{msg.timestamp}</span>

                  {!isUser && msg.content && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <button
                        onClick={() => speakText(msg.content, msg.id)}
                        title="Escuchar respuesta"
                        style={{
                          background: "none",
                          border: "none",
                          color: isSpeaking && speakingMsgId === msg.id ? "#38bdf8" : "#8b949e",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        {isSpeaking && speakingMsgId === msg.id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      </button>

                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        title="Copiar texto"
                        style={{
                          background: "none",
                          border: "none",
                          color: copiedId === msg.id ? "#3fb950" : "#8b949e",
                          cursor: "pointer",
                          padding: 0,
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        {copiedId === msg.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* MODAL O VISOR DE CÁMARA MULTIMODAL TITÁN */}
      {isCameraOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          backgroundColor: "rgba(0, 0, 0, 0.88)",
          backdropFilter: "blur(16px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "680px",
            backgroundColor: "#0d1117",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* Header del Visor */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Camera size={18} color="#38bdf8" />
                <span style={{ fontSize: "14px", fontWeight: 700 }}>CÁMARA TITÁN MULTIMODAL</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={toggleCameraFacing}
                  title="Girar cámara"
                  style={{ background: "rgba(255, 255, 255, 0.1)", border: "none", color: "#fff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}
                >
                  <FlipHorizontal size={16} />
                </button>
                <button
                  onClick={stopCamera}
                  style={{ background: "rgba(255, 255, 255, 0.1)", border: "none", color: "#fff", borderRadius: "8px", padding: "6px 10px", cursor: "pointer" }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Video Viewport */}
            <div style={{ position: "relative", width: "100%", height: "360px", backgroundColor: "#000" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              <canvas ref={canvasRef} style={{ display: "none" }} />

              {/* Overlay de Subtítulos y Análisis */}
              {cameraAnalysisResult && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  insetInline: 0,
                  backgroundColor: "rgba(13, 17, 23, 0.9)",
                  backdropFilter: "blur(8px)",
                  padding: "12px 16px",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  maxHeight: "130px",
                  overflowY: "auto",
                  borderTop: "1px solid rgba(56, 189, 248, 0.3)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: 700, marginBottom: "4px" }}>
                    <Sparkles size={14} />
                    <span>Nora Titán Vision:</span>
                  </div>
                  {cameraAnalysisResult}
                </div>
              )}
            </div>

            {/* Barra de Acciones de la Cámara */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px", gap: "10px", flexWrap: "wrap", backgroundColor: "#161b22" }}>
              <button
                onClick={handleAnalyzeCameraLive}
                disabled={cameraCapturing}
                style={{
                  backgroundColor: "#238636",
                  color: "#fff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: cameraCapturing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                {cameraCapturing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                <span>{cameraCapturing ? "Analizando..." : "Analizar en Vivo"}</span>
              </button>

              <button
                onClick={handleUsePhotoInChat}
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
              >
                <ImageIcon size={16} />
                <span>Adjuntar a la Charla</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA INFERIOR DE ENTRADA Y ACCIONES */}
      <footer style={{
        position: "sticky",
        bottom: 0,
        backgroundColor: activeMode === "tea" ? "rgba(7, 17, 30, 0.95)" : "rgba(8, 12, 20, 0.95)",
        backdropFilter: "blur(12px)",
        borderTop: activeMode === "tea" ? "1px solid rgba(56, 189, 248, 0.2)" : "1px solid rgba(255, 255, 255, 0.08)",
        padding: "14px 16px"
      }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          
          {/* Vista previa de imagen adjunta antes de enviar */}
          {attachedImage && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", backgroundColor: "#161b22", padding: "6px 12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", width: "fit-content" }}>
              <img src={attachedImage} alt="Preview" style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }} />
              <span style={{ fontSize: "12px", color: "#8b949e" }}>Imagen lista para analizar</span>
              <button onClick={() => setAttachedImage(null)} style={{ background: "none", border: "none", color: "#f85149", cursor: "pointer", padding: 0 }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* Formulario y Controles */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            
            {/* Botón Cámara Titán */}
            <button
              onClick={() => startCamera(facingMode)}
              title="Abrir Cámara Multimodal Titán"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#38bdf8",
                borderRadius: "12px",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              <Camera size={19} />
            </button>

            {/* Botón Subir Imagen */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Cargar foto desde archivo"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#8b949e",
                borderRadius: "12px",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              <ImageIcon size={19} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />

            {/* Input de Texto Principal */}
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: activeMode === "tea" ? "1px solid rgba(56, 189, 248, 0.3)" : "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "12px",
              padding: "0 14px"
            }}>
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={
                  activeMode === "tea" 
                    ? "Escribe un mensaje claro y sencillo para Nora..." 
                    : activeMode === "lazarillo"
                    ? "Pregunta qué hay en el entorno..."
                    : "Mensaje a Nora Titán o describe la imagen..."
                }
                style={{
                  width: "100%",
                  height: "44px",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#f0f6fc",
                  fontSize: "14px"
                }}
              />

              {/* Botón Micrófono Dictado */}
              <button
                onClick={toggleListening}
                title={isListening ? "Detener dictado" : "Hablar con micrófono"}
                style={{
                  background: "none",
                  border: "none",
                  color: isListening ? "#f85149" : "#8b949e",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>

            {/* Botón Enviar */}
            <button
              onClick={handleSendMessage}
              disabled={isLoading || (!inputMessage.trim() && !attachedImage)}
              style={{
                backgroundColor: activeMode === "tea" ? "#0284c7" : "#1f6feb",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                width: "44px",
                height: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isLoading || (!inputMessage.trim() && !attachedImage) ? "not-allowed" : "pointer",
                flexShrink: 0,
                opacity: isLoading || (!inputMessage.trim() && !attachedImage) ? 0.5 : 1
              }}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL DE LLAMADA PTT REALTIME NATIVA */}
      <NoraRealtimeCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        sessionId={sessionId}
      />
    </div>
  );
}
