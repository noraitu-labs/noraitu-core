"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Send, 
  Plus, 
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
  FileText,
  Printer,
  Presentation,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Database,
  ShieldCheck,
  UploadCloud,
  Maximize2,
  Minimize2
} from "lucide-react";
import NoraRealtimeCallModal from "../components/NoraRealtimeCallModal";
import { exportToWord, exportToPdf, exportToPptx } from "../lib/exportUtils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageBase64?: string | null;
  mode?: "general" | "tea" | "lazarillo" | "docente";
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
}

export default function NoraTitanUniversalPage() {
  // ==========================================
  // ESTADOS DE SESIÓN Y CHAT
  // ==========================================
  const [sessionId, setSessionId] = useState<string>("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Perfil de Asistencia: General, TEA, Lazarillo, Docente
  const [activeMode, setActiveMode] = useState<"general" | "tea" | "lazarillo" | "docente">("general");

  // Barra Lateral PWA
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Conectividad Offline / Neon
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // ==========================================
  // ESTADOS MULTIMEDIA Y CÁMARA TITÁN
  // ==========================================
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [cameraCapturing, setCameraCapturing] = useState<boolean>(false);
  const [cameraAnalysisResult, setCameraAnalysisResult] = useState<string>("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // ==========================================
  // ESTADOS DE VOZ (TTS / STT)
  // ==========================================
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // ==========================================
  // REFERENCIAS DOM
  // ==========================================
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // ==========================================
  // 1. INICIALIZACIÓN Y GESTIÓN DE PERSISTENCIA
  // ==========================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Conectividad reactiva
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Ajuste responsive sidebar
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }

    // Carga de sesiones anteriores
    const rawSessions = localStorage.getItem("noraitu_saved_sessions");
    let loadedSessions: ChatSession[] = [];
    if (rawSessions) {
      try {
        loadedSessions = JSON.parse(rawSessions);
        setSessions(loadedSessions);
      } catch {}
    }

    // Inicializar sesión actual
    const currentSid = localStorage.getItem("noraitu_session_id") || `nora_${Date.now()}`;
    setSessionId(currentSid);
    localStorage.setItem("noraitu_session_id", currentSid);

    // Cargar historial de la sesión activa
    loadSessionMessages(currentSid);

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

      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

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

  const loadSessionMessages = (sid: string) => {
    const saved = localStorage.getItem(`noraitu_history_${sid}`);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        return;
      } catch {}
    }
    // Mensaje de bienvenida inicial
    setMessages([
      {
        id: "welcome_titan",
        role: "assistant",
        content: `Soy **Nora Titán Universal**, el pináculo de la asistencia agéntica inclusiva y corporativa de vanguardia.\n\nEstoy preparada para brindarte:\n* **Análisis Multimodal de Élite:** Visión espacial con tu cámara y análisis de documentos.\n* **Inclusión Cognitiva TEA:** Comunicación clara, predecible y baja sobrecarga sensorial.\n* **Generación y Exportación Documental:** Informes ejecutivos en Word (.doc), PDF y Presentaciones PPTX.\n* **Persistencia Serverless:** Registrada en tiempo real sobre Neon PostgreSQL.\n\n¿Qué desafío estratégico o consulta abordamos hoy?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        mode: activeMode
      }
    ]);
  };

  // Guardar mensajes localmente en cada cambio
  useEffect(() => {
    if (typeof window === "undefined" || !sessionId) return;
    localStorage.setItem(`noraitu_history_${sessionId}`, JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sessionId]);

  // ==========================================
  // GESTIÓN DE SESIONES Y CREACIÓN RÁPIDA
  // ==========================================
  const handleNewSession = () => {
    const newSid = `nora_${Date.now()}`;
    const newSessionItem: ChatSession = {
      id: newSid,
      title: "Nueva Consulta Titán",
      date: new Date().toLocaleDateString("es-AR")
    };
    const updated = [newSessionItem, ...sessions.slice(0, 14)];
    setSessions(updated);
    localStorage.setItem("noraitu_saved_sessions", JSON.stringify(updated));
    setSessionId(newSid);
    localStorage.setItem("noraitu_session_id", newSid);
    loadSessionMessages(newSid);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleSelectSession = (sid: string) => {
    setSessionId(sid);
    localStorage.setItem("noraitu_session_id", sid);
    loadSessionMessages(sid);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteSession = (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter((s) => s.id !== sid);
    setSessions(updated);
    localStorage.setItem("noraitu_saved_sessions", JSON.stringify(updated));
    localStorage.removeItem(`noraitu_history_${sid}`);
    if (sessionId === sid) {
      handleNewSession();
    }
  };

  // ==========================================
  // 2. CÁMARA MULTIMODAL TITÁN Y DRAG & DROP
  // ==========================================
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
      alert("No se pudo inicializar la cámara. Por favor autoriza los permisos de video en el navegador.");
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
    return canvas.toDataURL("image/jpeg", 0.8);
  };

  const handleAnalyzeCameraLive = async () => {
    const base64 = captureFrameFromCamera();
    if (!base64) return;

    setCameraCapturing(true);
    setCameraAnalysisResult("Nora Titán analizando fotograma en tiempo real...");

    const userPrompt = activeMode === "lazarillo"
      ? "Lazarillo Visual: Describe la escena con referencias de reloj y advierte desniveles u obstáculos."
      : activeMode === "tea"
      ? "Inclusión TEA: Describe con lenguaje literal, claro y ordenado por pasos lo que observas."
      : "Describe detalladamente la imagen con precisión analítica y contexto espacial.";

    try {
      const response = await fetch("/api/noraitu-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userPrompt,
          imageBase64: base64,
          sessionId,
          mode: activeMode
        })
      });

      if (!response.ok || !response.body) throw new Error("Fallo en el flujo de análisis visual");

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

      if (accumulated) {
        speakText(accumulated);
      }
    } catch (err: any) {
      setCameraAnalysisResult("⚠️ Error en análisis: " + (err?.message || "Intenta nuevamente"));
    } finally {
      setCameraCapturing(false);
    }
  };

  const handleAttachSnapshotToChat = () => {
    const base64 = captureFrameFromCamera();
    if (base64) {
      setAttachedImage(base64);
      stopCamera();
    }
  };

  // Drag & Drop de Imágenes
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = () => {
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachedImage(event.target?.result as string);
      };
      reader.readAsDataURL(files[0]);
    }
  };

  // ==========================================
  // 3. CORRECCIÓN DEL PORTAPAPELES (CTRL+V)
  // ==========================================
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setAttachedImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }

    // Inserción limpia de texto plano evitando caracteres parásitos 'v'
    const pastedText = e.clipboardData?.getData("text/plain");
    if (pastedText) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentVal = textarea.value;
      const newVal = currentVal.substring(0, start) + pastedText + currentVal.substring(end);
      setInputMessage(newVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + pastedText.length;
      }, 0);
    }
  };

  // ==========================================
  // 4. VOZ, DICTADO Y TTS ADAPTATIVO
  // ==========================================
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("El reconocimiento de voz no está disponible en este navegador.");
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

  const speakText = (text: string, msgId?: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeaking && speakingMsgId === msgId) {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    const clean = text.replace(/[*_#`>-]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "es-AR";
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

  // ==========================================
  // 5. ENVÍO DE MENSAJES CON STREAMING PRO
  // ==========================================
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

    // Actualizar título de la sesión si es el primer mensaje
    if (messages.length <= 1) {
      const titleCandidate = trimmed.length > 25 ? trimmed.substring(0, 25) + "..." : trimmed || "Consulta Visual";
      const updated = sessions.map((s) => (s.id === sessionId ? { ...s, title: titleCandidate } : s));
      setSessions(updated);
      localStorage.setItem("noraitu_saved_sessions", JSON.stringify(updated));
    }

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

      if (!response.ok || !response.body) throw new Error("Fallo de comunicación con Nora Titán");

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

      if (fullAssistantText && (activeMode === "tea" || activeMode === "lazarillo")) {
        speakText(fullAssistantText, assistantMsgId);
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: "⚠️ No se pudo procesar la solicitud: " + (err?.message || "Verifica tu conexión a internet.") }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: activeMode === "tea" ? "#07111e" : "#090d16",
        color: "#f0f6fc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >

      {/* ========================================================= */}
      {/* 1. BARRA LATERAL PWA: DISEÑO EJECUTIVO SLATE/ZINC 900     */}
      {/* ========================================================= */}
      <aside style={{
        width: sidebarOpen ? "280px" : "0px",
        minWidth: sidebarOpen ? "280px" : "0px",
        backgroundColor: "#0d1322",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        zIndex: 40
      }}>
        {/* Header Lateral */}
        <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: activeMode === "tea" 
                ? "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)" 
                : "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(59, 130, 246, 0.35)"
            }}>
              <Bot size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, letterSpacing: "-0.3px", color: "#f8fafc" }}>
                NORA TITÁN
              </div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "#38bdf8", letterSpacing: "0.5px" }}>
                ÉLITE GLOBAL
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Botón Nueva Consulta */}
        <div style={{ padding: "14px 16px" }}>
          <button
            onClick={handleNewSession}
            style={{
              width: "100%",
              backgroundColor: "#1e293b",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#f8fafc",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
              transition: "all 0.15s ease"
            }}
          >
            <Plus size={16} color="#38bdf8" />
            <span>Nueva Consulta</span>
          </button>
        </div>

        {/* Perfiles de Accesibilidad y Modo */}
        <div style={{ padding: "0 16px 12px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Perfiles Cognitivos & Visión
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              onClick={() => setActiveMode("general")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: activeMode === "general" ? "rgba(37, 99, 235, 0.2)" : "transparent",
                color: activeMode === "general" ? "#60a5fa" : "#94a3b8",
                fontWeight: activeMode === "general" ? 700 : 500,
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <Zap size={15} />
              <span>Titán Ejecutivo / Global</span>
            </button>

            <button
              onClick={() => setActiveMode("tea")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: activeMode === "tea" ? "rgba(14, 165, 233, 0.2)" : "transparent",
                color: activeMode === "tea" ? "#38bdf8" : "#94a3b8",
                fontWeight: activeMode === "tea" ? 700 : 500,
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <Puzzle size={15} />
              <span>Soporte Inclusión TEA</span>
            </button>

            <button
              onClick={() => setActiveMode("lazarillo")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: activeMode === "lazarillo" ? "rgba(139, 92, 246, 0.2)" : "transparent",
                color: activeMode === "lazarillo" ? "#a78bfa" : "#94a3b8",
                fontWeight: activeMode === "lazarillo" ? 700 : 500,
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <Eye size={15} />
              <span>Lazarillo Visual 360°</span>
            </button>

            <button
              onClick={() => setActiveMode("docente")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "10px",
                border: "none",
                backgroundColor: activeMode === "docente" ? "rgba(16, 185, 129, 0.2)" : "transparent",
                color: activeMode === "docente" ? "#34d399" : "#94a3b8",
                fontWeight: activeMode === "docente" ? 700 : 500,
                fontSize: "12px",
                cursor: "pointer",
                textAlign: "left"
              }}
            >
              <FileText size={15} />
              <span>Cátedra Universitaria</span>
            </button>
          </div>
        </div>

        {/* Historial de Sesiones Guardadas */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
            Historial de Consultas
          </div>
          {sessions.length === 0 ? (
            <div style={{ fontSize: "12px", color: "#475569", padding: "8px 0" }}>Sin sesiones anteriores</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    backgroundColor: sessionId === s.id ? "rgba(255, 255, 255, 0.08)" : "transparent",
                    color: sessionId === s.id ? "#f8fafc" : "#94a3b8",
                    fontSize: "12px",
                    cursor: "pointer"
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "190px" }}>
                    {s.title}
                  </span>
                  <button
                    onClick={(e) => handleDeleteSession(s.id, e)}
                    style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px" }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Lateral: Estado Neon & Online */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", backgroundColor: "rgba(0, 0, 0, 0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
              <Database size={13} color="#38bdf8" /> Neon PostgreSQL
            </span>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#22c55e" }}></span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px" }}>
              {isOnline ? <Wifi size={13} color="#22c55e" /> : <WifiOff size={13} color="#f59e0b" />}
              {isOnline ? "Conexión Activa" : "Modo Offline Activo"}
            </span>
            <span style={{ fontSize: "10px", color: "#64748b" }}>PWA v3</span>
          </div>
        </div>
      </aside>

      {/* ========================================================= */}
      {/* 2. CONTENEDOR PRINCIPAL: CHAT, CÁMARA Y ACCIONES           */}
      {/* ========================================================= */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative"
      }}>

        {/* Top Navbar */}
        <header style={{
          height: "56px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          backgroundColor: activeMode === "tea" ? "rgba(7, 17, 30, 0.9)" : "rgba(9, 13, 22, 0.9)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 30
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#f8fafc",
                  borderRadius: "8px",
                  padding: "6px 8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ChevronRight size={16} />
              </button>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc" }}>
                NORA TITÁN UNIVERSAL
              </span>
              <span style={{
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "20px",
                backgroundColor: activeMode === "tea" ? "rgba(14, 165, 233, 0.15)" : "rgba(99, 102, 241, 0.15)",
                color: activeMode === "tea" ? "#38bdf8" : "#818cf8",
                fontWeight: 700,
                border: "1px solid currentColor"
              }}>
                {activeMode === "tea" ? "MODO TEA" : activeMode === "lazarillo" ? "LAZARILLO" : activeMode === "docente" ? "CÁTEDRA" : "EJECUTIVO"}
              </span>
            </div>
          </div>

          {/* Acciones de Cabecera */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            
            {/* Botón Abrir Cámara Titán */}
            <button
              onClick={() => (isCameraOpen ? stopCamera() : startCamera(facingMode))}
              style={{
                backgroundColor: isCameraOpen ? "#dc2626" : "rgba(56, 189, 248, 0.12)",
                color: isCameraOpen ? "#fff" : "#38bdf8",
                border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: "10px",
                padding: "7px 14px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Camera size={14} />
              <span>{isCameraOpen ? "Cerrar Visor" : "Cámara IA"}</span>
            </button>

            {/* Botón Llamada PTT */}
            <button
              onClick={() => setIsCallModalOpen(true)}
              style={{
                backgroundColor: "#238636",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "7px 14px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 12px rgba(35, 134, 54, 0.3)"
              }}
            >
              <PhoneCall size={14} />
              <span>Llamada PTT</span>
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* 2.1 CÁMARA IA Y MULTIMEDIA: ÁREA CENTRAL SUPERIOR          */}
        {/* ========================================================= */}
        {isCameraOpen && (
          <div style={{
            padding: "16px 20px 0 20px",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
          }}>
            <div style={{
              maxWidth: "850px",
              margin: "0 auto",
              backgroundColor: "#0d1322",
              borderRadius: "18px",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              overflow: "hidden",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)"
            }}>
              {/* Header Cámara */}
              <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 700, color: "#38bdf8" }}>
                  <Sparkles size={15} />
                  <span>VISIÓN ESPACIAL TITÁN EN VIVO</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={toggleCameraFacing}
                    title="Alternar cámara frontal/trasera"
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#fff", borderRadius: "6px", padding: "5px 8px", cursor: "pointer" }}
                  >
                    <FlipHorizontal size={14} />
                  </button>
                  <button
                    onClick={stopCamera}
                    style={{ background: "rgba(255, 255, 255, 0.06)", border: "none", color: "#fff", borderRadius: "6px", padding: "5px 8px", cursor: "pointer" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Viewport de Video */}
              <div style={{ position: "relative", width: "100%", height: "260px", backgroundColor: "#020617" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {cameraAnalysisResult && (
                  <div style={{
                    position: "absolute",
                    bottom: 0,
                    insetInline: 0,
                    backgroundColor: "rgba(13, 19, 34, 0.92)",
                    backdropFilter: "blur(6px)",
                    padding: "10px 16px",
                    fontSize: "12px",
                    lineHeight: 1.5,
                    maxHeight: "90px",
                    overflowY: "auto",
                    borderTop: "1px solid rgba(56, 189, 248, 0.3)"
                  }}>
                    <strong style={{ color: "#38bdf8" }}>Nora: </strong>
                    {cameraAnalysisResult}
                  </div>
                )}
              </div>

              {/* Controles de Cámara */}
              <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#111827", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={handleAnalyzeCameraLive}
                  disabled={cameraCapturing}
                  style={{
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: cameraCapturing ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {cameraCapturing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                  <span>{cameraCapturing ? "Analizando..." : "Escanear en Vivo"}</span>
                </button>

                <button
                  onClick={handleAttachSnapshotToChat}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    color: "#f8fafc",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <ImageIcon size={14} />
                  <span>Adjuntar Captura al Chat</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FEEDBACK DRAG & DROP ZONA ACTIVA */}
        {isDraggingFile && (
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 60,
            backgroundColor: "rgba(2, 132, 199, 0.2)",
            backdropFilter: "blur(6px)",
            border: "2px dashed #38bdf8",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px"
          }}>
            <UploadCloud size={48} color="#38bdf8" />
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#f8fafc" }}>
              Suelta tu imagen aquí para análisis multimodal
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* LISTADO DE MENSAJES Y CHAT                                */}
        {/* ========================================================= */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "18px"
        }}>
          <div style={{ maxWidth: "850px", width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: "18px" }}>
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
                    width: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    backgroundColor: isUser ? "#2563eb" : activeMode === "tea" ? "#0284c7" : "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 2px 10px rgba(0, 0, 0, 0.3)"
                  }}>
                    {isUser ? <User size={18} color="#fff" /> : <Bot size={18} color="#fff" />}
                  </div>

                  {/* Burbuja */}
                  <div style={{
                    maxWidth: "82%",
                    backgroundColor: isUser 
                      ? "rgba(37, 99, 235, 0.18)" 
                      : activeMode === "tea"
                      ? "rgba(14, 165, 233, 0.08)"
                      : "rgba(15, 23, 42, 0.75)",
                    border: isUser 
                      ? "1px solid rgba(59, 130, 246, 0.35)" 
                      : activeMode === "tea"
                      ? "1px solid rgba(56, 189, 248, 0.25)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "16px",
                    padding: "16px 18px",
                    lineHeight: activeMode === "tea" ? 1.75 : 1.6,
                    fontSize: activeMode === "tea" ? "14.5px" : "14px",
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)"
                  }}>
                    {/* Imagen adjunta si existe */}
                    {msg.imageBase64 && (
                      <div style={{ marginBottom: "12px" }}>
                        <img 
                          src={msg.imageBase64} 
                          alt="Adjunto" 
                          style={{ maxWidth: "100%", maxHeight: "280px", borderRadius: "10px", objectFit: "cover", border: "1px solid rgba(255, 255, 255, 0.12)" }} 
                        />
                      </div>
                    )}

                    {/* Texto formateado */}
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {msg.content || (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
                          <Loader2 size={14} className="animate-spin" /> Nora procesando con rigor de élite...
                        </span>
                      )}
                    </div>

                    {/* Botones de Exportación Documental y Acciones */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.06)", fontSize: "11px", color: "#64748b", flexWrap: "wrap", gap: "8px" }}>
                      <span>{msg.timestamp}</span>

                      {!isUser && msg.content && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          
                          {/* Exportar Word */}
                          <button
                            onClick={() => exportToWord("informe_nora_titan", "Reporte Institucional Nora Titán", msg.content)}
                            title="Exportar a Microsoft Word (.doc)"
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#94a3b8",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px"
                            }}
                          >
                            <FileText size={12} color="#38bdf8" />
                            <span>Word</span>
                          </button>

                          {/* Exportar PDF */}
                          <button
                            onClick={() => exportToPdf("Documento Ejecutivo Nora Titán", msg.content)}
                            title="Imprimir / Exportar a PDF"
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#94a3b8",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px"
                            }}
                          >
                            <Printer size={12} color="#818cf8" />
                            <span>PDF</span>
                          </button>

                          {/* Exportar PPTX */}
                          <button
                            onClick={() => exportToPptx("presentacion_nora_titan", "Presentación Nora Titán", msg.content)}
                            title="Exportar Presentación Ejecutiva"
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              color: "#94a3b8",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "11px"
                            }}
                          >
                            <Presentation size={12} color="#34d399" />
                            <span>PPTX</span>
                          </button>

                          {/* TTS / Voz */}
                          <button
                            onClick={() => speakText(msg.content, msg.id)}
                            title="Escuchar audio"
                            style={{
                              background: "none",
                              border: "none",
                              color: isSpeaking && speakingMsgId === msg.id ? "#38bdf8" : "#94a3b8",
                              cursor: "pointer",
                              padding: "4px"
                            }}
                          >
                            {isSpeaking && speakingMsgId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </button>

                          {/* Copiar */}
                          <button
                            onClick={() => copyToClipboard(msg.id, msg.content)}
                            title="Copiar respuesta"
                            style={{ background: "none", border: "none", color: copiedId === msg.id ? "#22c55e" : "#94a3b8", cursor: "pointer", padding: "4px" }}
                          >
                            {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
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
        </div>

        {/* ========================================================= */}
        {/* 3. CAJÓN DE CHAT INFERIOR PRO                             */}
        {/* ========================================================= */}
        <footer style={{
          padding: "16px 20px 20px 20px",
          backgroundColor: activeMode === "tea" ? "rgba(7, 17, 30, 0.95)" : "rgba(9, 13, 22, 0.95)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)"
        }}>
          <div style={{ maxWidth: "850px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "8px" }}>
            
            {/* Previsualización de Imagen Adjunta */}
            {attachedImage && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", backgroundColor: "#1e293b", padding: "6px 12px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.12)", width: "fit-content" }}>
                <img src={attachedImage} alt="Preview" style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover" }} />
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Imagen lista para análisis multimodal</span>
                <button onClick={() => setAttachedImage(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Input Box Flotante */}
            <div style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "8px",
              backgroundColor: "rgba(30, 41, 59, 0.45)",
              border: activeMode === "tea" ? "1px solid rgba(56, 189, 248, 0.35)" : "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "20px",
              padding: "8px 12px",
              boxShadow: "0 6px 24px rgba(0, 0, 0, 0.3)"
            }}>
              
              {/* Botón Adjuntar Archivo / Foto */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar imagen o documento"
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  padding: "8px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <ImageIcon size={19} />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => setAttachedImage(event.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />

              {/* Botón Abrir Cámara Rápida */}
              <button
                onClick={() => (isCameraOpen ? stopCamera() : startCamera(facingMode))}
                title="Abrir Cámara en Vivo"
                style={{
                  background: "none",
                  border: "none",
                  color: isCameraOpen ? "#38bdf8" : "#94a3b8",
                  padding: "8px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <Camera size={19} />
              </button>

              {/* Textarea Inteligente con Manejo Limpio de Portapapeles (Ctrl+V) */}
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={
                  activeMode === "tea"
                    ? "Escribe un mensaje claro o pega una imagen (Ctrl+V)..."
                    : activeMode === "lazarillo"
                    ? "Pregunta qué hay frente a ti..."
                    : "Consulta a Nora Titán o solicita un documento en Word/PDF/PPTX..."
                }
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#f8fafc",
                  fontSize: "14px",
                  lineHeight: "20px",
                  padding: "6px 4px",
                  resize: "none",
                  maxHeight: "120px"
                }}
              />

              {/* Botón Micrófono STT */}
              <button
                onClick={toggleListening}
                title={isListening ? "Detener dictado" : "Hablar con Nora (STT)"}
                style={{
                  background: isListening ? "rgba(239, 68, 68, 0.2)" : "none",
                  border: "none",
                  color: isListening ? "#ef4444" : "#94a3b8",
                  padding: "8px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                {isListening ? <MicOff size={19} /> : <Mic size={19} />}
              </button>

              {/* Botón Enviar */}
              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputMessage.trim() && !attachedImage)}
                style={{
                  backgroundColor: activeMode === "tea" ? "#0284c7" : "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  width: "38px",
                  height: "38px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isLoading || (!inputMessage.trim() && !attachedImage) ? "not-allowed" : "pointer",
                  opacity: isLoading || (!inputMessage.trim() && !attachedImage) ? 0.5 : 1,
                  boxShadow: "0 2px 10px rgba(37, 99, 235, 0.4)",
                  transition: "all 0.15s ease"
                }}
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* MODAL DE LLAMADA PTT REALTIME */}
      <NoraRealtimeCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        sessionId={sessionId}
      />
    </div>
  );
}
