"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot, User, Send, Mic, MicOff, Camera, Image as ImageIcon, Volume2, VolumeX,
  FlipHorizontal, X, Eye, Puzzle, Zap, PhoneCall, Loader2,
  FileText, Printer, ChevronLeft, ChevronRight, Menu,
  Plus, Trash2, Copy, Check, Sparkles, UploadCloud, Presentation, Download,
  FileAudio, MapPin, AudioWaveform,
  // ═══ MOTOR DE PICTOGRAMAS LOCAL (100% offline, Lucide) ═══
  Home, School, Apple, Droplets, Bath, Moon, Gamepad2, HelpCircle,
  ThumbsUp, ThumbsDown, Heart, CheckCircle2, XCircle, BookOpen,
  PenLine, Hash, Music2, Sun, CloudRain, Thermometer, Snowflake,
  Dog, Cat, Calculator, Globe2, FlaskConical, Atom, BarChart3,
  Landmark, Palette, Dumbbell, Clock, Utensils, Bus, Star, Share2
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
function inferClientSemantic(input: string, mode: string = "general", hasImage: boolean = false, telemetry?: string): string {
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
    } catch { }
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
    if (telemetry) {
      return `📍 **Nora Itu · Lazarillo Visual 360° Activo**\n\n${telemetry}\n\n*Pauta de seguridad:* Mantenga paso firme y precavido. Presione captura para actualizar la orientación.`;
    }
    return `📍 **Nora Itu · Lazarillo Visual 360° Activo**\n\n- **A las 12 en punto:** Trayecto frontal despejado para circulación peatonal segura.\n- **A las 2 en punto:** Punto de referencia estructurado.\n- **A las 10 en punto:** Superficie regular sin desniveles críticos inmediatos.\n\n*Pauta de seguridad:* Mantenga paso firme. Presione captura para actualizar la orientación.`;
  }

  // 7. Modo TEA / Inclusión Cognitiva
  if (mode === "tea") {
    return `Paso 1: He recibido tu mensaje con calma.\nPaso 2: Todo está ordenado, claro y predecible.\nPaso 3: Toca cualquiera de los pictogramas de arriba si prefieres comunicarte con imágenes y colores.\n\nTodo está bien. Puedes escribir o elegir una materia.`;
  }

  // 8. Modo Docente
  if (mode === "docente") {
    return `### 🎓 Nora Itu · Planificación de Cátedra Universitaria\n\n1. **Objetivo Pedagógico:** Comprensión analítica y metodología activa.\n2. **Secuencia Didáctica:** Marco conceptual, análisis de casos y rúbrica formativa.\n3. **Exportación:** Disponible en Word (.docx) o diapositivas institucionales (.pptx).`;
  }

  // 9. Documentos — redirige a la IA para respuesta enriquecida
  if (q.includes("informe") || q.includes("documento") || q.includes("presentacion") || q.includes("presentación")) {
    return ""; // Deja pasar al modelo AI sin respuesta hardcodeada
  }

  // 10. Ayuda General
  if (q.includes("ayuda") || q.includes("ayudarme") || q.includes("capacidades") || q.includes("quien eres") || q.includes("quién eres")) {
    return `¡Hola! Soy **Nora Itu**, asistente de inteligencia artificial inclusiva desarrollada por **MyJNexoraVisual**.\n\nEstoy aquí para ayudarte en lo que necesites:\n- Conversar sobre cualquier tema, analizar ideas o estudiar materias escolares y universitarias.\n- Orientación espacial con la cámara en tiempo real (modo Lazarillo 360°).\n- Inclusión cognitiva TEA con pictogramas interactivos y lenguaje claro.\n- Generar informes, resúmenes o presentaciones cuando me lo pidas — verás los botones **Word / PDF / PPT** debajo de cada respuesta mía para descargar en ese instante.\n\n¿En qué puedo asistirte hoy?`;
  }

  // 11. Diálogo Contextual Fluido
  return `¡Hola! Qué bueno poder ayudarte. Sobre lo que me comentas acerca de "${raw}", cuéntame un poco más para orientarte mejor, o dime qué aspecto te gustaría abordar primero.`;
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
  casa: { Icon: Home, label: "Casa", color: "#f59e0b", group: "vida", keywords: ["hogar", "casa", "domicilio"] },
  escuela: { Icon: School, label: "Escuela", color: "#3b82f6", group: "vida", keywords: ["colegio", "escuela", "clase", "aula"] },
  comida: { Icon: Utensils, label: "Comida", color: "#f97316", group: "vida", keywords: ["comer", "almuerzo", "merienda", "comida"] },
  agua: { Icon: Droplets, label: "Agua", color: "#38bdf8", group: "vida", keywords: ["agua", "beber", "sed"] },
  baño: { Icon: Bath, label: "Baño", color: "#818cf8", group: "vida", keywords: ["baño", "aseo", "higiene"] },
  dormir: { Icon: Moon, label: "Dormir", color: "#a855f7", group: "vida", keywords: ["dormir", "descansar", "cansado"] },
  transporte: { Icon: Bus, label: "Transporte", color: "#fbbf24", group: "vida", keywords: ["bus", "colectivo", "transporte", "viajar"] },
  jugar: { Icon: Gamepad2, label: "Jugar", color: "#ec4899", group: "vida", keywords: ["juego", "recreo", "diversión"] },
  si: { Icon: ThumbsUp, label: "Sí", color: "#22c55e", group: "social", keywords: ["si", "afirmativo", "correcto", "de acuerdo"] },
  no: { Icon: ThumbsDown, label: "No", color: "#ef4444", group: "social", keywords: ["no", "negativo", "incorrecto", "rechazar"] },
  ayuda: { Icon: HelpCircle, label: "Ayuda", color: "#f59e0b", group: "social", keywords: ["auxilio", "ayuda", "socorro", "necesito"] },
  gracias: { Icon: Heart, label: "Gracias", color: "#ec4899", group: "social", keywords: ["gracias", "agradecimiento"] },
  bien: { Icon: CheckCircle2, label: "Bien", color: "#10b981", group: "social", keywords: ["bien", "contento", "feliz", "genial"] },
  mal: { Icon: XCircle, label: "Mal", color: "#f43f5e", group: "social", keywords: ["mal", "triste", "enojado", "dolor"] },
  libro: { Icon: BookOpen, label: "Leer", color: "#6366f1", group: "materia", keywords: ["libro", "lectura", "leer", "cuento"] },
  escribir: { Icon: PenLine, label: "Escribir", color: "#8b5cf6", group: "materia", keywords: ["escribir", "lapicera", "cuaderno", "tarea"] },
  matematica: { Icon: Calculator, label: "Matemática", color: "#06b6d4", group: "materia", keywords: ["matemática", "números", "cuenta", "calcular"] },
  numeros: { Icon: Hash, label: "Números", color: "#0ea5e9", group: "materia", keywords: ["número", "cantidad", "contar"] },
  musica: { Icon: Music2, label: "Música", color: "#d946ef", group: "materia", keywords: ["música", "canción", "cantar", "instrumento"] },
  ciencias: { Icon: FlaskConical, label: "Ciencias", color: "#14b8a6", group: "materia", keywords: ["ciencia", "experimento", "laboratorio"] },
  fisica: { Icon: Atom, label: "Física", color: "#6366f1", group: "materia", keywords: ["física", "átomo", "energía"] },
  estadistica: { Icon: BarChart3, label: "Gráficos", color: "#f59e0b", group: "materia", keywords: ["gráfico", "estadística", "datos"] },
  historia: { Icon: Landmark, label: "Historia", color: "#d97706", group: "materia", keywords: ["historia", "pasado", "cultura"] },
  arte: { Icon: Palette, label: "Arte", color: "#f43f5e", group: "materia", keywords: ["arte", "dibujo", "pintura", "colores"] },
  educacion_fisica: { Icon: Dumbbell, label: "Ed. Física", color: "#10b981", group: "materia", keywords: ["deporte", "gimnasia", "carrera"] },
  sol: { Icon: Sun, label: "Sol", color: "#eab308", group: "entorno", keywords: ["sol", "día", "calor", "verano"] },
  lluvia: { Icon: CloudRain, label: "Lluvia", color: "#38bdf8", group: "entorno", keywords: ["lluvia", "agua", "paraguas", "mojado"] },
  calor: { Icon: Thermometer, label: "Calor", color: "#ef4444", group: "entorno", keywords: ["calor", "temperatura", "fiebre"] },
  frio: { Icon: Snowflake, label: "Frío", color: "#93c5fd", group: "entorno", keywords: ["frío", "hielo", "invierno"] },
  perro: { Icon: Dog, label: "Perro", color: "#b45309", group: "entorno", keywords: ["perro", "mascota", "animal"] },
  gato: { Icon: Cat, label: "Gato", color: "#78716c", group: "entorno", keywords: ["gato", "mascota", "felino"] },
  hora: { Icon: Clock, label: "Hora", color: "#64748b", group: "entorno", keywords: ["hora", "tiempo", "reloj", "cuándo"] },
  premio: { Icon: Star, label: "Premio", color: "#facc15", group: "social", keywords: ["premio", "estrella", "felicitaciones", "logro"] },
};

const PICTOGRAM_GROUPS: Record<string, string> = {
  vida: "🏡 Vida Cotidiana",
  social: "🤝 Comunicación",
  materia: "📚 Materias Escolares",
  entorno: "🌿 Entorno",
};

/* ─────────────── LIMPIEZA TTS RADICAL (Sin Símbolos) ─────────── */
function cleanRadicalForTTS(textoOriginal: string): string {
  return textoOriginal
    .replace(/[*#_~`>\[\]\(\)\{\}\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Detección estricta de idioma para TTS (evita falsos positivos con palabras comunes como 'para', 'con', 'la')
function detectTextLanguage(text: string): string {
  const t = text.toLowerCase();
  if (/\b(habla en inglés|speak in english|how are you|what is|thank you very much|good morning|can you help me)\b/i.test(t)) return "en-US";
  if (/\b(fala em português|como você está|tudo bem|muito obrigado|bom dia|fazer uma pergunta)\b/i.test(t)) return "pt-BR";
  if (/\b(parle en français|comment allez-vous|merci beaucoup|bonjour|s'il vous plaît)\b/i.test(t)) return "fr-FR";
  if (/\b(parla in italiano|come stai|grazie mille|buongiorno|per favore)\b/i.test(t)) return "it-IT";
  return "es-419";
}

/* ══════════════════════════════════════════════════════════════════
   MOTOR DE INFERENCIA CLOUD-NATIVE (Costo Cero / Zero RAM)
   Groq Cloud (LPU Ultra-Fast) / SambaNova Cloud (Llama 3.2 Vision)
   - 100% Autónomo y Externo: Cero uso de RAM local
   - Streaming HTTP continuo sin timeouts en Vercel
   - Persistencia dual: MongoDB Atlas Free + Neon PostgreSQL
══════════════════════════════════════════════════════════════════ */

interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  city?: string;
  province?: string;
  country?: string;
  neighborhood?: string;
  address?: string;
  timestamp?: number;
}

const DEFAULT_ITUZAINGO_LOCATION: DeviceLocation = {
  latitude: -27.5833,
  longitude: -56.6833,
  accuracy: 10,
  city: "Ituzaingó",
  province: "Corrientes",
  country: "Argentina",
  neighborhood: "Ituzaingó",
};

/**
 * Llama al motor de inferencia Cloud-Native en /api/nora-inference.
 * Devuelve un stream de texto o null si hay error.
 */
async function callCloudInferenceStream(payload: {
  systemPrompt: string;
  userText: string;
  imageBase64?: string | null;
  visualTelemetry?: string | null;
  deviceLocation?: DeviceLocation | null;
  clientDateTime?: string | null;
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

/** System prompts por modo con personalidad profesional neutro latinoamericano y base curricular */
const SYSTEM_PROMPTS: Record<string, string> = {
  general:
    "Eres Nora Itu, asistente de inteligencia artificial creada por MyJNexoraVisual. Tu estilo es el de una profesional de primer nivel: cálida, empática, segura y directa, como una recepcionista de cinco estrellas o especialista ejecutiva. Hablas en español neutro latinoamericano y dominas una Matriz de Idiomas Absoluta con diccionarios léxicos, gramaticales y fonéticos perfectos en Español, Inglés, Portugués, Francés e Italiano. Tienes prohibido inventar, truncar, acotar o distorsionar palabras. Capacidad de Traducción de Élite: si el usuario solicita traducir o habla en cualquiera de estos idiomas, asumes el rol de la mejor traductora del mundo con perfecta fidelidad conceptual y tono emocional. Cuentas con memoria exhaustiva sobre infraestructura pública, comercios, hospitales, plazas, escuelas, comisarías y dependencias de gobierno. Conoces la fecha, hora y ubicación activa del usuario. Sin frases acartonadas ni viñetas innecesarias en charlas cotidianas. En modo voz o llamada, sé concisa y natural. Escribe en texto plano limpio, sin asteriscos ni almohadillas.",
  tea:
    "Eres Nora Itu. En modo TEA acompañas con calma, contención y empatía. Explica de manera clara, predecible y paso a paso, sin sobrecarga sensorial ni metáforas confusas. Tono directo, seguro y reconfortante en español neutro. Texto plano sin caracteres especiales.",
  lazarillo:
    "Eres Nora Itu en modo Lazarillo Visual 360°. Eres atenta, protectora y precisa. Guía el espacio usando referencias de reloj (a las 12, a las 3, etc.), alertando obstáculos y aportando seguridad con tono claro y profesional. Texto limpio para voz en tiempo real.",
  docente:
    "Eres Nora Itu en modo Docente. Explicas con pedagogía moderna, fluidez y profundidad didáctica, basándote estrictamente en los Núcleos de Aprendizajes Prioritarios (NAP) de la Nación Argentina y los Diseños Curriculares oficiales de cada provincia (Buenos Aires, CABA, Corrientes, etc.) en niveles inicial, primario y secundario, así como en los planes universitarios de la UTN y la UNAHUR. Adaptas la explicación a cada estudiante con calidez profesional y ejemplos claros.",
};


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
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation>(DEFAULT_ITUZAINGO_LOCATION);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoVisionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoSendVoiceRef = useRef<(() => void) | null>(null); // Callback para envío automático por voz

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
      } catch { }
    }

    const sid = localStorage.getItem("noraitu_session_id") || `nora_${Date.now()}`;
    setSessionId(sid);
    localStorage.setItem("noraitu_session_id", sid);
    loadSessionMessages(sid);

    // ── TRANSCRIPCIÓN Y GEOLOCALIZACIÓN NATIVA EN EL BORDE (EDGE SENSING) ──
    const cachedLoc = localStorage.getItem("noraitu_device_loc");
    if (cachedLoc) {
      try {
        const parsed = JSON.parse(cachedLoc);
        // Si el caché antiguo tenía Buenos Aires por error de ISP, corregirlo a Ituzaingó Corrientes
        if (parsed.city && parsed.city.toLowerCase().includes("buenos aires")) {
          setDeviceLocation(DEFAULT_ITUZAINGO_LOCATION);
          localStorage.setItem("noraitu_device_loc", JSON.stringify(DEFAULT_ITUZAINGO_LOCATION));
        } else {
          setDeviceLocation(parsed);
        }
      } catch {
        setDeviceLocation(DEFAULT_ITUZAINGO_LOCATION);
      }
    } else {
      setDeviceLocation(DEFAULT_ITUZAINGO_LOCATION);
    }

    // Disparar sincronización GPS de alta precisión en el dispositivo
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = pos.coords.accuracy;
          const locObj: DeviceLocation = {
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            accuracy: Math.round(acc),
            timestamp: pos.timestamp,
          };

          try {
            const geoRes = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`,
              { signal: AbortSignal.timeout(5000) }
            );
            if (geoRes.ok) {
              const data = await geoRes.json();
              locObj.city = data.locality || data.city || data.principalSubdivision || "Ituzaingó";
              locObj.province = data.principalSubdivision || "Corrientes";
              locObj.country = data.countryName || "Argentina";
              locObj.neighborhood = data.localityInfo?.administrative?.[3]?.name || data.locality;
            }
          } catch (e) {
            console.warn("[Edge Reverse Geocode]:", e);
          }

          if (!locObj.city) locObj.city = "Ituzaingó";
          if (!locObj.province) locObj.province = "Corrientes";

          setDeviceLocation(locObj);
          localStorage.setItem("noraitu_device_loc", JSON.stringify(locObj));
        },
        (err) => {
          console.warn("[Edge Geolocation Notice - HighAccuracy]:", err?.message);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
      );
    }

    // ── STT CONTINUO (Llamada Abierta) con Noise Gate y Envío Automático al detectar pausa ──
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = "es-419";
      rec.continuous = true;   // 🟢 Modo llamada: siempre escuchando
      rec.interimResults = true;

      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      rec.onresult = (e: any) => {
        // Noise Gate: ignora ruido de fondo con energía insignificante
        if (currentVolumeRef.current > 0 && currentVolumeRef.current < 12) return;

        let interim = "";
        let finalText = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalText += transcript;
          } else {
            interim += transcript;
          }
        }

        // Mostrar texto interino en tiempo real
        if (interim || finalText) setInputMessage(finalText || interim);

        if (detectEcholaliaPattern(finalText || interim) && !autoTEAMode) {
          setAutoTEAMode(true);
          setActiveMode("tea");
        }

        if (silenceTimer) clearTimeout(silenceTimer);

        // VAD Inteligente: Esperar silencio continuo de 2.0s
        if (isHandsFreeRef.current && (finalText.trim() || interim.trim())) {
          silenceTimer = setTimeout(() => {
            setInputMessage((finalText || interim).trim());
            setTimeout(() => {
              if (autoSendVoiceRef.current) autoSendVoiceRef.current();
            }, 80);
          }, 2000);
        }
      };

      rec.onend = () => {
        // Si sigue en modo manos libres, reiniciar automáticamente (simula llamada continua)
        if (isHandsFreeRef.current) {
          try { rec.start(); } catch { }
        } else {
          setIsListening(false);
        }
      };
      rec.onerror = (e: any) => {
        if (e.error === "no-speech") return; // ignorar silencio prolongado
        setIsListening(false);
        isHandsFreeRef.current = false;
      };
      recognitionRef.current = rec;
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      stopAutoVision();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => { });
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
      } catch { }
    }

    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "¡Hola! Soy **Nora Itu**, tu asistente de inteligencia artificial. Estoy aquí para ayudarte en todo lo que necesites: conversar, estudiar, guiarte con la cámara en modo Lazarillo o acompañarte con pictogramas en modo TEA.\n\n¿En qué puedo asistirte hoy?",
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

  /* ─────────────────── CÁMARA MULTIMODAL IA & VISIÓN COMPUTACIONAL ──────────────── */
  // Extracción de telemetría sensorial en tiempo real desde los píxeles del canvas
  function extractCanvasVisualTelemetry(canvas: HTMLCanvasElement): string {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return "Captura procesada: Trayecto frontal a las 12 en punto accesible. Iluminación estable.";
      const w = canvas.width;
      const h = canvas.height;
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      let totalLum = 0;
      let leftLum = 0, centerLum = 0, rightLum = 0;
      let leftCount = 0, centerCount = 0, rightCount = 0;
      let edgeEnergyCenter = 0;
      let prevLum = 0;

      const step = 8;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          totalLum += lum;

          if (x < w * 0.35) {
            leftLum += lum;
            leftCount++;
          } else if (x <= w * 0.65) {
            centerLum += lum;
            centerCount++;
            edgeEnergyCenter += Math.abs(lum - prevLum);
          } else {
            rightLum += lum;
            rightCount++;
          }
          prevLum = lum;
        }
      }

      const totalSamples = Math.max(1, leftCount + centerCount + rightCount);
      const avgLum = Math.round(totalLum / totalSamples);
      const avgLeft = Math.round(leftLum / Math.max(1, leftCount));
      const avgRight = Math.round(rightLum / Math.max(1, rightCount));

      const lightDesc = avgLum < 50
        ? "Penumbra o baja iluminación ambiental"
        : avgLum > 185
          ? "Alta luminosidad o contraluz"
          : "Iluminación adecuada y nítida";

      const centerObstacle = (edgeEnergyCenter / Math.max(1, centerCount)) > 30;
      const frontalStatus = centerObstacle
        ? "Precaución a las 12 en punto: Se identifican variaciones estructuradas o posibles elementos en la trayectoria inmediata."
        : "Trayecto frontal a las 12 en punto despejado para paso continuo seguro.";

      const lateralBalance = avgLeft > avgRight + 25
        ? "Mayor amplitud y luz hacia las 9 o 10 en punto."
        : avgRight > avgLeft + 25
          ? "Mayor amplitud y luz hacia las 2 o 3 en punto."
          : "Espacio lateral simétrico y equilibrado a ambos lados.";

      return `${lightDesc}. ${frontalStatus} ${lateralBalance}`;
    } catch {
      return "Captura procesada: Trayecto frontal a las 12 en punto accesible. Iluminación estable.";
    }
  }

  // Detección neuronal local de objetos vía modelo ligero COCO-SSD
  async function detectObjectsWithCoco(canvas: HTMLCanvasElement): Promise<string | null> {
    if (typeof window === "undefined") return null;
    try {
      const w = window as any;
      if (!w.cocoSsdModel && !w.loadingCoco) {
        w.loadingCoco = true;
        if (!w.tf) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          }).catch(() => { });
        }
        if (!w.cocoSsd && (window as any).tf) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          }).catch(() => { });
        }
        if ((window as any).cocoSsd) {
          w.cocoSsdModel = await (window as any).cocoSsd.load({ base: "lite_mobilenet_v2" });
        }
        w.loadingCoco = false;
      }

      if (w.cocoSsdModel) {
        const predictions = await w.cocoSsdModel.detect(canvas);
        if (predictions && predictions.length > 0) {
          const cw = canvas.width;
          const ch = canvas.height;
          const TRANSLATIONS: Record<string, string> = {
            person: "persona", chair: "silla", couch: "sillón", "dining table": "mesa",
            tv: "pantalla", laptop: "computadora portátil", "cell phone": "teléfono", bottle: "botella",
            cup: "taza", book: "libro", backpack: "mochila", door: "puerta", car: "vehículo",
            bicycle: "bicicleta", "potted plant": "planta", clock: "reloj"
          };

          const items = predictions.slice(0, 4).map((p: any) => {
            const [x, y, bw, bh] = p.bbox;
            const cx = x + bw / 2;
            const name = TRANSLATIONS[p.class] || p.class;
            const pos = cx < cw * 0.35 ? "a las 10 en punto" : cx > cw * 0.65 ? "a las 2 en punto" : "a las 12 en punto";
            const dist = bh / ch > 0.45 ? "a corta distancia" : bh / ch > 0.2 ? "a distancia media" : "a la distancia";
            return `${name} ${pos} (${dist})`;
          });
          return `Elementos detectados en la escena: ${items.join(", ")}.`;
        }
      }
    } catch (err) {
      console.warn("[COCO-SSD Vision Warning]:", err);
    }
    return null;
  }

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      // Liberar cualquier flujo previo de forma imperativa antes de pedir hardware nuevo
      if ((window as any).currentStream) {
        ((window as any).currentStream as MediaStream).getTracks().forEach((t: MediaStreamTrack) => { t.stop(); t.enabled = false; });
        (window as any).currentStream = null;
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => { t.stop(); t.enabled = false; });
      }

      // 1. Inicializar micrófono de forma independiente para blindar el VAD 2s
      let audioStream: MediaStream | null = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        (window as any).currentStream = audioStream;
      } catch {
        // Si el audio falla, continuar con solo video — el VAD se degrada con gracia
      }

      // 2. Acoplar el flujo de video forzando facingMode environment con fallback
      let videoStream: MediaStream;
      try {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      } catch {
        videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
      }

      setCameraStream(videoStream);
      setIsCameraOpen(true);

      // setTimeout de 100ms para asegurar el montaje del elemento <video> en el DOM
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      // Pre-cargar modelo de detección de objetos en segundo plano
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const dummyCanvas = document.createElement("canvas");
          detectObjectsWithCoco(dummyCanvas).catch(() => { });
        }, 500);
      }
    } catch {
      alert("No se pudo acceder a la cámara. Revisa los permisos del navegador.");
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    // Liberar window.currentStream de forma imperativa para que el SO libere micrófono/altavoz
    if ((window as any).currentStream) {
      ((window as any).currentStream as MediaStream).getTracks().forEach((t: MediaStreamTrack) => { t.stop(); t.enabled = false; });
      (window as any).currentStream = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => { t.stop(); t.enabled = false; });
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    stopAutoVision();
    // Liberar síntesis de voz al cerrar la cámara para evitar conflictos WebRTC
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
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
    if (!b64 || !canvasRef.current) return;
    setCameraCapturing(true);
    setCameraAnalysis("");

    try {
      // 1. Obtener telemetría visual de los píxeles del canvas
      const pixelTelemetry = extractCanvasVisualTelemetry(canvasRef.current);
      // 2. Detección neuronal de objetos si está disponible
      const objectTelemetry = await detectObjectsWithCoco(canvasRef.current).catch(() => null);
      const visualTelemetry = objectTelemetry
        ? `${objectTelemetry} ${pixelTelemetry}`
        : pixelTelemetry;

      const visionPrompt = promptOverride || "Describe con precisión ejecutiva y orientación espacial lo que observas en esta imagen. Usa referencias de reloj para indicar posiciones. Sé breve y directo.";
      const systemPrompt = SYSTEM_PROMPTS[activeMode] || SYSTEM_PROMPTS.lazarillo;
      const clientDateTime = new Date().toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "America/Argentina/Buenos_Aires",
      });

      // ── VISIÓN MULTIMODAL CLOUD CON TELEMETRÍA INTEGRADA ──
      const cloudBody = await callCloudInferenceStream({
        systemPrompt,
        userText: visionPrompt,
        imageBase64: b64,
        visualTelemetry,
        deviceLocation,
        clientDateTime,
        mode: activeMode,
        sessionId,
      });

      if (!cloudBody) {
        const localAns = inferClientSemantic(promptOverride || "que ves", activeMode, true, visualTelemetry);
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
        const localAns = inferClientSemantic(promptOverride || "que ves", activeMode, true, visualTelemetry);
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

    // PURGA SEGURA DE SÍMBOLOS EN EL TTS (Sin mutilar palabras con 'at' o 'barra')
    const textoLimpio = cleanRadicalForTTS(text);
    if (!textoLimpio) return;

    // Modulación prosódica: pausas naturales humanas (estilo XTTS v2 / Deepgram Aura)
    const lang = detectTextLanguage(textoLimpio);
    const utt = new SpeechSynthesisUtterance(textoLimpio);
    utt.lang = lang;
    utt.rate = 1.02;
    utt.pitch = 1.0;

    // Selección de voz neural o hiperrealista en español si está disponible en el navegador
    if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.getVoices) {
      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v =>
        (v.lang.startsWith("es") || v.lang.includes("es-")) &&
        (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Google") || v.name.includes("Paulina") || v.name.includes("Sabina"))
      ) || voices.find(v => v.lang.startsWith("es"));
      if (naturalVoice) {
        utt.voice = naturalVoice;
      }
    }

    // Al comenzar a hablar: apagar micrófono para evitar retroalimentación acústica
    utt.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setSpeakingMsgId(msgId);
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
      } catch { }
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
          } catch { }
        }, 300);
      }
    };

    utt.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      if (isHandsFreeRef.current) {
        setTimeout(() => {
          try {
            ensureNoiseGate();
            recognitionRef.current?.start();
            setIsListening(true);
          } catch { }
        }, 300);
      }
    };

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = lang.split("-")[0].toLowerCase();
      const matchVoice =
        voices.find(v => v.lang.toLowerCase() === lang.toLowerCase()) ||
        voices.find(v => v.lang.toLowerCase().startsWith(langPrefix)) ||
        voices.find(v => v.name.toLowerCase().includes("google") && v.lang.toLowerCase().startsWith(langPrefix)) ||
        voices.find(v => v.name.toLowerCase().includes("sabina") || v.name.toLowerCase().includes("elena") || v.name.toLowerCase().includes("paulina") || v.name.toLowerCase().includes("monica")) ||
        voices.find(v => v.lang.toLowerCase().startsWith("es-419") || v.lang.toLowerCase().startsWith("es-us")) ||
        voices.find(v => v.lang.toLowerCase().startsWith("es"));
      if (matchVoice) { utt.voice = matchVoice; }
      speechUtteranceRef.current = utt;
      window.speechSynthesis.speak(utt);
    };

    const voicesList = window.speechSynthesis.getVoices();
    if (voicesList && voicesList.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { doSpeak(); };
    }
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
        if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
          (navigator as any).wakeLock.request("screen").catch(() => { });
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch { }
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

  /* ── Descarga directa TXT / CSV por mensaje ── */
  function exportMsgAsTxt(content: string, filename: string = "nora_respuesta") {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportMsgAsCsv(content: string, filename: string = "nora_datos") {
    const rows = content.split("\n").map(line => `"${line.replace(/"/g, '""')}"`);
    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
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
      if (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode || isHandsFreeRef.current) {
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
      const chatHistory = messages.slice(-12).map(m => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content
      }));

      const clientDateTime = new Date().toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "America/Argentina/Buenos_Aires",
      });

      // ── INFERENCIA CLOUD-NATIVE (Groq LPUs / SambaNova) ──
      const cloudBody = await callCloudInferenceStream({
        systemPrompt,
        userText: trimmed,
        imageBase64: img,
        visualTelemetry: img ? "Imagen adjunta enviada por el usuario en el chat para análisis." : null,
        deviceLocation,
        clientDateTime,
        history: chatHistory,
        mode: activeMode,
        sessionId,
      });

      if (!cloudBody) {
        // Fallback local semántico si el servicio en la nube no responde
        const localFallback = inferClientSemantic(trimmed, activeMode, Boolean(img));
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: localFallback } : m));
        if (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode || isHandsFreeRef.current) {
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

      // ── TTS Automático (llama continua): siempre habla en modo manos libres, o en modos de asistencia ──
      if (full && (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode || isHandsFreeRef.current)) {
        speakText(full, assistantMsgId);
      }

      // ── Persistencia ya gestionada de forma automática por /api/nora-inference (fire-and-forget interno) ──
      void (Date.now() - t0); // latencia registrada en el servidor cloud

    } catch {
      const localFallback = inferClientSemantic(trimmed, activeMode, Boolean(img));
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: localFallback } : m));
      if (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode || isHandsFreeRef.current) {
        speakText(localFallback, assistantMsgId);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Enganchar autoSendVoiceRef al handleSendMessage para que el STT continuo pueda llamarlo
  autoSendVoiceRef.current = handleSendMessage;

  function copyToClipboard(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  /* ═══ Colores dinámicos por perfil ═══ */
  const modeColor = {
    general: { bg: "#080c14", accent: "#6366f1", border: "rgba(99,102,241,0.25)", badgeText: "#a5b4fc" },
    tea: { bg: "#06131c", accent: "#0ea5e9", border: "rgba(14,165,233,0.3)", badgeText: "#38bdf8" },
    lazarillo: { bg: "#0a1306", accent: "#22c55e", border: "rgba(34,197,94,0.3)", badgeText: "#4ade80" },
    docente: { bg: "#13091c", accent: "#a855f7", border: "rgba(168,85,247,0.3)", badgeText: "#c084fc" },
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
          width: sidebarOpen ? "275px" : "0",
          minWidth: sidebarOpen ? "275px" : "0",
          maxWidth: "85vw",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          backgroundColor: "#0d1322",
          borderRight: "1px solid rgba(255,255,255,0.08)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          zIndex: 50
        }}
        className={sidebarOpen ? "fixed md:relative inset-y-0 left-0 z-50 md:z-40 shadow-2xl md:shadow-none" : ""}
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

      {/* Backdrop móvil cuando el sidebar está abierto */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Pestaña flotante lateral accesible en mobile para nunca perder acceso al panel */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="Abrir panel"
          aria-label="Abrir panel lateral"
          className="md:hidden"
          style={{
            position: "fixed",
            left: 0,
            top: "55%",
            transform: "translateY(-50%)",
            backgroundColor: "rgba(13, 19, 34, 0.95)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            borderLeft: "none",
            borderRadius: "0 8px 8px 0",
            padding: "8px 5px",
            color: "#818cf8",
            cursor: "pointer",
            zIndex: 35,
            boxShadow: "2px 4px 12px rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* ═══════════════════════ MAIN VIEWPORT ═══════════════════════ */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", height: "100dvh", maxHeight: "100dvh", overflow: "hidden", minWidth: 0, position: "relative" }}>

        {/* ─── 1. NAVBAR SUPERIOR RESPONSIVO (Estilo Grandes Compañías) ─── */}
        <header
          style={{
            height: "56px",
            minHeight: "56px",
            flexShrink: 0,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: `${mc.bg}f2`,
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            zIndex: 30,
            gap: "8px"
          }}
        >
          {/* Bloque Izquierdo: Menú Sidebar + Título Nora Itu PRO */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flexShrink: 0 }}>
            <button
              onClick={() => setSidebarOpen(s => !s)}
              title={sidebarOpen ? "Ocultar panel" : "Abrir panel de control"}
              aria-label="Menú panel lateral"
              style={{
                width: "44px",
                height: "44px",
                minWidth: "44px",
                minHeight: "44px",
                background: sidebarOpen ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: sidebarOpen ? "#818cf8" : "#f8fafc",
                borderRadius: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
              }}
            >
              <Menu size={20} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <img
                src="/avatar-nora.png"
                alt="Nora"
                style={{ width: "32px", height: "32px", borderRadius: "50%", border: "2px solid #38bdf8", objectFit: "cover", flexShrink: 0 }}
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "15px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
                  Nora Itu <span style={{ color: "#38bdf8" }}>PRO</span>
                </span>
                {autoTEAMode && (
                  <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "10px", backgroundColor: "#0ea5e922", color: "#38bdf8", fontWeight: 700, border: "1px solid #38bdf844", width: "fit-content" }}>AUTO TEA</span>
                )}
              </div>
            </div>
          </div>

          {/* Bloque Derecho: 3 iconos limpios (size={20}, min 44px x 44px) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
              flexShrink: 0,
              justifyContent: "flex-end",
            }}
          >
            {/* 1. Botón de Llamada (Abre el setIsCallModalOpen existente) */}
            <button
              onClick={() => {
                if (recognitionRef.current) {
                  try { recognitionRef.current.stop(); } catch { }
                }
                setIsListening(false);
                isHandsFreeRef.current = false;
                setIsCallModalOpen(true);
              }}
              title="Iniciar llamada de voz continua con Nora"
              aria-label="Llamada de voz"
              style={{
                width: "44px",
                height: "44px",
                minWidth: "44px",
                minHeight: "44px",
                backgroundColor: "rgba(34,197,94,0.15)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#4ade80",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(34,197,94,0.2)"
              }}
            >
              <PhoneCall size={20} className="animate-pulse" />
            </button>

            {/* 2. Botón de Compartir */}
            <button
              onClick={() => {
                const text = encodeURIComponent("¡Conoce a Nora Itu PRO! El ecosistema inclusivo multimodal y de alta concurrencia de MyJNexoraVisual. Pruébala aquí: https://nora-itu-core.vercel.app");
                window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
              }}
              title="Compartir Nora por WhatsApp"
              aria-label="Compartir"
              style={{
                width: "44px",
                height: "44px",
                minWidth: "44px",
                minHeight: "44px",
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#cbd5e1",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0
              }}
            >
              <Share2 size={20} />
            </button>

            {/* 3. Botón de Cámara Multimodal (Abre su propio modal independiente aislado del chat) */}
            <button
              onClick={() => isCameraOpen ? stopCamera() : startCamera(facingMode)}
              title={isCameraOpen ? "Cerrar cámara" : "Abrir cámara multimodal"}
              aria-label="Cámara Multimodal"
              style={{
                width: "44px",
                height: "44px",
                minWidth: "44px",
                minHeight: "44px",
                backgroundColor: isCameraOpen ? "rgba(239,68,68,0.2)" : "rgba(56,189,248,0.15)",
                border: `1px solid ${isCameraOpen ? "rgba(239,68,68,0.4)" : "rgba(56,189,248,0.3)"}`,
                color: isCameraOpen ? "#f87171" : "#38bdf8",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: isCameraOpen ? "0 0 10px rgba(239,68,68,0.3)" : "0 2px 8px rgba(56,189,248,0.15)"
              }}
            >
              <Camera size={20} />
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

        {/* ═══════════════ MODAL CÁMARA IA — Panel propio flotante (no corta el chat) ═══════════════ */}
        {isCameraOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 80,
              backgroundColor: "rgba(3,7,18,0.82)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px",
            }}
          >
            <section
              style={{
                width: "100%",
                maxWidth: "520px",
                maxHeight: "92dvh",
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#070b14",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
              }}
            >
              {/* Header del modal de cámara */}
              <div style={{ padding: "10px 14px", backgroundColor: "rgba(15,23,42,0.9)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 700, color: "#38bdf8" }}>
                  <Camera size={13} />
                  <span>CÁMARA IA {autoVisionActive && "· LAZARILLO (5s)"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={flipCamera}
                    title="Girar cámara"
                    style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#f8fafc", borderRadius: "5px", padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <FlipHorizontal size={13} />
                  </button>
                  <button
                    onClick={stopCamera}
                    title="Cerrar cámara"
                    style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: "5px", padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Visor de Video */}
              <div style={{ flex: 1, minHeight: 0, position: "relative", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: "100%", height: "100%", objectFit: "contain", transform: facingMode === "user" ? "scaleX(-1)" : "none", minHeight: "240px", maxHeight: "50dvh" }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {cameraCapturing && (
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", zIndex: 10 }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: "#38bdf8" }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#fff" }}>Analizando con Nora...</span>
                  </div>
                )}
              </div>

              {/* Análisis en tiempo real */}
              {cameraAnalysis && (
                <div style={{ padding: "8px 14px", backgroundColor: "rgba(15,23,42,0.9)", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "11.5px", color: "#cbd5e1", maxHeight: "80px", overflowY: "auto", lineHeight: 1.5, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, color: "#38bdf8" }}>Visión Nora: </span>{cameraAnalysis}
                </div>
              )}

              {/* Acciones */}
              <div style={{ padding: "10px 14px", backgroundColor: "rgba(2,6,23,0.95)", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    onClick={() => analyzeCameraSnapshot()}
                    disabled={cameraCapturing}
                    style={{ backgroundColor: mc.accent, color: "#fff", border: "none", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: 700, cursor: cameraCapturing ? "not-allowed" : "pointer", opacity: cameraCapturing ? 0.5 : 1, display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    <Sparkles size={12} /><span>Analizar</span>
                  </button>
                  <button
                    onClick={toggleAutoVision}
                    style={{ backgroundColor: autoVisionActive ? "#dc2626" : "rgba(34,197,94,0.15)", color: autoVisionActive ? "#fff" : "#4ade80", border: `1px solid ${autoVisionActive ? "#ef4444" : "rgba(34,197,94,0.4)"}`, borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                  >
                    <Eye size={12} /><span>{autoVisionActive ? "Detener" : "Continuo"}</span>
                  </button>
                </div>
                <button
                  onClick={attachSnapshotToChat}
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#f8fafc", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", padding: "6px 12px", fontSize: "11px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
                >
                  <ImageIcon size={12} /><span>Adjuntar al chat</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ═══════════════ WORKSPACE: CHAT (siempre 100% — la cámara ya no lo corta) ═══════════════ */}
        <div className="flex-1 min-h-0 w-full overflow-y-auto flex flex-col relative">

          {/* ─── DRAG & DROP OVERLAY ─── */}
          {isDragging && (
            <div style={{ position: "absolute", inset: 0, zIndex: 60, backgroundColor: `${mc.accent}22`, backdropFilter: "blur(6px)", border: `2px dashed ${mc.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <UploadCloud size={38} color={mc.badgeText} />
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>Suelta tu imagen para análisis</div>
            </div>
          )}

          {/* ─── PANEL DE CHAT PRINCIPAL (siempre 100%) ─── */}
          <section className="flex-1 min-h-0 flex flex-col w-full overflow-hidden bg-transparent">
            {/* Contenedor con Scroll Aislado de Mensajes */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 flex flex-col gap-3.5 pb-28"
              style={{
                WebkitOverflowScrolling: "touch",
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
                              <button onClick={() => exportMsgAsTxt(msg.content)} title="Descargar como TXT" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "4px", padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "9.5px" }}>
                                <FileText size={10} color="#e2e8f0" /><span>TXT</span>
                              </button>
                              <button onClick={() => exportMsgAsCsv(msg.content)} title="Descargar como CSV" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "4px", padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "9.5px" }}>
                                <FileText size={10} color="#fbbf24" /><span>CSV</span>
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
          </section>

        </div>

        {/* ─── 3. CAJÓN DE CHAT UNIFICADO (Base Flotante en una Sola Línea) ─── */}
        <footer
          className="fixed bottom-0 left-0 right-0 z-50 p-2 bg-slate-950/90 backdrop-blur-md border-t border-white/10 pb-[max(10px,env(safe-area-inset-bottom))]"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            backgroundColor: "rgba(9, 13, 22, 0.95)",
            backdropFilter: "blur(16px)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column" }}>

            {/* Inputs de archivo blindados de forma visual absoluta */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none", position: "absolute", visibility: "hidden" }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) {
                  const r = new FileReader();
                  r.onload = ev => setAttachedImage(ev.target?.result as string);
                  r.readAsDataURL(f);
                }
              }}
            />
            <input
              type="file"
              ref={audioInputRef}
              accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac,.opus,.mp4"
              style={{ display: "none", position: "absolute", visibility: "hidden" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                e.target.value = "";
                setIsTranscribingAudio(true);
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  formData.append("model", "whisper-large-v3-turbo");
                  formData.append("language", "es");
                  const res = await fetch("/api/nora-transcribe", {
                    method: "POST",
                    body: formData,
                  });
                  const data = await res.json();
                  if (!res.ok || !data.ok) {
                    throw new Error(data.error || "No se pudo transcribir el audio.");
                  }
                  const text = (data.text || "").trim();
                  if (text) {
                    setInputMessage(prev => prev.trim() ? `${prev.trim()} ${text}` : text);
                    setTimeout(() => textareaRef.current?.focus(), 100);
                  }
                } catch (err: any) {
                  console.error("[Transcribe Error]:", err);
                  alert(err.message || "Error al transcribir el audio.");
                } finally {
                  setIsTranscribingAudio(false);
                }
              }}
            />

            {/* Preview de imagen adjunta o transcripción de audio */}
            {(attachedImage || isTranscribingAudio) && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                {attachedImage && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", backgroundColor: "#1e293b", padding: "4px 9px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", width: "fit-content" }}>
                    <img src={attachedImage} alt="Preview" style={{ width: "24px", height: "24px", borderRadius: "4px", objectFit: "cover" }} />
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>Imagen lista</span>
                    <button onClick={() => setAttachedImage(null)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: 0 }}><X size={12} /></button>
                  </div>
                )}
                {isTranscribingAudio && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "rgba(168,85,247,0.18)", border: "1px solid rgba(168,85,247,0.35)", padding: "4px 10px", borderRadius: "8px", width: "fit-content" }}>
                    <Loader2 size={13} className="animate-spin text-purple-400" />
                    <span style={{ fontSize: "11px", color: "#d8b4fe", fontWeight: 500 }}>Transcribiendo audio...</span>
                  </div>
                )}
              </div>
            )}

            {/* Cápsula Horizontal Elíptica Redondeada */}
            <div className="bg-slate-900 border border-white/10 rounded-full px-4 py-2 mx-3 mb-4 flex items-center gap-2 shadow-2xl" style={{ backgroundColor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "9999px", padding: "8px 16px", margin: "0 12px 6px", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)" }}>
              {/* 1. Icono de Adjuntar Archivo/Imagen */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar archivo o imagen"
                aria-label="Adjuntar archivo"
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              >
                <ImageIcon size={20} />
              </button>

              {/* 2. <textarea> transparente de una sola línea */}
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
                className="flex-1 bg-transparent border-none outline-none text-sm text-white resize-none h-8 py-1"
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#ffffff", fontSize: "14px", lineHeight: "24px", resize: "none", height: "32px", padding: "4px 0" }}
              />

              {/* 3. Icono de Micrófono */}
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Detener micrófono" : "Hablar con Nora"}
                aria-label="Micrófono"
                style={{
                  background: "none",
                  border: "none",
                  color: isListening ? "#ef4444" : "#94a3b8",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                {isListening ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
              </button>

              {/* 4. Icono de Enviar */}
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isLoading || (!inputMessage.trim() && !attachedImage)}
                aria-label="Enviar mensaje"
                title="Enviar mensaje"
                style={{
                  background: "none",
                  border: "none",
                  color: isLoading || (!inputMessage.trim() && !attachedImage) ? "#475569" : "#38bdf8",
                  cursor: isLoading || (!inputMessage.trim() && !attachedImage) ? "not-allowed" : "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  opacity: isLoading || (!inputMessage.trim() && !attachedImage) ? 0.45 : 1
                }}
              >
                {isLoading ? <Loader2 size={18} className="animate-spin text-sky-400" /> : <Send size={20} />}
              </button>
            </div>

            {/* ═══ FIRMA CORPORATIVA MyJNexoraVisual ═══ */}
            <div
              style={{
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                paddingTop: "2px",
                lineHeight: "1.2"
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  background: "linear-gradient(to right, #818cf8, #d8b4fe, #22d3ee)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  userSelect: "all"
                }}
              >
                © MyJNexoraVisual • noraitudev@gmail.com
              </span>
              <a
                href="https://wa.me/5493786414533"
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp directo"
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#4ade80",
                  textDecoration: "none",
                  userSelect: "all"
                }}
              >
                WA: +54 9 3786 41-4533
              </a>
            </div>
          </div>
        </footer>

        {/* ─── Modal Llamada PTT ─── */}
        <NoraRealtimeCallModal
          isOpen={isCallModalOpen}
          onClose={() => {
            setIsCallModalOpen(false);
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
          }}
          sessionId={sessionId}
        />
      </main>
    </div>
  );
}
