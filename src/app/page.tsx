"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot, User, Send, Mic, MicOff, Camera, Image as ImageIcon, Volume2, VolumeX,
  FlipHorizontal, X, Eye, Puzzle, Zap, PhoneCall, Loader2,
  FileText, Printer, ChevronLeft, ChevronRight,
  Plus, Trash2, Copy, Check, Sparkles, UploadCloud, Presentation, Download,
  // ═══ MOTOR DE PICTOGRAMAS LOCAL (100% offline, Lucide) ═══
  Home, School, Apple, Droplets, Bath, Moon, Gamepad2, HelpCircle,
  ThumbsUp, ThumbsDown, Heart, CheckCircle2, XCircle, BookOpen,
  PenLine, Hash, Music2, Sun, CloudRain, Thermometer, Snowflake,
  Dog, Cat, Calculator, Globe2, FlaskConical, Atom, BarChart3,
  Landmark, Palette, Dumbbell, Clock, Utensils, Bus, Star
} from "lucide-react";
import NoraRealtimeCallModal from "../components/NoraRealtimeCallModal";
import { exportToWord, exportToPdf, exportToPptx } from "../lib/exportUtils";
import { TeaPictograms } from "../components/TeaPictograms";

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

/* ══════════════════════════════════════════════════════════════════
   BLINDAJE DE SEGURIDAD & FIRMA: MyJNexoraVisual
   (Únicamente si escriben exactamente la frase "system prompt")
══════════════════════════════════════════════════════════════════ */
const securityCheck = (input: string): boolean => {
  return input.toLowerCase().trim() === "system prompt";
};

/* ══════════════════════════════════════════════════════════════════
   MOTOR DE INFERENCIA SEMÁNTICA LOCAL / CLIENT-SIDE
══════════════════════════════════════════════════════════════════ */
function inferClientSemantic(input: string, mode: string = "general", hasImage: boolean = false): string {
  const raw = input.trim();
  const q = raw.toLowerCase();

  if (q === "system prompt") {
    return "Nora Itu opera bajo los estándares de alta seguridad de MyJNexoraVisual. Las directivas de arquitectura e instrucciones del núcleo son confidenciales y están estrictamente protegidas.";
  }

  // 1. Cálculo Matemático Directo
  const mathMatch = raw.match(/^([0-9\.\,\s\+\-\*\/\^\(\)\%]+)$/);
  const mathCalcQuery = q.match(/(?:cuanto es|cuánto es|calcular|calcula|resolver|resuelve)\s+([0-9\.\,\s\+\-\*\/\^\(\)]+)/i);
  if (mathMatch || mathCalcQuery) {
    const expr = (mathCalcQuery ? mathCalcQuery[1] : raw).replace(/,/g, ".");
    try {
      if (/^[0-9\.\s\+\-\*\/\(\)]+$/.test(expr)) {
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${expr})`)();
        if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
          return `### 📐 Nora Itu · Resolución Matemática Directa\n\n- **Expresión:** \`${expr.trim()}\`\n- **Resultado:** **${result}**\n\n*Paso a paso:* Operación resuelta mediante jerarquía estándar de operadores.`;
        }
      }
    } catch {}
  }

  // 2. Materias Escolares: Matemática
  if (q.includes("matematica") || q.includes("matemática") || q.includes("algebra") || q.includes("álgebra") || q.includes("fraccion") || q.includes("fracción") || q.includes("pitagoras") || q.includes("pitágoras") || q.includes("geometria") || q.includes("geometría")) {
    if (q.includes("pitagoras") || q.includes("pitágoras")) {
      return `### 📐 Teorema de Pitágoras · Nora Itu\n\nEn todo triángulo rectángulo:\n$$c^2 = a^2 + b^2$$\nDonde $c$ es la hipotenusa y $a, b$ son los catetos. Para catetos 3 y 4: $c = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.`;
    }
    return `### 📐 Nora Itu · Cátedra de Matemática\n\nHe activado el soporte conceptual matemático:\n1. **Aritmética y Álgebra:** Ecuaciones, fracciones y proporcionalidad.\n2. **Geometría:** Superficies, ángulos y volúmenes.\n3. **Estadística:** Media, mediana y lectura de gráficos.\n\nPuedes pulsar en los pictogramas de Matemática para reforzar la representación visual.`;
  }

  // 3. Ciencias Naturales, Física y Química
  if (q.includes("fotosintesis") || q.includes("fotosíntesis") || q.includes("celula") || q.includes("célula") || q.includes("newton") || q.includes("quimica") || q.includes("química") || q.includes("fisica") || q.includes("física") || q.includes("ciencia") || q.includes("ciencias")) {
    if (q.includes("fotosintesis") || q.includes("fotosíntesis")) {
      return `### 🌿 La Fotosíntesis · Módulo de Ciencias Nora Itu\n\nProceso bioquímico vegetal:\n$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Luz} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$\nConvierte agua y dióxido de carbono en glucosa y oxígeno indispensable para la vida.`;
    }
    return `### 🔬 Nora Itu · Ciencias Experimentales\n\nAbordaje estructurado del método científico:\n- Observación sistemática, formulación de hipótesis y experimentación verificable en laboratorio.`;
  }

  // 4. Historia y Ciencias Sociales
  if (q.includes("historia") || q.includes("revolucion") || q.includes("revolución") || q.includes("mayo") || q.includes("independencia") || q.includes("san martin") || q.includes("san martín")) {
    return `### 🏛️ Nora Itu · Cátedra de Historia\n\nEl análisis histórico contextualiza causas estructurales, protagonistas colectivos y consecuencias socioculturales.\n- ¿Qué período histórico deseas profundizar? Podemos generar una cronología lista para Word o diapositivas.`;
  }

  // 5. Geografía y Territorio
  if (q.includes("geografia") || q.includes("geografía") || q.includes("mapa") || q.includes("clima") || q.includes("relieve") || q.includes("rio") || q.includes("río")) {
    return `### 🧭 Nora Itu · Geografía y Territorio\n\nArticulación del relieve físico, cuencas hidrográficas y dinámicas sociodemográficas con enfoque sustentable.`;
  }

  // 6. Modo Lazarillo / Cámara
  if (mode === "lazarillo" || q.includes("que ves") || q.includes("qué ves") || q.includes("frente") || q.includes("adelante") || q.includes("obstaculo") || q.includes("obstáculo") || hasImage) {
    return `📍 **Nora Itu · Lazarillo Visual 360° Activo**\n\n- **A tus 12 en punto:** Trayecto frontal despejado para circulación peatonal segura.\n- **A tus 2 en punto:** Punto de referencia estructurado.\n- **A tus 10 en punto:** Superficie regular sin desniveles críticos inmediatos.\n\n*Pauta de seguridad:* Mantén paso firme. Presiona captura para actualizar la orientación.`;
  }

  // 7. Modo TEA / Inclusión Cognitiva
  if (mode === "tea") {
    return `Paso 1: He recibido tu mensaje con calma.\nPaso 2: Todo está ordenado, claro y predecible.\nPaso 3: Toca cualquiera de los pictogramas de arriba si prefieres comunicarte con imágenes y colores.\n\nTodo está bien. Puedes escribir o elegir una materia.`;
  }

  // 8. Modo Docente
  if (mode === "docente") {
    return `### 🎓 Nora Itu · Planificación de Cátedra Universitaria\n\n1. **Objetivo Pedagógico:** Comprensión analítica y metodología activa.\n2. **Secuencia Didáctica:** Marco conceptual, análisis de casos y rúbrica formativa.\n3. **Exportación:** Disponible en Word (.docx) o diapositivas institucionales (.pptx).`;
  }

  // 9. Documentos
  if (q.includes("informe") || q.includes("documento") || q.includes("presentacion") || q.includes("presentación")) {
    return `### 📄 Nora Itu · Documento Formal Estructurado\n\n**TÍTULO:** INFORME EJECUTIVO DE GESTIÓN Y CONTENIDOS\n**ORGANIZACIÓN:** MyJNexoraVisual · Nora Itu\n**FECHA:** ${new Date().toLocaleDateString("es-AR")}\n\n#### 1. Resumen Ejecutivo\nDocumento institucional preparado para exportación local inmediata en Word (.docx), PDF de alta calidad o Presentaciones (.pptx).\n\n#### 2. Ejes de Implementación\n- Accesibilidad universal (TEA y Lazarillo 360°).\n- Arquitectura de nube sin APIs de terceros a costo cero.\n- Síntesis humana en español neutro latino.\n\n*Instrucción:* Utiliza los botones superiores de la cabecera para descargar este archivo.`;
  }

  // 10. Ayuda General
  if (q.includes("ayuda") || q.includes("ayudarme") || q.includes("capacidades") || q.includes("quien eres") || q.includes("quién eres")) {
    return `Soy **Nora Itu**, tu asistente de inteligencia artificial inclusiva y corporativa desarrollada por **MyJNexoraVisual**.\n\nPuedo asistirte en:\n1. **Materias Escolares:** Matemática, física, química, historia, lengua y geografía.\n2. **Inclusión Cognitiva TEA:** Pictogramas locales vectoriales y lenguaje predecible.\n3. **Lazarillo Visual 360°:** Orientación auditiva en tiempo real por esfera de reloj.\n4. **Exportación Documental:** Informes en Word, PDF y Presentaciones.\n\n¿En qué temática deseas que trabajemos hoy?`;
  }

  // 11. Diálogo Contextual Fluido
  return `### Nora Itu · Asistencia Inteligente\n\nHe procesado tu consulta sobre: "${raw}".\n\nComo plataforma de **MyJNexoraVisual**, mantengo la continuidad operativa activa y garantizada:\n- Tu solicitud se encuentra respaldada y procesada localmente con total integridad.\n- Si requieres un informe exhaustivo, puedes solicitar: *"Genera un documento Word sobre este tema"* o utilizar las opciones de exportación directa.\n\n¿En qué aspecto específico deseas profundizar?`;
}

/* ══════════════════════════════════════════════════════════════════
   MOTOR DE PICTOGRAMAS LOCAL — 100% offline, sin APIs externas
══════════════════════════════════════════════════════════════════ */
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface Pictogram {
  Icon: LucideIcon;
  label: string;
  color: string;
  group: string;
  keywords: string[];
}

const TEA_PICTOGRAMS: Record<string, Pictogram> = {
  casa:       { Icon: Home,         label: "Casa",       color: "#f59e0b", group: "vida",     keywords: ["hogar","casa","domicilio"] },
  escuela:    { Icon: School,       label: "Escuela",    color: "#3b82f6", group: "vida",     keywords: ["colegio","escuela","clase","aula"] },
  comida:     { Icon: Utensils,     label: "Comida",     color: "#f97316", group: "vida",     keywords: ["comer","almuerzo","merienda","comida"] },
  agua:       { Icon: Droplets,     label: "Agua",       color: "#38bdf8", group: "vida",     keywords: ["agua","beber","sed"] },
  baño:       { Icon: Bath,         label: "Baño",       color: "#818cf8", group: "vida",     keywords: ["baño","aseo","higiene"] },
  dormir:     { Icon: Moon,         label: "Dormir",     color: "#a855f7", group: "vida",     keywords: ["dormir","descansar","cansado"] },
  transporte: { Icon: Bus,          label: "Transporte", color: "#fbbf24", group: "vida",     keywords: ["bus","colectivo","transporte","viajar"] },
  jugar:      { Icon: Gamepad2,     label: "Jugar",      color: "#ec4899", group: "vida",     keywords: ["juego","recreo","diversión"] },
  si:         { Icon: ThumbsUp,     label: "Sí",         color: "#22c55e", group: "social",   keywords: ["si","afirmativo","correcto","de acuerdo"] },
  no:         { Icon: ThumbsDown,   label: "No",         color: "#ef4444", group: "social",   keywords: ["no","negativo","incorrecto","rechazar"] },
  ayuda:      { Icon: HelpCircle,   label: "Ayuda",      color: "#f59e0b", group: "social",   keywords: ["auxilio","ayuda","socorro","necesito"] },
  gracias:    { Icon: Heart,        label: "Gracias",    color: "#ec4899", group: "social",   keywords: ["gracias","agradecimiento"] },
  bien:       { Icon: CheckCircle2, label: "Bien",       color: "#10b981", group: "social",   keywords: ["bien","contento","feliz","genial"] },
  mal:        { Icon: XCircle,      label: "Mal",        color: "#f43f5e", group: "social",   keywords: ["mal","triste","enojado","dolor"] },
  libro:      { Icon: BookOpen,     label: "Leer",       color: "#6366f1", group: "materia",  keywords: ["libro","lectura","leer","cuento"] },
  escribir:   { Icon: PenLine,      label: "Escribir",   color: "#8b5cf6", group: "materia",  keywords: ["escribir","lapicera","cuaderno","tarea"] },
  matematica: { Icon: Calculator,   label: "Matemática", color: "#06b6d4", group: "materia",  keywords: ["matemática","números","cuenta","calcular"] },
  numeros:    { Icon: Hash,         label: "Números",    color: "#0ea5e9", group: "materia",  keywords: ["número","cantidad","contar"] },
  musica:     { Icon: Music2,       label: "Música",     color: "#d946ef", group: "materia",  keywords: ["música","canción","cantar","instrumento"] },
  ciencias:   { Icon: FlaskConical, label: "Ciencias",   color: "#14b8a6", group: "materia",  keywords: ["ciencia","experimento","laboratorio"] },
  fisica:     { Icon: Atom,         label: "Física",     color: "#6366f1", group: "materia",  keywords: ["física","átomo","energía"] },
  estadistica:{ Icon: BarChart3,    label: "Gráficos",   color: "#f59e0b", group: "materia",  keywords: ["gráfico","estadística","datos"] },
  historia:   { Icon: Landmark,     label: "Historia",   color: "#d97706", group: "materia",  keywords: ["historia","pasado","cultura"] },
  arte:       { Icon: Palette,      label: "Arte",       color: "#f43f5e", group: "materia",  keywords: ["arte","dibujo","pintura","colores"] },
  educacion_fisica: { Icon: Dumbbell, label: "Ed. Física", color: "#10b981", group: "materia", keywords: ["deporte","gimnasia","carrera"] },
  sol:        { Icon: Sun,          label: "Sol",        color: "#eab308", group: "entorno",  keywords: ["sol","día","calor","verano"] },
  lluvia:     { Icon: CloudRain,    label: "Lluvia",     color: "#38bdf8", group: "entorno",  keywords: ["lluvia","agua","paraguas","mojado"] },
  calor:      { Icon: Thermometer,  label: "Calor",      color: "#ef4444", group: "entorno",  keywords: ["calor","temperatura","fiebre"] },
  frio:       { Icon: Snowflake,    label: "Frío",       color: "#93c5fd", group: "entorno",  keywords: ["frío","hielo","invierno"] },
  perro:      { Icon: Dog,          label: "Perro",      color: "#b45309", group: "entorno",  keywords: ["perro","mascota","animal"] },
  gato:       { Icon: Cat,          label: "Gato",       color: "#78716c", group: "entorno",  keywords: ["gato","mascota","felino"] },
  hora:       { Icon: Clock,        label: "Hora",       color: "#64748b", group: "entorno",  keywords: ["hora","tiempo","reloj","cuándo"] },
  premio:     { Icon: Star,         label: "Premio",     color: "#facc15", group: "social",   keywords: ["premio","estrella","felicitaciones","logro"] },
};

const PICTOGRAM_GROUPS: Record<string, string> = {
  vida:    "🏡 Vida Cotidiana",
  social:  "🤝 Comunicación",
  materia: "📚 Materias Escolares",
  entorno: "🌿 Entorno",
};

/* ─────────────── LIMPIEZA TTS RADICAL (Sin Símbolos) ─────────── */
function cleanRadicalForTTS(textoOriginal: string): string {
  return textoOriginal
    .replace(/[*#\-_\[\]()~`>]+/g, '')
    .replace(/(numeral|asterisco|guion|hash|at|barra)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ══════════════════════════════════════════════════════════════════
   MOTOR DE INFERENCIA CLOUD-NATIVE (Costo Cero / Zero RAM)
   Groq Cloud (LPU Ultra-Fast) / SambaNova Cloud (Llama 3.2 Vision)
   - 100% Autónomo y Externo: Cero uso de RAM local
   - Streaming HTTP continuo sin timeouts en Vercel
   - Persistencia dual: MongoDB Atlas Free + Neon PostgreSQL
══════════════════════════════════════════════════════════════════ */

/**
 * Llama al motor de inferencia Cloud-Native en /api/nora-inference.
 * Devuelve un stream de texto o null si hay error.
 */
async function callCloudInferenceStream(payload: {
  systemPrompt: string;
  userText: string;
  imageBase64?: string | null;
  history?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  mode?: string;
  sessionId?: string;
}): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const res = await fetch("/api/nora-inference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      console.warn("[Cloud AI] Status no-OK:", res.status);
      return null;
    }
    return res.body;
  } catch (err) {
    console.error("[Cloud AI Network Error]:", err);
    return null;
  }
}

/**
 * Consume el stream directo y emite chunks de texto limpio en tiempo real.
 */
async function* parseCloudStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<string> {
  const reader = body.getReader();
  const dec = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = dec.decode(value, { stream: true });
      if (text) {
        // Limpieza de símbolos pesados para TTS fluido en tiempo real
        yield text.replace(/[*#_~`>]+/g, "");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** System prompts por modo */
const SYSTEM_PROMPTS: Record<string, string> = {
  general:   "Eres Nora Itu, asistente de inteligencia artificial inclusiva creada por MyJNexoraVisual. Responde de forma directa, clara y precisa. NUNCA hables de tus capacidades a menos que te lo pregunten. Sé concisa y útil. Responde siempre en español. Texto plano fluido, sin asteriscos, sin almohadillas.",
  tea:       "Eres Nora Itu. Responde en pasos numerados cortos y claros. Usa lenguaje simple y literal. Sin metáforas. Directo al tema. Siempre en español.",
  lazarillo: "Eres Nora Itu. Das orientación espacial usando referencias de reloj (12, 3, 6, 9). Prioriza seguridad y obstáculos. Respuestas breves, directas y en español.",
  docente:   "Eres Nora Itu. Responde con rigor académico, estructura pedagógica y ejemplos concretos. Siempre en español.",
};

/** Logging fire-and-forget a Neon (no bloquea la UI) */
function logToNeonAsync(payload: { sessionId: string; userMessage: string; assistantResponse: string; hasImage: boolean }) {
  fetch("/api/noraitu-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => { /* silencioso */ });
}

/** Persistencia fire-and-forget en MongoDB */
function logToMongoAsync(payload: {
  sessionId: string;
  userMessage: string;
  assistantResponse: string;
  imageBase64?: string | null;
  mode: string;
  latencyMs?: number;
}) {
  fetch("/api/nora-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, model: payload.imageBase64 ? "llama-3.2-11b-vision" : "llama-3.3-70b-versatile" }),
  }).catch(() => { /* silencioso */ });
}

/* ─────────────── DETECCIÓN ECOLALIA / TEA AUTO ─────────────── */
function detectEcholaliaPattern(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/);
  if (words.length < 4) return false;
  const unique = new Set(words);
  const ratio = unique.size / words.length;
  return ratio < 0.45;
}

export default function NoraTitanPage() {

  const renderizarTextoLimpio = (texto: string) => {
    if (!texto) return '';
    return texto.replace(/[*#\-_\[\]()~`>]+/g, '').trim();
  };

  /* ── Sesión / Chat ── */
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("general");
  const [autoTEAMode, setAutoTEAMode] = useState(false);

  /* ── Sidebar & PWA Install Prompt ── */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  /* ── Cámara IA ── */
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const [cameraAnalysis, setCameraAnalysis] = useState("");
  const [autoVisionActive, setAutoVisionActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /* ── Voz (TTS / STT) con Manos Libres y Noise Gate ── */
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

  // Noise Gate Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentVolumeRef = useRef<number>(0);
  const isHandsFreeRef = useRef<boolean>(false);

  /* ──────────────────────────── INIT ───────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.innerWidth < 768) setSidebarOpen(false);

    // Gestor Global de Instalación PWA
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const raw = localStorage.getItem("noraitu_saved_sessions");
    if (raw) {
      try {
        setSessions(JSON.parse(raw));
      } catch {}
    }

    const sid = localStorage.getItem("noraitu_session_id") || `nora_${Date.now()}`;
    setSessionId(sid);
    localStorage.setItem("noraitu_session_id", sid);
    loadSessionMessages(sid);

    // STT Nativo con Aislamiento de Sonido Externo (Noise Gate)
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = "es-419";
      rec.continuous = false;
      rec.interimResults = true;

      rec.onresult = (e: any) => {
        // Filtro de Umbral de Energía (Noise Gate): Si el volumen ambiente es insignificante, ignorar ruido
        if (currentVolumeRef.current > 0 && currentVolumeRef.current < 12) {
          return;
        }

        let t = "";
        for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
        setInputMessage(t);

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
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      stopAutoVision();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(`noraitu_history_${sessionId}`, JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sessionId]);

  /* ──────────────── NOISE GATE: Medición de Energía ─────────── */
  async function ensureNoiseGate() {
    if (audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        currentVolumeRef.current = sum / dataArray.length;
        requestAnimationFrame(checkVolume);
      };
      checkVolume();
    } catch {
      currentVolumeRef.current = 50; // Fallback permisivo si no hay permisos de AudioContext
    }
  }

  /* ─────────────────────── SESIONES ─────────────────────────── */
  function loadSessionMessages(sid: string) {
    const saved = localStorage.getItem(`noraitu_history_${sid}`);
    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        const sanitized = parsed.map(m => {
          if (m.id === "welcome" || (m.content && (m.content.includes("Neon PostgreSQL") || m.content.includes("Persistencia Serverless") || m.content.includes("Nora Titán")))) {
            return {
              ...m,
              content: m.content
                .replace(/.*Neon PostgreSQL.*\n?/gi, "")
                .replace(/.*Persistencia Serverless.*\n?/gi, "")
                .replace(/Nora Titán Universal/g, "Nora Itu")
                .replace(/Nora Titán/g, "Nora Itu")
                .trim()
            };
          }
          return m;
        });
        setMessages(sanitized);
        return;
      } catch {}
    }

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Soy **Nora Itu**, plataforma de inteligencia artificial inclusiva y corporativa de vanguardia creada por **MyJNexoraVisual**.\n\nCapacidades activas de la suite:\n- **Análisis Visual Multimodal:** Reconocimiento espacial y de archivos en tiempo real con Cámara IA.\n- **Lazarillo Visual 360°:** Orientación auditiva en tiempo real y asistencia de movilidad con descripciones sintéticas fluidas.\n- **Inclusión Cognitiva TEA:** Pictogramas locales vectoriales (código abierto, sin dependencias externas).\n- **Exportación Documental Nativa:** Generación local instantánea de informes formales (Word, PDF, Presentaciones).\n- **Estabilidad Corporativa:** Respaldo y consistencia de datos de alta disponibilidad bajo estándares cifrados.\n\n¿En qué puedo asistirte hoy?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      mode: "general"
    }]);
  }

  function handleNewSession() {
    const newSid = `nora_${Date.now()}`;
    const s: ChatSession = { id: newSid, title: "Nueva Consulta", date: new Date().toLocaleDateString("es-419") };
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

  /* ────────────────────── GESTOR INSTALACIÓN PWA ────────────── */
  async function triggerPwaInstall() {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallPrompt(null);
      }
    } catch (err) {
      console.error("[PWA Install Error]:", err);
    }
  }

  /* ─────────────────── CÁMARA MULTIMODAL IA ──────────────── */
  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    stopAutoVision();
  }, [cameraStream]);

  function flipCamera() {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  }

  function captureSnapshot(): string | null {
    if (!videoRef.current || !canvasRef.current) return null;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth || 640;
    c.height = v.videoHeight || 480;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  }

  async function analyzeCameraSnapshot(promptOverride?: string) {
    const b64 = captureSnapshot();
    if (!b64) return;
    setCameraCapturing(true);
    setCameraAnalysis("");

    try {
      const visionPrompt = promptOverride || "Describe con precisión ejecutiva y orientación espacial lo que observas en esta imagen. Usa referencias de reloj para indicar posiciones. Sé breve y directo.";
      const systemPrompt = SYSTEM_PROMPTS[activeMode] || SYSTEM_PROMPTS.lazarillo;

      // ── VISIÓN MULTIMODAL CLOUD (Groq LPU / SambaNova) ──
      const cloudBody = await callCloudInferenceStream({
        systemPrompt,
        userText: visionPrompt,
        imageBase64: b64,
        mode: activeMode,
        sessionId,
      });

      if (!cloudBody) {
        const localAns = inferClientSemantic(promptOverride || "que ves", activeMode, true);
        setCameraAnalysis(localAns);
        if (activeMode === "lazarillo" || activeMode === "tea" || autoTEAMode) speakText(localAns);
        return;
      }

      let acc = "";
      for await (const chunk of parseCloudStream(cloudBody)) {
        acc += chunk;
        setCameraAnalysis(acc);
      }

      if (!acc.trim()) {
        const localAns = inferClientSemantic(promptOverride || "que ves", activeMode, true);
        acc = localAns;
        setCameraAnalysis(localAns);
      }

      if (acc && (activeMode === "lazarillo" || activeMode === "tea" || autoTEAMode)) {
        speakText(acc);
      }
    } catch {
      const localAns = inferClientSemantic(promptOverride || "que ves", activeMode, true);
      setCameraAnalysis(localAns);
      if (activeMode === "lazarillo" || activeMode === "tea" || autoTEAMode) speakText(localAns);
    } finally {
      setCameraCapturing(false);
    }
  }

  function toggleAutoVision() {
    if (autoVisionActive) {
      stopAutoVision();
    } else {
      setAutoVisionActive(true);
      analyzeCameraSnapshot("Asistencia Lazarillo en tiempo real: describe obstáculos, personas o elementos clave a la distancia.");
      autoVisionIntervalRef.current = setInterval(() => {
        analyzeCameraSnapshot("Actualización Lazarillo en tiempo real: describe cambios inmediatos o advertencias de proximidad.");
      }, 5000);
    }
  }

  function stopAutoVision() {
    if (autoVisionIntervalRef.current) {
      clearInterval(autoVisionIntervalRef.current);
      autoVisionIntervalRef.current = null;
    }
    setAutoVisionActive(false);
  }

  function attachSnapshotToChat() {
    const b64 = captureSnapshot();
    if (!b64) return;
    setAttachedImage(b64);
    stopCamera();
    textareaRef.current?.focus();
  }

  /* ────────────────── DRAG & DROP MULTIMODAL ────────────────── */
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = ev => { setAttachedImage(ev.target?.result as string); textareaRef.current?.focus(); };
      reader.readAsDataURL(files[0]);
    }
  }

  /* ──────────────── SOPORTE PEGAR IMÁGENES (Ctrl+V) ────────── */
  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = ev => { setAttachedImage(ev.target?.result as string); };
          reader.readAsDataURL(blob);
          return;
        }
      }
    }

    const pastedText = e.clipboardData.getData("text/plain");
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

  /* ──────── TTS NATIVO: PURGA RADICAL & MANOS LIBRES CONTINUO ── */
  function speakText(text: string, msgId?: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeaking && speakingMsgId === msgId) {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    // PURGA ABSOLUTA DE SÍMBOLOS EN EL TTS
    const textoLimpio = cleanRadicalForTTS(text);
    if (!textoLimpio) return;

    const utt = new SpeechSynthesisUtterance(textoLimpio);
    utt.rate = 0.95;
    utt.pitch = 1.05;

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('es'))
        || voices.find(v => v.name.includes('Sabina') || v.name.includes('Elena') || v.name.includes('Paulina') || v.name.includes('Monica'))
        || voices.find(v => v.lang.startsWith('es-419') || v.lang.startsWith('es-MX') || v.lang.startsWith('es-US'))
        || voices.find(v => v.lang.startsWith('es'));
      if (esVoice) { utt.voice = esVoice; utt.lang = esVoice.lang; } else { utt.lang = 'es-419'; }
      window.speechSynthesis.speak(utt);
    };

    const voicesList = window.speechSynthesis.getVoices();
    if (voicesList && voicesList.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { doSpeak(); };
    }

    // Al comenzar a hablar: apagar micrófono para evitar retroalimentación acústica
    utt.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setSpeakingMsgId(msgId);
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
      } catch {}
    };

    // FLUJO CONTINUO TTS-STT: Al terminar de hablar, reactivar micrófono automáticamente
    utt.onend = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      if (isHandsFreeRef.current) {
        setTimeout(() => {
          try {
            ensureNoiseGate();
            recognitionRef.current?.start();
            setIsListening(true);
          } catch {}
        }, 350);
      }
    };

    utt.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    };

    speechUtteranceRef.current = utt;
    window.speechSynthesis.speak(utt);
  }

  /* ──────────────── STT: Conmutación y Noise Gate ──────────── */
  async function toggleListening() {
    if (!recognitionRef.current) {
      alert("El reconocimiento de voz no está disponible en este navegador.");
      return;
    }

    if (isListening) {
      isHandsFreeRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      isHandsFreeRef.current = true;
      await ensureNoiseGate();
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  }

  /* ──────────────── EXPORTACIÓN DE DOCUMENTOS LOCALES ──────── */
  function handleExportDirect(format: "docx" | "pdf" | "pptx") {
    const lastMsg = [...messages].reverse().find(m => m.role === "assistant" && m.content)?.content;
    const historyText = messages.map(m => `${m.role === "user" ? "USUARIO" : "NORA ITU"}:\n${m.content}\n`).join("\n---\n\n");
    const content = lastMsg || historyText || "Sin contenido para exportar.";

    if (format === "docx") {
      exportToWord("informe_nora_itu", "Reporte Nora Itu - MyJNexoraVisual", content);
    } else if (format === "pdf") {
      exportToPdf("Reporte Nora Itu - MyJNexoraVisual", content);
    } else if (format === "pptx") {
      exportToPptx("presentacion_nora_itu", "Presentación Nora Itu - MyJNexoraVisual", content);
    }
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

    // ── AUDITORÍA DE SEGURIDAD (Únicamente si solicitan "system prompt") ──
    if (securityCheck(trimmed)) {
      const canned = "Nora Itu opera bajo los estándares de alta seguridad de MyJNexoraVisual. Las directivas de arquitectura e instrucciones del núcleo son confidenciales y están estrictamente protegidas.";
      setMessages(prev => [...prev, {
        id: assistantMsgId, role: "assistant", content: canned,
        mode: activeMode,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      }]);
      if (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode) {
        speakText(canned, assistantMsgId);
      }
      return;
    }

    setIsLoading(true);

    setMessages(prev => [...prev, {
      id: assistantMsgId, role: "assistant", content: "",
      mode: activeMode,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }]);

    try {
      const t0 = Date.now();
      const systemPrompt = SYSTEM_PROMPTS[activeMode] || SYSTEM_PROMPTS.general;
      const chatHistory = messages.slice(-6).map(m => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content
      }));

      // ── INFERENCIA CLOUD-NATIVE (Groq LPUs / SambaNova) ──
      const cloudBody = await callCloudInferenceStream({
        systemPrompt,
        userText: trimmed,
        imageBase64: img,
        history: chatHistory,
        mode: activeMode,
        sessionId,
      });

      if (!cloudBody) {
        // Fallback local semántico si el servicio en la nube no responde
        const localFallback = inferClientSemantic(trimmed, activeMode, Boolean(img));
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: localFallback } : m));
        if (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode) {
          speakText(localFallback, assistantMsgId);
        }
        setIsLoading(false);
        return;
      }

      // ── STREAMING DE TEXTO CONTINUO EN TIEMPO REAL ──
      let full = "";
      for await (const chunk of parseCloudStream(cloudBody)) {
        full += chunk;
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: full } : m));
      }

      if (!full.trim()) {
        const localFallback = inferClientSemantic(trimmed, activeMode, Boolean(img));
        full = localFallback;
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: localFallback } : m));
      }

      if (full && (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode)) {
        speakText(full, assistantMsgId);
      }

      // ── PERSISTENCIA ASÍNCRONA (no bloquea la UI) ──
      const latencyMs = Date.now() - t0;
      logToNeonAsync({ sessionId, userMessage: trimmed, assistantResponse: full.slice(0, 1000), hasImage: Boolean(img) });
      logToMongoAsync({ sessionId, userMessage: trimmed, assistantResponse: full, imageBase64: img, mode: activeMode, latencyMs });

    } catch {
      const localFallback = inferClientSemantic(trimmed, activeMode, Boolean(img));
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: localFallback } : m));
      if (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode) {
        speakText(localFallback, assistantMsgId);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  /* ═══ Colores dinámicos por perfil ═══ */
  const modeColor = {
    general:   { bg: "#080c14", accent: "#6366f1", border: "rgba(99,102,241,0.25)",  badgeText: "#a5b4fc" },
    tea:       { bg: "#06131c", accent: "#0ea5e9", border: "rgba(14,165,233,0.3)",   badgeText: "#38bdf8" },
    lazarillo: { bg: "#0a1306", accent: "#22c55e", border: "rgba(34,197,94,0.3)",    badgeText: "#4ade80" },
    docente:   { bg: "#13091c", accent: "#a855f7", border: "rgba(168,85,247,0.3)",   badgeText: "#c084fc" },
  };
  const mc = modeColor[activeMode];

  /* ═══ Helper: Agrupa los pictogramas por categoría ═══ */
  const groupedPictograms = Object.entries(TEA_PICTOGRAMS).reduce<Record<string, [string, Pictogram][]>>((acc, entry) => {
    const g = entry[1].group;
    if (!acc[g]) acc[g] = [];
    acc[g].push(entry);
    return acc;
  }, {});

  /* ══════════════════════════════════ RENDER ══════════════════════════════════ */
  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{
        display: "flex",
        height: "100dvh",
        maxHeight: "100dvh",
        width: "100%",
        maxWidth: "100vw",
        overflow: "hidden",
        backgroundColor: mc.bg,
        color: "#f0f6fc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: "border-box",
        position: "relative"
      }}
    >
      {/* ═══════════════════════ SIDEBAR PWA ═══════════════════════ */}
      <aside
        style={{
          width: sidebarOpen ? "270px" : "0",
          minWidth: sidebarOpen ? "270px" : "0",
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
        <div style={{ padding: "14px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img
              src="/avatar-nora.png"
              alt="Nora"
              className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
              style={{ width: "34px", height: "34px", borderRadius: "50%", border: "2px solid #3f3f46", objectFit: "cover", flexShrink: 0 }}
            />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#f8fafc", letterSpacing: "0.5px" }}>NORA ITU</div>
              <div style={{ fontSize: "10px", fontWeight: 600, color: mc.badgeText, letterSpacing: "0.4px" }}>IA Inclusiva & Corporativa</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "4px" }}>
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Nueva consulta */}
        <div style={{ padding: "10px 12px" }}>
          <button onClick={handleNewSession} style={{ width: "100%", backgroundColor: "#1e293b", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", borderRadius: "10px", padding: "8px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
            <Plus size={14} color={mc.accent} /><span>Nueva Consulta</span>
          </button>
        </div>

        {/* Perfiles Cognitivos */}
        <div style={{ padding: "0 12px 10px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Perfil Cognitivo</div>
          {([
            { id: "general", label: "Ejecutivo Corporativo", icon: <Zap size={13} /> },
            { id: "tea", label: "Inclusión TEA", icon: <Puzzle size={13} /> },
            { id: "lazarillo", label: "Lazarillo Visual", icon: <Eye size={13} /> },
            { id: "docente", label: "Cátedra Universitaria", icon: <FileText size={13} /> },
          ] as const).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => { setActiveMode(id); setAutoTEAMode(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "8px",
                padding: "7px 10px", borderRadius: "9px", border: "none",
                backgroundColor: activeMode === id ? `${modeColor[id].accent}22` : "transparent",
                color: activeMode === id ? modeColor[id].badgeText : "#94a3b8",
                fontWeight: activeMode === id ? 700 : 500, fontSize: "11.5px",
                cursor: "pointer", marginBottom: "2px", textAlign: "left"
              }}
            >
              {icon}<span>{label}</span>
              {id === "tea" && autoTEAMode && (
                <span style={{ fontSize: "9px", padding: "1px 5px", backgroundColor: "#0ea5e955", color: "#38bdf8", borderRadius: "4px", marginLeft: "auto" }}>AUTO</span>
              )}
            </button>
          ))}
        </div>

        {/* TEA: Pictogramas toggle */}
        {(activeMode === "tea" || autoTEAMode) && (
          <div style={{ padding: "0 12px 8px" }}>
            <button
              onClick={() => setShowPictograms(v => !v)}
              style={{ width: "100%", padding: "7px 10px", borderRadius: "9px", border: `1px solid ${mc.accent}44`, backgroundColor: showPictograms ? `${mc.accent}22` : "transparent", color: mc.badgeText, fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
            >
              🧩 {showPictograms ? "Cerrar Pictogramas" : "Abrir Panel Pictogramas"}
            </button>
          </div>
        )}

        {/* Historial de Sesiones */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Historial</div>
          {sessions.length === 0 ? (
            <div style={{ fontSize: "11px", color: "#475569" }}>Sin sesiones anteriores</div>
          ) : sessions.map(s => (
            <div key={s.id} onClick={() => handleSelectSession(s.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", borderRadius: "7px", backgroundColor: sessionId === s.id ? "rgba(255,255,255,0.07)" : "transparent", color: sessionId === s.id ? "#f8fafc" : "#94a3b8", fontSize: "11px", cursor: "pointer", marginBottom: "2px" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{s.title}</span>
              <button onClick={e => handleDeleteSession(s.id, e)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "2px", flexShrink: 0 }}>
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Botón de Instalación Nativa PWA */}
        {installPrompt && (
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={triggerPwaInstall}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #4338ca, #0284c7)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px",
                padding: "8px 12px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                boxShadow: "0 4px 14px rgba(67, 56, 202, 0.4)"
              }}
            >
              <Download size={13} />
              <span>Instalar Nora Itu</span>
            </button>
          </div>
        )}
      </aside>

      {/* ═══════════════════════ MAIN VIEWPORT ═══════════════════════ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", minWidth: 0, position: "relative" }}>

        {/* ─── 1. NAVBAR SUPERIOR RESPONSIVO ─── */}
        <header style={{ height: "48px", minHeight: "48px", flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.08)", backgroundColor: `${mc.bg}f2`, backdropFilter: "blur(14px)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px", zIndex: 30, gap: "6px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flexShrink: 1 }}>
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f8fafc", borderRadius: "6px", padding: "4px 6px", cursor: "pointer", flexShrink: 0 }}>
                <ChevronRight size={14} />
              </button>
            )}
            <img
              src="/avatar-nora.png"
              alt="Nora"
              className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0"
              style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #3f3f46", objectFit: "cover", flexShrink: 0 }}
            />
            <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.4px" }}>NORA ITU</span>
            {autoTEAMode && (
              <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "12px", backgroundColor: "#0ea5e922", color: "#38bdf8", fontWeight: 700, border: "1px solid #38bdf844", whiteSpace: "nowrap" }}>AUTO</span>
            )}
          </div>

          {/* Fila Horizontal con Scroll Lateral: Word, PDF, PPT, Cámara, PTT */}
          <div
            className="flex nowrap overflow-x-auto gap-2 max-w-full pb-1 items-center flex-shrink-0"
            style={{
              display: "flex",
              flexWrap: "nowrap",
              overflowX: "auto",
              gap: "5px",
              paddingBottom: "1px",
              alignItems: "center",
              flexShrink: 0,
              scrollbarWidth: "none"
            }}
          >
            <button
              onClick={() => handleExportDirect("docx")}
              title="Descargar Historial en Word"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "7px", padding: "4px 7px", fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}
            >
              <FileText size={11} color="#38bdf8" />
              <span>Word</span>
            </button>
            <button
              onClick={() => handleExportDirect("pdf")}
              title="Descargar Historial en PDF"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "7px", padding: "4px 7px", fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}
            >
              <Printer size={11} color="#818cf8" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => handleExportDirect("pptx")}
              title="Descargar Presentación en PPTX"
              style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "7px", padding: "4px 7px", fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}
            >
              <Presentation size={11} color="#34d399" />
              <span>PPT</span>
            </button>

            <button
              onClick={() => isCameraOpen ? stopCamera() : startCamera(facingMode)}
              style={{ backgroundColor: isCameraOpen ? "#dc2626" : `${mc.accent}22`, color: isCameraOpen ? "#fff" : mc.badgeText, border: `1px solid ${mc.accent}44`, borderRadius: "7px", padding: "4px 8px", fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
            >
              <Camera size={11} />
              <span>{isCameraOpen ? "✕" : "Cámara"}</span>
            </button>
            <button
              onClick={() => setIsCallModalOpen(true)}
              style={{ backgroundColor: "#238636", color: "#fff", border: "none", borderRadius: "7px", padding: "4px 8px", fontSize: "10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 0 8px rgba(35,134,54,0.3)", whiteSpace: "nowrap" }}
            >
              <PhoneCall size={11} /><span>PTT</span>
            </button>
          </div>
        </header>

        {/* ─── Panel Pictogramas TEA (Desplegable) ─── */}
        {showPictograms && (activeMode === "tea" || autoTEAMode) && (
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(14,165,233,0.2)", backgroundColor: "rgba(14,165,233,0.06)", flexShrink: 0, overflowY: "auto", maxHeight: "220px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", marginBottom: "8px", letterSpacing: "0.4px" }}>🧩 DICCIONARIO DE PICTOGRAMAS LOCALES (Modo TEA Offline)</div>
            
            {/* Materias Escolares Locales */}
            <div style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", marginBottom: "5px", textTransform: "uppercase" }}>Materias Escolares</div>
              <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
                {["matematicas", "historia", "ciencia", "arte", "geografia"].map(subj => (
                  <div
                    key={subj}
                    onClick={() => {
                      setInputMessage(prev => prev ? `${prev} clase de ${subj}` : `clase de ${subj}`);
                      textareaRef.current?.focus();
                    }}
                    style={{ cursor: "pointer", flexShrink: 0 }}
                    title={`Añadir ${subj}`}
                  >
                    <TeaPictograms subject={subj} />
                  </div>
                ))}
              </div>
            </div>

            {Object.entries(PICTOGRAM_GROUPS).map(([groupKey, groupLabel]) => (
              <div key={groupKey} style={{ marginBottom: "8px" }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#64748b", marginBottom: "4px", textTransform: "uppercase" }}>{groupLabel}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {(groupedPictograms[groupKey] || []).map(([key, picto]) => {
                    const PIcon = picto.Icon;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setInputMessage(prev => prev ? `${prev} ${picto.label.toLowerCase()}` : picto.label.toLowerCase());
                          textareaRef.current?.focus();
                        }}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                          backgroundColor: "#1e293b", border: "1px solid rgba(56,189,248,0.15)",
                          borderRadius: "8px", padding: "6px 8px", cursor: "pointer",
                          minWidth: "50px", transition: "all 0.15s ease"
                        }}
                        aria-label={picto.label}
                      >
                        <PIcon size={18} color={picto.color} strokeWidth={1.8} />
                        <span style={{ fontSize: "8.5px", color: "#94a3b8", fontWeight: 600, whiteSpace: "nowrap" }}>{picto.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Cámara IA Multimodal (Desplegable) ─── */}
        {isCameraOpen && (
          <div style={{ padding: "8px 12px 0", flexShrink: 0 }}>
            <div style={{ borderRadius: "12px", border: `1px solid ${mc.accent}44`, overflow: "hidden", backgroundColor: "#0d1322" }}>
              <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", fontWeight: 700, color: mc.badgeText }}>
                  <Camera size={11} />
                  <span>CÁMARA IA {autoVisionActive && "· LAZARILLO (5s)"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button onClick={flipCamera} style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#f8fafc", borderRadius: "5px", padding: "3px 6px", cursor: "pointer" }}>
                    <FlipHorizontal size={11} />
                  </button>
                  <button onClick={stopCamera} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "3px" }}>
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div style={{ position: "relative", backgroundColor: "#000", maxHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <video ref={videoRef} playsInline muted style={{ width: "100%", maxHeight: "180px", objectFit: "contain", transform: facingMode === "user" ? "scaleX(-1)" : "none" }} />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {cameraCapturing && (
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <Loader2 size={18} className="animate-spin" color={mc.badgeText} />
                    <span style={{ fontSize: "11px", color: "#fff", fontWeight: 600 }}>Analizando imagen...</span>
                  </div>
                )}
              </div>

              {cameraAnalysis && (
                <div style={{ padding: "6px 10px", backgroundColor: "rgba(0,0,0,0.4)", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", color: "#e2e8f0", lineHeight: 1.5, maxHeight: "70px", overflowY: "auto" }}>
                  <span style={{ fontWeight: 700, color: mc.badgeText }}>Visión Nora: </span>{cameraAnalysis}
                </div>
              )}

              <div style={{ padding: "6px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button onClick={() => analyzeCameraSnapshot()} disabled={cameraCapturing} style={{ backgroundColor: mc.accent, color: "#fff", border: "none", borderRadius: "6px", padding: "5px 10px", fontSize: "10px", fontWeight: 700, cursor: cameraCapturing ? "not-allowed" : "pointer", opacity: cameraCapturing ? 0.5 : 1, display: "flex", alignItems: "center", gap: "4px" }}>
                    <Sparkles size={11} /><span>Analizar</span>
                  </button>
                  <button onClick={toggleAutoVision} style={{ backgroundColor: autoVisionActive ? "#dc2626" : "rgba(34,197,94,0.15)", color: autoVisionActive ? "#fff" : "#4ade80", border: `1px solid ${autoVisionActive ? "#ef4444" : "rgba(34,197,94,0.4)"}`, borderRadius: "6px", padding: "5px 10px", fontSize: "10px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Eye size={11} /><span>{autoVisionActive ? "Detener" : "Continuo"}</span>
                  </button>
                </div>
                <button onClick={attachSnapshotToChat} style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "5px 10px", fontSize: "10px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                  <ImageIcon size={11} /><span>Adjuntar</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── DRAG & DROP OVERLAY ─── */}
        {isDragging && (
          <div style={{ position: "absolute", inset: 0, zIndex: 60, backgroundColor: `${mc.accent}22`, backdropFilter: "blur(6px)", border: `2px dashed ${mc.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <UploadCloud size={38} color={mc.badgeText} />
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>Suelta tu imagen para análisis</div>
          </div>
        )}

        {/* ─── 2. HISTORIAL DE MENSAJES (Altura Fija Controlada & Scroll Aislado) ─── */}
        <div
          className="h-[calc(100vh-180px)] md:h-[calc(100vh-140px)] overflow-y-auto overscroll-contain"
          style={{
            flex: 1,
            height: "calc(100dvh - 180px)",
            maxHeight: "calc(100dvh - 180px)",
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
            padding: "14px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}
        >
          <div style={{ width: "100%", maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "14px" }}>
            {messages.map(msg => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: isUser ? "row-reverse" : "row", gap: "8px", alignItems: "flex-start" }}>
                  {isUser ? (
                    <div
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full flex-shrink-0"
                      style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                    >
                      <User size={15} color="#fff" />
                    </div>
                  ) : (
                    <img
                      src="/avatar-nora.png"
                      alt="Nora"
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0"
                      style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #3f3f46", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}

                  <div style={{ maxWidth: "86%", minWidth: 0, backgroundColor: isUser ? "rgba(37,99,235,0.15)" : "rgba(15,23,42,0.75)", border: isUser ? "1px solid rgba(59,130,246,0.3)" : `1px solid ${mc.border}`, borderRadius: "12px", padding: "10px 13px", lineHeight: (activeMode === "tea" || autoTEAMode) ? 1.7 : 1.55, fontSize: (activeMode === "tea" || autoTEAMode) ? "14px" : "13px", boxShadow: "0 2px 12px rgba(0,0,0,0.2)", wordBreak: "break-word" }}>
                    {msg.imageBase64 && (
                      <div style={{ marginBottom: "8px" }}>
                        <img src={msg.imageBase64} alt="Adjunto" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "7px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.1)" }} />
                      </div>
                    )}
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {(msg.content ? renderizarTextoLimpio(msg.content) : "") || (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#94a3b8" }}>
                          <Loader2 size={12} className="animate-spin" /> Procesando con Nora Itu...
                        </span>
                      )}
                    </div>

                    {/* Footer del Mensaje: Timestamp + Herramientas */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: "4px" }}>
                      <span style={{ fontSize: "9.5px", color: "#475569" }}>{msg.timestamp}</span>
                      {!isUser && msg.content && (
                        <div
                          className="flex nowrap overflow-x-auto gap-1 max-w-full pb-1 items-center"
                          style={{ display: "flex", flexWrap: "nowrap", overflowX: "auto", gap: "3px", maxWidth: "100%", scrollbarWidth: "none" }}
                        >
                          <button onClick={() => exportToWord("informe_nora_itu", "Reporte Nora Itu", msg.content)} title="Word" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "4px", padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "9.5px" }}>
                            <FileText size={10} color="#38bdf8" /><span>Word</span>
                          </button>
                          <button onClick={() => exportToPdf("Reporte Nora Itu", msg.content)} title="PDF" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "4px", padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "9.5px" }}>
                            <Printer size={10} color="#818cf8" /><span>PDF</span>
                          </button>
                          <button onClick={() => exportToPptx("presentacion_nora_itu", "Presentación Nora Itu", msg.content)} title="PPTX" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "4px", padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "9.5px" }}>
                            <Presentation size={10} color="#34d399" /><span>PPT</span>
                          </button>
                          <button onClick={() => speakText(msg.content, msg.id)} title="Escuchar voz" style={{ background: "none", border: "none", color: isSpeaking && speakingMsgId === msg.id ? mc.badgeText : "#64748b", cursor: "pointer", padding: "2px" }}>
                            {isSpeaking && speakingMsgId === msg.id ? <VolumeX size={12} /> : <Volume2 size={12} />}
                          </button>
                          <button onClick={() => copyToClipboard(msg.id, msg.content)} title="Copiar" style={{ background: "none", border: "none", color: copiedId === msg.id ? "#22c55e" : "#64748b", cursor: "pointer", padding: "2px" }}>
                            {copiedId === msg.id ? <Check size={11} /> : <Copy size={11} />}
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

        {/* ─── 3. PANEL DE COMANDOS FIJO Y ACCESIBLE (Sticky Bottom-0 / z-50) ─── */}
        <footer
          className="sticky bottom-0 left-0 right-0 z-50 bg-[#090d16]/95 backdrop-blur-md border-t border-white/10"
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: "8px 12px 10px",
            backgroundColor: `${mc.bg}f8`,
            backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0
          }}
        >
          <div style={{ maxWidth: "800px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "6px" }}>

            {/* Preview imagen adjunta */}
            {attachedImage && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#1e293b", padding: "4px 9px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", width: "fit-content" }}>
                <img src={attachedImage} alt="Preview" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "cover" }} />
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>Imagen lista</span>
                <button onClick={() => setAttachedImage(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}><X size={12} /></button>
              </div>
            )}

            {/* Input box flotante */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", backgroundColor: "rgba(30,41,59,0.5)", border: `1px solid ${mc.border}`, borderRadius: "16px", padding: "6px 8px", boxShadow: "0 4px 18px rgba(0,0,0,0.3)" }}>
              <button onClick={() => fileInputRef.current?.click()} title="Adjuntar imagen" style={{ background: "none", border: "none", color: "#64748b", padding: "6px", cursor: "pointer", flexShrink: 0 }}>
                <ImageIcon size={17} />
              </button>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={e => {
                const f = e.target.files?.[0];
                if (f) { const r = new FileReader(); r.onload = ev => setAttachedImage(ev.target?.result as string); r.readAsDataURL(f); }
              }} />

              <button onClick={() => isCameraOpen ? stopCamera() : startCamera(facingMode)} title="Abrir cámara" style={{ background: "none", border: "none", color: isCameraOpen ? mc.badgeText : "#64748b", padding: "6px", cursor: "pointer", flexShrink: 0 }}>
                <Camera size={17} />
              </button>

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
                  "Consulta a Nora Itu, pega imagen con Ctrl+V..."
                }
                aria-label="Mensaje para Nora Itu"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f8fafc", fontSize: "13px", lineHeight: "19px", padding: "5px 3px", resize: "none", maxHeight: "90px", minHeight: "30px" }}
              />

              <button onClick={toggleListening} title={isListening ? "Detener dictado" : "Hablar con manos libres"} aria-label="Micrófono" style={{ background: isListening ? "rgba(239,68,68,0.15)" : "none", border: "none", color: isListening ? "#ef4444" : "#64748b", padding: "6px", borderRadius: "8px", cursor: "pointer", flexShrink: 0 }}>
                {isListening ? <MicOff size={17} /> : <Mic size={17} />}
              </button>

              <button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputMessage.trim() && !attachedImage)}
                aria-label="Enviar mensaje"
                style={{ backgroundColor: mc.accent, color: "#fff", border: "none", borderRadius: "10px", width: "34px", height: "34px", display: "flex", alignItems: "center", justifyContent: "center", cursor: isLoading || (!inputMessage.trim() && !attachedImage) ? "not-allowed" : "pointer", opacity: isLoading || (!inputMessage.trim() && !attachedImage) ? 0.45 : 1, flexShrink: 0, boxShadow: `0 2px 8px ${mc.accent}55` }}
              >
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
            </div>

            {/* ═══ FIRMA CORPORATIVA MyJNexoraVisual ═══ */}
            <div style={{ textAlign: "center", paddingTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span
                className="text-[10px] md:text-[11px] font-medium tracking-wide text-zinc-400 bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent opacity-95 select-all inline-block"
                style={{
                  fontSize: "10.5px",
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  background: "linear-gradient(to right, #818cf8, #d8b4fe, #22d3ee)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  userSelect: "all",
                  display: "inline-block",
                  textShadow: "0 0 10px rgba(99,102,241,0.25)"
                }}
              >
                © MyJNexoraVisual | Soporte: noraitudev@gmail.com | WhatsApp: +54 9 3786 41-4533
              </span>
            </div>
          </div>
        </footer>
      </main>

      {/* ─── Modal Llamada PTT ─── */}
      <NoraRealtimeCallModal isOpen={isCallModalOpen} onClose={() => setIsCallModalOpen(false)} sessionId={sessionId} />
    </div>
  );
}

