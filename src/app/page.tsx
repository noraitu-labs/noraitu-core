"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot, User, Send, Mic, MicOff, Camera, Image as ImageIcon, Volume2, VolumeX,
  Wifi, WifiOff, FlipHorizontal, X, Eye, Puzzle, Zap, PhoneCall, Loader2,
  RefreshCw, FileText, Printer, Sliders, ChevronLeft, ChevronRight, Database,
  Plus, Trash2, Copy, Check, Sparkles, UploadCloud, Presentation, Maximize2
} from "lucide-react";
import NoraRealtimeCallModal from "../components/NoraRealtimeCallModal";
import { exportToWord, exportToPdf, exportToPptx } from "../lib/exportUtils";

/* ─────────────────────────── TIPOS ─────────────────────────── */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageBase64?: string | null;
  mode?: Mode;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
}

type Mode = "general" | "tea" | "lazarillo" | "docente";

/* ─────────────── PICTOGRAMAS TEA (grid visual simplificado) ─── */
const TEA_PICTOGRAMS: Record<string, { emoji: string; label: string }> = {
  casa: { emoji: "🏠", label: "Casa" },
  escuela: { emoji: "🏫", label: "Escuela" },
  comida: { emoji: "🍎", label: "Comida" },
  agua: { emoji: "💧", label: "Agua" },
  baño: { emoji: "🚽", label: "Baño" },
  dormir: { emoji: "😴", label: "Dormir" },
  jugar: { emoji: "🎮", label: "Jugar" },
  ayuda: { emoji: "🙋", label: "Ayuda" },
  bien: { emoji: "👍", label: "Bien" },
  mal: { emoji: "👎", label: "Mal" },
  mamá: { emoji: "👩", label: "Mamá" },
  papá: { emoji: "👨", label: "Papá" },
  amor: { emoji: "❤️", label: "Amor" },
  sí: { emoji: "✅", label: "Sí" },
  no: { emoji: "❌", label: "No" },
  leer: { emoji: "📖", label: "Leer" },
  escribir: { emoji: "✏️", label: "Escribir" },
  número: { emoji: "🔢", label: "Número" },
  música: { emoji: "🎵", label: "Música" },
  sol: { emoji: "☀️", label: "Sol" },
  lluvia: { emoji: "🌧️", label: "Lluvia" },
  calor: { emoji: "🌡️", label: "Calor" },
  frío: { emoji: "❄️", label: "Frío" },
  perro: { emoji: "🐕", label: "Perro" },
  gato: { emoji: "🐈", label: "Gato" },
};

/* ─────────────── LIMPIEZA TTS: sin símbolos markdown ─────────── */
function cleanForTTS(text: string): string {
  return text
    .replace(/#{1,6}\s+/g, "")          // encabezados
    .replace(/\*\*([^*]+)\*\*/g, "$1")  // negrita
    .replace(/\*([^*]+)\*/g, "$1")      // cursiva
    .replace(/`([^`]+)`/g, "$1")        // código inline
    .replace(/```[\s\S]*?```/g, "")     // bloques de código
    .replace(/^\s*[-*]\s+/gm, "")       // viñetas
    .replace(/^\s*\d+\.\s+/gm, "")      // listas numeradas
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // links
    .replace(/_{1,2}([^_]+)_{1,2}/g, "$1")    // subrayado/cursiva
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

/* ─────────────── DETECCIÓN ECOLALIA / TEA AUTO ─────────────── */
function detectEcholaliaPattern(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  if (words.length < 4) return false;
  const unique = new Set(words);
  const ratio = unique.size / words.length;
  return ratio < 0.45; // >55% repetición → probable ecolalia
}

export default function NoraTitanPage() {
  /* ── Sesión / Chat ── */
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("general");
  const [autoTEAMode, setAutoTEAMode] = useState(false); // activado automáticamente

  /* ── Sidebar ── */
  const [sidebarOpen, setSidebarOpen] = useState(true);

  /* ── Conectividad ── */
  const [isOnline, setIsOnline] = useState(true);

  /* ── Cámara Titán ── */
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const [cameraAnalysis, setCameraAnalysis] = useState("");
  const [autoVisionActive, setAutoVisionActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /* ── Voz (TTS / STT) ── */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  /* ── TEA: Pictogramas ── */
  const [showPictograms, setShowPictograms] = useState(false);

  /* ── Refs ── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoVisionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* ──────────────────────────── INIT ───────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    window.addEventListener("online", () => setIsOnline(true));
    window.addEventListener("offline", () => setIsOnline(false));

    if (window.innerWidth < 768) setSidebarOpen(false);

    const raw = localStorage.getItem("noraitu_saved_sessions");
    if (raw) setSessions(JSON.parse(raw));

    const sid = localStorage.getItem("noraitu_session_id") || `nora_${Date.now()}`;
    setSessionId(sid);
    localStorage.setItem("noraitu_session_id", sid);
    loadSessionMessages(sid);

    // STT: Reconocimiento nativo
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = "es-AR";
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (e: any) => {
        let t = "";
        for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
        setInputMessage(t);

        // ── AUTO-DETECCIÓN ECOLALIA / TEA ──
        if (detectEcholaliaPattern(t) && !autoTEAMode) {
          setAutoTEAMode(true);
          setActiveMode("tea");
        }
      };

      rec.onend = () => setIsListening(false);
      rec.onerror = () => setIsListening(false);
      recognitionRef.current = rec;
    }

    return () => {
      window.removeEventListener("online", () => setIsOnline(true));
      window.removeEventListener("offline", () => setIsOnline(false));
      stopAutoVision();
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(`noraitu_history_${sessionId}`, JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sessionId]);

  /* ─────────────────────── SESIONES ─────────────────────────── */
  function loadSessionMessages(sid: string) {
    const saved = localStorage.getItem(`noraitu_history_${sid}`);
    if (saved) {
      try { setMessages(JSON.parse(saved)); return; } catch {}
    }
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Soy **Nora Titán Universal**, asistencia agéntica inclusiva y corporativa de vanguardia.\n\nCapacidades activas:\n- Análisis Visual Multimodal con Cámara Titán\n- Lazarillo Visual en Tiempo Real con descripción por voz\n- Inclusión Cognitiva TEA con Pictogramas\n- Exportación Documental: Word, PDF, Presentaciones\n- Persistencia Serverless en Neon PostgreSQL\n\n¿En qué puedo asistirte hoy?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode: "general"
    }]);
  }

  function handleNewSession() {
    const newSid = `nora_${Date.now()}`;
    const s: ChatSession = { id: newSid, title: "Nueva Consulta", date: new Date().toLocaleDateString("es-AR") };
    const upd = [s, ...sessions.slice(0, 14)];
    setSessions(upd);
    localStorage.setItem("noraitu_saved_sessions", JSON.stringify(upd));
    setSessionId(newSid);
    localStorage.setItem("noraitu_session_id", newSid);
    loadSessionMessages(newSid);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function handleSelectSession(sid: string) {
    setSessionId(sid);
    localStorage.setItem("noraitu_session_id", sid);
    loadSessionMessages(sid);
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function handleDeleteSession(sid: string, e: React.MouseEvent) {
    e.stopPropagation();
    const upd = sessions.filter(s => s.id !== sid);
    setSessions(upd);
    localStorage.setItem("noraitu_saved_sessions", JSON.stringify(upd));
    localStorage.removeItem(`noraitu_history_${sid}`);
    if (sessionId === sid) handleNewSession();
  }

  /* ─────────────────── CÁMARA MULTIMODAL TITÁN ──────────────── */
  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      setCameraStream(stream);
      setIsCameraOpen(true);
      setCameraAnalysis("");

      // Montar stream en el videoRef con robustez
      const mountVideo = () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
          };
        } else {
          setTimeout(mountVideo, 100);
        }
      };
      setTimeout(mountVideo, 80);
    } catch {
      alert("No se pudo inicializar la cámara. Por favor autoriza los permisos de video.");
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    stopAutoVision();
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setIsCameraOpen(false);
    setCameraAnalysis("");
    setAutoVisionActive(false);
  }, [cameraStream]);

  function captureFrame(): string | null {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }

  async function analyzeFrame(customPrompt?: string) {
    const base64 = captureFrame();
    if (!base64) return;

    const prompt = customPrompt || (
      activeMode === "lazarillo"
        ? "Lazarillo Visual: describe el espacio usando esfera de reloj (12 en punto, 3 en punto, etc.). Advierte obstáculos, escalones y desniveles con máxima prioridad."
        : activeMode === "tea"
        ? "Modo TEA: describe de forma ordenada en pasos lo que observas, usando lenguaje literal y simple."
        : "Describe con precisión analítica y contexto espacial lo que observas en esta toma."
    );

    setCameraCapturing(true);
    setCameraAnalysis("Nora Titán analizando en tiempo real...");

    try {
      const res = await fetch("/api/noraitu-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: prompt, imageBase64: base64, sessionId, mode: activeMode })
      });
      if (!res.ok || !res.body) throw new Error("Stream error");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.replace("data: ", "").trim();
          if (d === "[DONE]") continue;
          try {
            const p = JSON.parse(d);
            if (p.text) { acc += p.text; setCameraAnalysis(acc); }
          } catch {}
        }
      }
      if (acc) speakText(acc);
    } catch (err: any) {
      setCameraAnalysis("⚠️ " + (err?.message || "Error al analizar"));
    } finally {
      setCameraCapturing(false);
    }
  }

  /* ─── Lazarillo: visión automática cada 5s ─── */
  function startAutoVision() {
    if (autoVisionIntervalRef.current) clearInterval(autoVisionIntervalRef.current);
    analyzeFrame();
    autoVisionIntervalRef.current = setInterval(() => analyzeFrame(), 5000);
    setAutoVisionActive(true);
  }

  function stopAutoVision() {
    if (autoVisionIntervalRef.current) {
      clearInterval(autoVisionIntervalRef.current);
      autoVisionIntervalRef.current = null;
    }
    setAutoVisionActive(false);
  }

  function attachSnapshotToChat() {
    const base64 = captureFrame();
    if (base64) { setAttachedImage(base64); stopCamera(); }
  }

  /* ──────────────── DRAG & DROP ──────────────── */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => setAttachedImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  /* ───── PASTE (Ctrl+V) CORREGIDO: sin 'v' fantasma ────── */
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = ev => setAttachedImage(ev.target?.result as string);
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    }
    const pastedText = e.clipboardData?.getData("text/plain");
    if (pastedText) {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart ?? 0;
      const end = ta.selectionEnd ?? 0;
      const newVal = inputMessage.substring(0, start) + pastedText + inputMessage.substring(end);
      setInputMessage(newVal);
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + pastedText.length;
      });
    }
  }

  /* ──────────────── TTS — Habla fluida sin símbolos ──────── */
  function speakText(text: string, msgId?: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeaking && speakingMsgId === msgId) {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    const clean = cleanForTTS(text);
    if (!clean) return;

    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = "es-AR";
    utt.rate = (activeMode === "tea" || autoTEAMode) ? 0.86 : 0.98;
    utt.pitch = (activeMode === "tea" || autoTEAMode) ? 0.93 : 1.0;

    // Preferir voz en español si está disponible
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith("es") && v.name.includes("Google"))
      || voices.find(v => v.lang.startsWith("es"));
    if (esVoice) utt.voice = esVoice;

    utt.onstart = () => { setIsSpeaking(true); if (msgId) setSpeakingMsgId(msgId); };
    utt.onend = () => { setIsSpeaking(false); setSpeakingMsgId(null); };
    utt.onerror = () => { setIsSpeaking(false); setSpeakingMsgId(null); };

    speechUtteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }

  /* ──────────────── STT ──────────────── */
  function toggleListening() {
    if (!recognitionRef.current) { alert("El reconocimiento de voz no está disponible en este navegador."); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  }

  /* ──────────────── SEND MESSAGE ──────────────── */
  async function handleSendMessage() {
    const trimmed = inputMessage.trim();
    if ((!trimmed && !attachedImage) || isLoading) return;

    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now()}`;
    const img = attachedImage;

    if (messages.length <= 1 && trimmed) {
      const title = trimmed.length > 28 ? trimmed.slice(0, 28) + "…" : trimmed;
      const upd = sessions.map(s => s.id === sessionId ? { ...s, title } : s);
      setSessions(upd);
      localStorage.setItem("noraitu_saved_sessions", JSON.stringify(upd));
    }

    setMessages(prev => [...prev, {
      id: userMsgId, role: "user", content: trimmed,
      imageBase64: img, mode: activeMode,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);
    setInputMessage("");
    setAttachedImage(null);
    setIsLoading(true);

    setMessages(prev => [...prev, {
      id: assistantMsgId, role: "assistant", content: "",
      mode: activeMode,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);

    try {
      const res = await fetch("/api/noraitu-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: trimmed, imageBase64: img, sessionId, mode: activeMode })
      });
      if (!res.ok || !res.body) throw new Error("Fallo de comunicación con Nora Titán");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const d = line.replace("data: ", "").trim();
          if (d === "[DONE]") continue;
          try {
            const p = JSON.parse(d);
            if (p.text) {
              full += p.text;
              setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: full } : m));
            }
          } catch {}
        }
      }

      if (full && (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode)) {
        speakText(full, assistantMsgId);
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m => m.id === assistantMsgId
        ? { ...m, content: "⚠️ " + (err?.message || "Error de conexión. Verifica tu red.") } : m));
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  /* ─── Colores de modo ─── */
  const modeColor = {
    general: { bg: "#090d16", border: "rgba(99,102,241,0.25)", accent: "#6366f1", badge: "rgba(99,102,241,0.15)", badgeText: "#818cf8" },
    tea:     { bg: "#07111e", border: "rgba(14,165,233,0.25)", accent: "#0ea5e9", badge: "rgba(14,165,233,0.15)", badgeText: "#38bdf8" },
    lazarillo: { bg: "#0b0f1a", border: "rgba(139,92,246,0.25)", accent: "#8b5cf6", badge: "rgba(139,92,246,0.15)", badgeText: "#a78bfa" },
    docente: { bg: "#071510", border: "rgba(16,185,129,0.25)", accent: "#10b981", badge: "rgba(16,185,129,0.15)", badgeText: "#34d399" },
  };
  const mc = autoTEAMode ? modeColor.tea : modeColor[activeMode];

  /* ══════════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{
        display: "flex",
        height: "100dvh",
        width: "100%",
        maxWidth: "100vw",
        overflow: "hidden",
        backgroundColor: mc.bg,
        color: "#f0f6fc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: "border-box"
      }}
    >
      {/* ═══════════════════════ SIDEBAR PWA ═══════════════════════ */}
      <aside
        style={{
          width: sidebarOpen ? "260px" : "0",
          minWidth: sidebarOpen ? "260px" : "0",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          backgroundColor: "#0d1322",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          zIndex: 40
        }}
      >
        {/* Header sidebar */}
        <div style={{ padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: `linear-gradient(135deg, ${mc.accent}, #3b82f6)`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 14px ${mc.accent}55` }}>
              <Bot size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc" }}>NORA TITÁN</div>
              <div style={{ fontSize: "10px", fontWeight: 700, color: mc.badgeText, letterSpacing: "0.5px" }}>UNIVERSAL</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Nueva consulta */}
        <div style={{ padding: "12px 14px" }}>
          <button onClick={handleNewSession} style={{ width: "100%", backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", borderRadius: "10px", padding: "9px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
            <Plus size={15} color={mc.accent} /><span>Nueva Consulta</span>
          </button>
        </div>

        {/* Perfiles */}
        <div style={{ padding: "0 14px 10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>Perfil Cognitivo</div>
          {([
            { id: "general", label: "Titán Ejecutivo", icon: <Zap size={13} />, accentKey: "general" },
            { id: "tea", label: "Inclusión TEA", icon: <Puzzle size={13} />, accentKey: "tea" },
            { id: "lazarillo", label: "Lazarillo Visual", icon: <Eye size={13} />, accentKey: "lazarillo" },
            { id: "docente", label: "Cátedra Universitaria", icon: <FileText size={13} />, accentKey: "docente" },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => { setActiveMode(id); setAutoTEAMode(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "8px",
                padding: "8px 10px", borderRadius: "9px", border: "none",
                backgroundColor: activeMode === id ? `${modeColor[id].accent}22` : "transparent",
                color: activeMode === id ? modeColor[id].badgeText : "#94a3b8",
                fontWeight: activeMode === id ? 700 : 500, fontSize: "12px",
                cursor: "pointer", marginBottom: "3px", textAlign: "left"
              }}
            >
              {icon}<span>{label}</span>
              {id === "tea" && autoTEAMode && (
                <span style={{ fontSize: "9px", padding: "1px 5px", backgroundColor: "#0ea5e955", color: "#38bdf8", borderRadius: "4px", marginLeft: "auto" }}>AUTO</span>
              )}
            </button>
          ))}
        </div>

        {/* TEA: Pictogramas */}
        {(activeMode === "tea" || autoTEAMode) && (
          <div style={{ padding: "0 14px 10px" }}>
            <button
              onClick={() => setShowPictograms(v => !v)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: "9px", border: `1px solid ${mc.accent}44`, backgroundColor: showPictograms ? `${mc.accent}22` : "transparent", color: mc.badgeText, fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
            >
              🧩 {showPictograms ? "Cerrar Pictogramas" : "Abrir Panel Pictogramas TEA"}
            </button>
          </div>
        )}

        {/* Historial */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "7px" }}>Historial</div>
          {sessions.length === 0 ? (
            <div style={{ fontSize: "11px", color: "#475569" }}>Sin sesiones anteriores</div>
          ) : sessions.map(s => (
            <div key={s.id} onClick={() => handleSelectSession(s.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 9px", borderRadius: "7px", backgroundColor: sessionId === s.id ? "rgba(255,255,255,0.07)" : "transparent", color: sessionId === s.id ? "#f8fafc" : "#94a3b8", fontSize: "11px", cursor: "pointer", marginBottom: "2px" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.title}</span>
              <button onClick={e => handleDeleteSession(s.id, e)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "2px", flexShrink: 0 }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Estado Neon */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(0,0,0,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "5px" }}>
              <Database size={11} color="#38bdf8" /> Neon PostgreSQL
            </span>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#94a3b8" }}>
            {isOnline ? <Wifi size={11} color="#22c55e" /> : <WifiOff size={11} color="#f59e0b" />}
            <span>{isOnline ? "Conexión Activa" : "Modo Offline"}</span>
          </div>
        </div>
      </aside>

      {/* ═══════════════════════ MAIN ═══════════════════════ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minWidth: 0, position: "relative" }}>

        {/* ─── Navbar ─── */}
        <header style={{ height: "52px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: `${mc.bg}f0`, backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", borderRadius: "7px", padding: "5px 7px", cursor: "pointer" }}>
                <ChevronRight size={15} />
              </button>
            )}
            <span style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>NORA TITÁN UNIVERSAL</span>
            {autoTEAMode && (
              <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "20px", backgroundColor: "#0ea5e922", color: "#38bdf8", fontWeight: 700, border: "1px solid #38bdf844", whiteSpace: "nowrap" }}>AUTO-TEA ACTIVO</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
            <button
              onClick={() => isCameraOpen ? stopCamera() : startCamera(facingMode)}
              style={{ backgroundColor: isCameraOpen ? "#dc2626" : `${mc.accent}22`, color: isCameraOpen ? "#fff" : mc.badgeText, border: `1px solid ${mc.accent}44`, borderRadius: "9px", padding: "6px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap" }}
            >
              <Camera size={13} /><span style={{ display: "none" }}>{isCameraOpen ? "Cerrar" : "Cámara"}</span>
              <span>{isCameraOpen ? "✕ Cámara" : "📷 Cámara IA"}</span>
            </button>
            <button
              onClick={() => setIsCallModalOpen(true)}
              style={{ backgroundColor: "#238636", color: "#fff", border: "none", borderRadius: "9px", padding: "6px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: "0 0 10px rgba(35,134,54,0.3)", whiteSpace: "nowrap" }}
            >
              <PhoneCall size={13} /><span>PTT</span>
            </button>
          </div>
        </header>

        {/* ─── Panel Pictogramas TEA ─── */}
        {showPictograms && (activeMode === "tea" || autoTEAMode) && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(14,165,233,0.2)", backgroundColor: "rgba(14,165,233,0.06)", flexShrink: 0 }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", marginBottom: "8px", letterSpacing: "0.5px" }}>🧩 PICTOGRAMAS TEA — Toca para comunicarte</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {Object.entries(TEA_PICTOGRAMS).map(([key, { emoji, label }]) => (
                <button
                  key={key}
                  onClick={() => {
                    setInputMessage(prev => prev ? `${prev} ${key}` : key);
                    textareaRef.current?.focus();
                  }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", backgroundColor: "#1e293b", border: "1px solid rgba(56,189,248,0.2)", borderRadius: "10px", padding: "8px 10px", cursor: "pointer", minWidth: "52px", transition: "all 0.15s" }}
                  aria-label={label}
                  title={label}
                >
                  <span style={{ fontSize: "22px", lineHeight: 1 }}>{emoji}</span>
                  <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 600 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Cámara Titán Multimodal ─── */}
        {isCameraOpen && (
          <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
            <div style={{ borderRadius: "16px", border: `1px solid ${mc.accent}44`, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", backgroundColor: "#0d1322" }}>
              {/* Header cámara */}
              <div style={{ padding: "9px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 700, color: mc.badgeText }}>
                  <Sparkles size={13} /><span>VISIÓN ESPACIAL TITÁN EN VIVO</span>
                  {autoVisionActive && <span style={{ fontSize: "9px", padding: "2px 6px", backgroundColor: "#dc262633", color: "#f87171", borderRadius: "4px", animation: "pulse 1.5s infinite" }}>● LAZARILLO ACTIVO</span>}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => { const f = facingMode === "user" ? "environment" : "user"; setFacingMode(f); startCamera(f); }} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#fff", borderRadius: "6px", padding: "5px 8px", cursor: "pointer" }}><FlipHorizontal size={13} /></button>
                  <button onClick={stopCamera} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#fff", borderRadius: "6px", padding: "5px 8px", cursor: "pointer" }}><X size={13} /></button>
                </div>
              </div>

              {/* Video viewport — correctamente montado */}
              <div style={{ position: "relative", backgroundColor: "#000", height: "240px" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />

                {cameraAnalysis && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(9,13,22,0.92)", backdropFilter: "blur(6px)", padding: "9px 14px", fontSize: "12px", lineHeight: 1.5, maxHeight: "100px", overflowY: "auto", borderTop: `1px solid ${mc.accent}44` }}>
                    <strong style={{ color: mc.badgeText }}>Nora: </strong>{cameraAnalysis}
                  </div>
                )}
              </div>

              {/* Controles cámara */}
              <div style={{ padding: "9px 14px", backgroundColor: "#111827", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button onClick={() => analyzeFrame()} disabled={cameraCapturing} style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 13px", fontSize: "11px", fontWeight: 700, cursor: cameraCapturing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                  {cameraCapturing ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                  <span>{cameraCapturing ? "Analizando..." : "Escanear"}</span>
                </button>
                <button
                  onClick={() => autoVisionActive ? stopAutoVision() : startAutoVision()}
                  style={{ backgroundColor: autoVisionActive ? "#7f1d1d" : "#7c3aed", color: "#fff", border: "none", borderRadius: "8px", padding: "7px 13px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <span>{autoVisionActive ? "⏹ Detener Lazarillo" : "👁 Lazarillo Auto"}</span>
                </button>
                <button onClick={attachSnapshotToChat} style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "7px 13px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                  <ImageIcon size={12} /><span>Adjuntar al Chat</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── DRAG & DROP OVERLAY ─── */}
        {isDragging && (
          <div style={{ position: "absolute", inset: 0, zIndex: 60, backgroundColor: `${mc.accent}22`, backdropFilter: "blur(6px)", border: `2px dashed ${mc.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <UploadCloud size={44} color={mc.badgeText} />
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>Suelta tu imagen para análisis multimodal</div>
          </div>
        )}

        {/* ─── MENSAJES ─── */}
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px 16px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ width: "100%", maxWidth: "820px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
            {messages.map(msg => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: "10px", alignItems: "flex-start" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", backgroundColor: isUser ? "#2563eb" : mc.accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 2px 8px ${mc.accent}44` }}>
                    {isUser ? <User size={16} color="#fff" /> : <Bot size={16} color="#fff" />}
                  </div>

                  <div style={{ maxWidth: "82%", minWidth: 0, backgroundColor: isUser ? "rgba(37,99,235,0.15)" : "rgba(15,23,42,0.7)", border: isUser ? "1px solid rgba(59,130,246,0.3)" : `1px solid ${mc.border}`, borderRadius: "14px", padding: "14px 16px", lineHeight: (activeMode === "tea" || autoTEAMode) ? 1.8 : 1.6, fontSize: (activeMode === "tea" || autoTEAMode) ? "15px" : "13.5px", boxShadow: "0 3px 16px rgba(0,0,0,0.2)", wordBreak: "break-word" }}>
                    {msg.imageBase64 && (
                      <div style={{ marginBottom: "10px" }}>
                        <img src={msg.imageBase64} alt="Adjunto" style={{ maxWidth: "100%", maxHeight: "240px", borderRadius: "8px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
                      </div>
                    )}
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {msg.content || (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#94a3b8" }}>
                          <Loader2 size={13} className="animate-spin" /> Procesando con Nora Titán...
                        </span>
                      )}
                    </div>

                    {/* Footer: hora + acciones */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "10px", paddingTop: "7px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "6px" }}>
                      <span style={{ fontSize: "10px", color: "#475569" }}>{msg.timestamp}</span>
                      {!isUser && msg.content && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <button onClick={() => exportToWord("informe_nora", "Reporte Nora Titán", msg.content)} title="Exportar Word" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "5px", padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", fontSize: "10px" }}>
                            <FileText size={11} color="#38bdf8" /><span>Word</span>
                          </button>
                          <button onClick={() => exportToPdf("Reporte Nora Titán", msg.content)} title="Exportar PDF" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "5px", padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", fontSize: "10px" }}>
                            <Printer size={11} color="#818cf8" /><span>PDF</span>
                          </button>
                          <button onClick={() => exportToPptx("presentacion_nora", "Presentación Nora Titán", msg.content)} title="Exportar PPTX" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "5px", padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", fontSize: "10px" }}>
                            <Presentation size={11} color="#34d399" /><span>PPTX</span>
                          </button>
                          <button onClick={() => speakText(msg.content, msg.id)} title="Escuchar en voz" style={{ background: "none", border: "none", color: isSpeaking && speakingMsgId === msg.id ? mc.badgeText : "#64748b", cursor: "pointer", padding: "3px" }}>
                            {isSpeaking && speakingMsgId === msg.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                          </button>
                          <button onClick={() => copyToClipboard(msg.id, msg.content)} title="Copiar" style={{ background: "none", border: "none", color: copiedId === msg.id ? "#22c55e" : "#64748b", cursor: "pointer", padding: "3px" }}>
                            {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
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

        {/* ─── FOOTER / INPUT PRO ─── */}
        <footer style={{ padding: "12px 16px 16px", backgroundColor: `${mc.bg}f5`, backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ maxWidth: "820px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "8px" }}>

            {/* Preview imagen adjunta */}
            {attachedImage && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "9px", backgroundColor: "#1e293b", padding: "5px 11px", borderRadius: "9px", border: "1px solid rgba(255,255,255,0.1)", width: "fit-content" }}>
                <img src={attachedImage} alt="Preview" style={{ width: "28px", height: "28px", borderRadius: "5px", objectFit: "cover" }} />
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Imagen lista</span>
                <button onClick={() => setAttachedImage(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}><X size={13} /></button>
              </div>
            )}

            {/* Input box flotante */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "7px", backgroundColor: "rgba(30,41,59,0.5)", border: `1px solid ${mc.border}`, borderRadius: "18px", padding: "7px 10px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
              {/* Adjuntar */}
              <button onClick={() => fileInputRef.current?.click()} title="Adjuntar imagen" style={{ background: "none", border: "none", color: "#64748b", padding: "7px", cursor: "pointer", flexShrink: 0 }}>
                <ImageIcon size={18} />
              </button>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={e => {
                const f = e.target.files?.[0];
                if (f) { const r = new FileReader(); r.onload = ev => setAttachedImage(ev.target?.result as string); r.readAsDataURL(f); }
              }} />

              {/* Cámara rápida */}
              <button onClick={() => isCameraOpen ? stopCamera() : startCamera(facingMode)} title="Abrir cámara" style={{ background: "none", border: "none", color: isCameraOpen ? mc.badgeText : "#64748b", padding: "7px", cursor: "pointer", flexShrink: 0 }}>
                <Camera size={18} />
              </button>

              {/* Textarea con paste corregido */}
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
                }}
                rows={1}
                placeholder={
                  activeMode === "tea" || autoTEAMode ? "Escribe o toca un pictograma..." :
                  activeMode === "lazarillo" ? "Pregunta qué hay frente a ti..." :
                  "Consulta a Nora Titán, pega imagen con Ctrl+V o solicita un documento..."
                }
                aria-label="Mensaje para Nora Titán"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f8fafc", fontSize: "13.5px", lineHeight: "20px", padding: "6px 4px", resize: "none", maxHeight: "110px", minHeight: "32px" }}
              />

              {/* STT Micrófono */}
              <button onClick={toggleListening} title={isListening ? "Detener dictado" : "Hablar"} aria-label="Micrófono" style={{ background: isListening ? "rgba(239,68,68,0.15)" : "none", border: "none", color: isListening ? "#ef4444" : "#64748b", padding: "7px", borderRadius: "9px", cursor: "pointer", flexShrink: 0 }}>
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              {/* Enviar */}
              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputMessage.trim() && !attachedImage)}
                aria-label="Enviar mensaje"
                style={{ backgroundColor: mc.accent, color: "#fff", border: "none", borderRadius: "12px", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: isLoading || (!inputMessage.trim() && !attachedImage) ? "not-allowed" : "pointer", opacity: isLoading || (!inputMessage.trim() && !attachedImage) ? 0.45 : 1, flexShrink: 0, boxShadow: `0 2px 10px ${mc.accent}55` }}
              >
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* ─── Modal Llamada PTT ─── */}
      <NoraRealtimeCallModal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} sessionId={sessionId} />
    </div>
  );
}
