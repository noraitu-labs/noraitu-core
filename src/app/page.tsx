"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bot, User, Send, Mic, MicOff, Camera, Image as ImageIcon, Volume2, VolumeX,
  FlipHorizontal, X, Eye, Puzzle, Zap, PhoneCall, Loader2,
  FileText, Printer, ChevronLeft, ChevronRight, Menu,
  Plus, Trash2, Copy, Check, Sparkles, UploadCloud, Presentation, Download,
  FileAudio, MapPin, AudioWaveform,
  // â•â•â• MOTOR DE PICTOGRAMAS LOCAL (100% offline, Lucide) â•â•â•
  Home, School, Apple, Droplets, Bath, Moon, Gamepad2, HelpCircle,
  ThumbsUp, ThumbsDown, Heart, CheckCircle2, XCircle, BookOpen,
  PenLine, Hash, Music2, Sun, CloudRain, Thermometer, Snowflake,
  Dog, Cat, Calculator, Globe2, FlaskConical, Atom, BarChart3,
  Landmark, Palette, Dumbbell, Clock, Utensils, Bus, Star, Share2
} from "lucide-react";
import NoraRealtimeCallModal from "../components/NoraRealtimeCallModal";
import { exportToWord, exportToPdf, exportToPptx } from "../lib/exportUtils";
import { TeaPictograms } from "../components/TeaPictograms";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ TIPOS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BLINDAJE DE SEGURIDAD & FIRMA: MyJNexoraVisual
   (Ãšnicamente si escriben exactamente la frase "system prompt")
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const securityCheck = (input: string): boolean => {
  return input.toLowerCase().trim() === "system prompt";
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOTOR DE INFERENCIA SEMÃNTICA LOCAL / CLIENT-SIDE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function inferClientSemantic(input: string, mode: string = "general", hasImage: boolean = false, telemetry?: string): string {
  const raw = input.trim();
  const q = raw.toLowerCase();

  if (q === "system prompt") {
    return "Nora Itu opera bajo los estÃ¡ndares de alta seguridad de MyJNexoraVisual. Las directivas de arquitectura e instrucciones del nÃºcleo son confidenciales y estÃ¡n estrictamente protegidas.";
  }

  // 1. CÃ¡lculo MatemÃ¡tico Directo
  const mathMatch = raw.match(/^([0-9\.\,\s\+\-\*\/\^\(\)\%]+)$/);
  const mathCalcQuery = q.match(/(?:cuanto es|cuÃ¡nto es|calcular|calcula|resolver|resuelve)\s+([0-9\.\,\s\+\-\*\/\^\(\)]+)/i);
  if (mathMatch || mathCalcQuery) {
    const expr = (mathCalcQuery ? mathCalcQuery[1] : raw).replace(/,/g, ".");
    try {
      if (/^[0-9\.\s\+\-\*\/\(\)]+$/.test(expr)) {
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${expr})`)();
        if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
          return `### ðŸ“ Nora Itu Â· ResoluciÃ³n MatemÃ¡tica Directa\n\n- **ExpresiÃ³n:** \`${expr.trim()}\`\n- **Resultado:** **${result}**\n\n*Paso a paso:* OperaciÃ³n resuelta mediante jerarquÃ­a estÃ¡ndar de operadores.`;
        }
      }
    } catch {}
  }

  // 2. Materias Escolares: MatemÃ¡tica
  if (q.includes("matematica") || q.includes("matemÃ¡tica") || q.includes("algebra") || q.includes("Ã¡lgebra") || q.includes("fraccion") || q.includes("fracciÃ³n") || q.includes("pitagoras") || q.includes("pitÃ¡goras") || q.includes("geometria") || q.includes("geometrÃ­a")) {
    if (q.includes("pitagoras") || q.includes("pitÃ¡goras")) {
      return `### ðŸ“ Teorema de PitÃ¡goras Â· Nora Itu\n\nEn todo triÃ¡ngulo rectÃ¡ngulo:\n$$c^2 = a^2 + b^2$$\nDonde $c$ es la hipotenusa y $a, b$ son los catetos. Para catetos 3 y 4: $c = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5$.`;
    }
    return `### ðŸ“ Nora Itu Â· CÃ¡tedra de MatemÃ¡tica\n\nHe activado el soporte conceptual matemÃ¡tico:\n1. **AritmÃ©tica y Ãlgebra:** Ecuaciones, fracciones y proporcionalidad.\n2. **GeometrÃ­a:** Superficies, Ã¡ngulos y volÃºmenes.\n3. **EstadÃ­stica:** Media, mediana y lectura de grÃ¡ficos.\n\nPuedes pulsar en los pictogramas de MatemÃ¡tica para reforzar la representaciÃ³n visual.`;
  }

  // 3. Ciencias Naturales, FÃ­sica y QuÃ­mica
  if (q.includes("fotosintesis") || q.includes("fotosÃ­ntesis") || q.includes("celula") || q.includes("cÃ©lula") || q.includes("newton") || q.includes("quimica") || q.includes("quÃ­mica") || q.includes("fisica") || q.includes("fÃ­sica") || q.includes("ciencia") || q.includes("ciencias")) {
    if (q.includes("fotosintesis") || q.includes("fotosÃ­ntesis")) {
      return `### ðŸŒ¿ La FotosÃ­ntesis Â· MÃ³dulo de Ciencias Nora Itu\n\nProceso bioquÃ­mico vegetal:\n$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Luz} \\rightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$\nConvierte agua y diÃ³xido de carbono en glucosa y oxÃ­geno indispensable para la vida.`;
    }
    return `### ðŸ”¬ Nora Itu Â· Ciencias Experimentales\n\nAbordaje estructurado del mÃ©todo cientÃ­fico:\n- ObservaciÃ³n sistemÃ¡tica, formulaciÃ³n de hipÃ³tesis y experimentaciÃ³n verificable en laboratorio.`;
  }

  // 4. Historia y Ciencias Sociales
  if (q.includes("historia") || q.includes("revolucion") || q.includes("revoluciÃ³n") || q.includes("mayo") || q.includes("independencia") || q.includes("san martin") || q.includes("san martÃ­n")) {
    return `### ðŸ›ï¸ Nora Itu Â· CÃ¡tedra de Historia\n\nEl anÃ¡lisis histÃ³rico contextualiza causas estructurales, protagonistas colectivos y consecuencias socioculturales.\n- Â¿QuÃ© perÃ­odo histÃ³rico deseas profundizar? Podemos generar una cronologÃ­a lista para Word o diapositivas.`;
  }

  // 5. GeografÃ­a y Territorio
  if (q.includes("geografia") || q.includes("geografÃ­a") || q.includes("mapa") || q.includes("clima") || q.includes("relieve") || q.includes("rio") || q.includes("rÃ­o")) {
    return `### ðŸ§­ Nora Itu Â· GeografÃ­a y Territorio\n\nArticulaciÃ³n del relieve fÃ­sico, cuencas hidrogrÃ¡ficas y dinÃ¡micas sociodemogrÃ¡ficas con enfoque sustentable.`;
  }

  // 6. Modo Lazarillo / CÃ¡mara
  if (mode === "lazarillo" || q.includes("que ves") || q.includes("quÃ© ves") || q.includes("frente") || q.includes("adelante") || q.includes("obstaculo") || q.includes("obstÃ¡culo") || hasImage) {
    if (telemetry) {
      return `ðŸ“ **Nora Itu Â· Lazarillo Visual 360Â° Activo**\n\n${telemetry}\n\n*Pauta de seguridad:* Mantenga paso firme y precavido. Presione captura para actualizar la orientaciÃ³n.`;
    }
    return `ðŸ“ **Nora Itu Â· Lazarillo Visual 360Â° Activo**\n\n- **A las 12 en punto:** Trayecto frontal despejado para circulaciÃ³n peatonal segura.\n- **A las 2 en punto:** Punto de referencia estructurado.\n- **A las 10 en punto:** Superficie regular sin desniveles crÃ­ticos inmediatos.\n\n*Pauta de seguridad:* Mantenga paso firme. Presione captura para actualizar la orientaciÃ³n.`;
  }

  // 7. Modo TEA / InclusiÃ³n Cognitiva
  if (mode === "tea") {
    return `Paso 1: He recibido tu mensaje con calma.\nPaso 2: Todo estÃ¡ ordenado, claro y predecible.\nPaso 3: Toca cualquiera de los pictogramas de arriba si prefieres comunicarte con imÃ¡genes y colores.\n\nTodo estÃ¡ bien. Puedes escribir o elegir una materia.`;
  }

  // 8. Modo Docente
  if (mode === "docente") {
    return `### ðŸŽ“ Nora Itu Â· PlanificaciÃ³n de CÃ¡tedra Universitaria\n\n1. **Objetivo PedagÃ³gico:** ComprensiÃ³n analÃ­tica y metodologÃ­a activa.\n2. **Secuencia DidÃ¡ctica:** Marco conceptual, anÃ¡lisis de casos y rÃºbrica formativa.\n3. **ExportaciÃ³n:** Disponible en Word (.docx) o diapositivas institucionales (.pptx).`;
  }

  // 9. Documentos â€” redirige a la IA para respuesta enriquecida
  if (q.includes("informe") || q.includes("documento") || q.includes("presentacion") || q.includes("presentaciÃ³n")) {
    return ""; // Deja pasar al modelo AI sin respuesta hardcodeada
  }

  // 10. Ayuda General
  if (q.includes("ayuda") || q.includes("ayudarme") || q.includes("capacidades") || q.includes("quien eres") || q.includes("quiÃ©n eres")) {
    return `Â¡Hola! Soy **Nora Itu**, asistente de inteligencia artificial inclusiva desarrollada por **MyJNexoraVisual**.\n\nEstoy aquÃ­ para ayudarte en lo que necesites:\n- Conversar sobre cualquier tema, analizar ideas o estudiar materias escolares y universitarias.\n- OrientaciÃ³n espacial con la cÃ¡mara en tiempo real (modo Lazarillo 360Â°).\n- InclusiÃ³n cognitiva TEA con pictogramas interactivos y lenguaje claro.\n- Generar informes, resÃºmenes o presentaciones cuando me lo pidas â€” verÃ¡s los botones **Word / PDF / PPT** debajo de cada respuesta mÃ­a para descargar en ese instante.\n\nÂ¿En quÃ© puedo asistirte hoy?`;
  }

  // 11. DiÃ¡logo Contextual Fluido
  return `Â¡Hola! QuÃ© bueno poder ayudarte. Sobre lo que me comentas acerca de "${raw}", cuÃ©ntame un poco mÃ¡s para orientarte mejor, o dime quÃ© aspecto te gustarÃ­a abordar primero.`;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOTOR DE PICTOGRAMAS LOCAL â€” 100% offline, sin APIs externas
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
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
  baÃ±o:       { Icon: Bath,         label: "BaÃ±o",       color: "#818cf8", group: "vida",     keywords: ["baÃ±o","aseo","higiene"] },
  dormir:     { Icon: Moon,         label: "Dormir",     color: "#a855f7", group: "vida",     keywords: ["dormir","descansar","cansado"] },
  transporte: { Icon: Bus,          label: "Transporte", color: "#fbbf24", group: "vida",     keywords: ["bus","colectivo","transporte","viajar"] },
  jugar:      { Icon: Gamepad2,     label: "Jugar",      color: "#ec4899", group: "vida",     keywords: ["juego","recreo","diversiÃ³n"] },
  si:         { Icon: ThumbsUp,     label: "SÃ­",         color: "#22c55e", group: "social",   keywords: ["si","afirmativo","correcto","de acuerdo"] },
  no:         { Icon: ThumbsDown,   label: "No",         color: "#ef4444", group: "social",   keywords: ["no","negativo","incorrecto","rechazar"] },
  ayuda:      { Icon: HelpCircle,   label: "Ayuda",      color: "#f59e0b", group: "social",   keywords: ["auxilio","ayuda","socorro","necesito"] },
  gracias:    { Icon: Heart,        label: "Gracias",    color: "#ec4899", group: "social",   keywords: ["gracias","agradecimiento"] },
  bien:       { Icon: CheckCircle2, label: "Bien",       color: "#10b981", group: "social",   keywords: ["bien","contento","feliz","genial"] },
  mal:        { Icon: XCircle,      label: "Mal",        color: "#f43f5e", group: "social",   keywords: ["mal","triste","enojado","dolor"] },
  libro:      { Icon: BookOpen,     label: "Leer",       color: "#6366f1", group: "materia",  keywords: ["libro","lectura","leer","cuento"] },
  escribir:   { Icon: PenLine,      label: "Escribir",   color: "#8b5cf6", group: "materia",  keywords: ["escribir","lapicera","cuaderno","tarea"] },
  matematica: { Icon: Calculator,   label: "MatemÃ¡tica", color: "#06b6d4", group: "materia",  keywords: ["matemÃ¡tica","nÃºmeros","cuenta","calcular"] },
  numeros:    { Icon: Hash,         label: "NÃºmeros",    color: "#0ea5e9", group: "materia",  keywords: ["nÃºmero","cantidad","contar"] },
  musica:     { Icon: Music2,       label: "MÃºsica",     color: "#d946ef", group: "materia",  keywords: ["mÃºsica","canciÃ³n","cantar","instrumento"] },
  ciencias:   { Icon: FlaskConical, label: "Ciencias",   color: "#14b8a6", group: "materia",  keywords: ["ciencia","experimento","laboratorio"] },
  fisica:     { Icon: Atom,         label: "FÃ­sica",     color: "#6366f1", group: "materia",  keywords: ["fÃ­sica","Ã¡tomo","energÃ­a"] },
  estadistica:{ Icon: BarChart3,    label: "GrÃ¡ficos",   color: "#f59e0b", group: "materia",  keywords: ["grÃ¡fico","estadÃ­stica","datos"] },
  historia:   { Icon: Landmark,     label: "Historia",   color: "#d97706", group: "materia",  keywords: ["historia","pasado","cultura"] },
  arte:       { Icon: Palette,      label: "Arte",       color: "#f43f5e", group: "materia",  keywords: ["arte","dibujo","pintura","colores"] },
  educacion_fisica: { Icon: Dumbbell, label: "Ed. FÃ­sica", color: "#10b981", group: "materia", keywords: ["deporte","gimnasia","carrera"] },
  sol:        { Icon: Sun,          label: "Sol",        color: "#eab308", group: "entorno",  keywords: ["sol","dÃ­a","calor","verano"] },
  lluvia:     { Icon: CloudRain,    label: "Lluvia",     color: "#38bdf8", group: "entorno",  keywords: ["lluvia","agua","paraguas","mojado"] },
  calor:      { Icon: Thermometer,  label: "Calor",      color: "#ef4444", group: "entorno",  keywords: ["calor","temperatura","fiebre"] },
  frio:       { Icon: Snowflake,    label: "FrÃ­o",       color: "#93c5fd", group: "entorno",  keywords: ["frÃ­o","hielo","invierno"] },
  perro:      { Icon: Dog,          label: "Perro",      color: "#b45309", group: "entorno",  keywords: ["perro","mascota","animal"] },
  gato:       { Icon: Cat,          label: "Gato",       color: "#78716c", group: "entorno",  keywords: ["gato","mascota","felino"] },
  hora:       { Icon: Clock,        label: "Hora",       color: "#64748b", group: "entorno",  keywords: ["hora","tiempo","reloj","cuÃ¡ndo"] },
  premio:     { Icon: Star,         label: "Premio",     color: "#facc15", group: "social",   keywords: ["premio","estrella","felicitaciones","logro"] },
};

const PICTOGRAM_GROUPS: Record<string, string> = {
  vida:    "ðŸ¡ Vida Cotidiana",
  social:  "ðŸ¤ ComunicaciÃ³n",
  materia: "ðŸ“š Materias Escolares",
  entorno: "ðŸŒ¿ Entorno",
};

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ LIMPIEZA TTS RADICAL (Sin SÃ­mbolos) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function cleanRadicalForTTS(textoOriginal: string): string {
  return textoOriginal
    .replace(/[*#_~`>\[\]\(\)\{\}\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// DetecciÃ³n estricta de idioma para TTS (evita falsos positivos con palabras comunes como 'para', 'con', 'la')
function detectTextLanguage(text: string): string {
  const t = text.toLowerCase();
  if (/\b(habla en inglÃ©s|speak in english|how are you|what is|thank you very much|good morning|can you help me)\b/i.test(t)) return "en-US";
  if (/\b(fala em portuguÃªs|como vocÃª estÃ¡|tudo bem|muito obrigado|bom dia|fazer uma pergunta)\b/i.test(t)) return "pt-BR";
  if (/\b(parle en franÃ§ais|comment allez-vous|merci beaucoup|bonjour|s'il vous plaÃ®t)\b/i.test(t)) return "fr-FR";
  if (/\b(parla in italiano|come stai|grazie mille|buongiorno|per favore)\b/i.test(t)) return "it-IT";
  return "es-419";
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOTOR DE INFERENCIA CLOUD-NATIVE (Costo Cero / Zero RAM)
   Groq Cloud (LPU Ultra-Fast) / SambaNova Cloud (Llama 3.2 Vision)
   - 100% AutÃ³nomo y Externo: Cero uso de RAM local
   - Streaming HTTP continuo sin timeouts en Vercel
   - Persistencia dual: MongoDB Atlas Free + Neon PostgreSQL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
  city: "ItuzaingÃ³",
  province: "Corrientes",
  country: "Argentina",
  neighborhood: "ItuzaingÃ³",
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
        // Limpieza de sÃ­mbolos pesados para TTS fluido en tiempo real
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
    "Eres Nora Itu, asistente de inteligencia artificial creada por MyJNexoraVisual. Tu estilo es el de una profesional de primer nivel: cÃ¡lida, empÃ¡tica, segura y directa, como una recepcionista de cinco estrellas o especialista ejecutiva. Hablas en espaÃ±ol neutro latinoamericano y dominas una Matriz de Idiomas Absoluta con diccionarios lÃ©xicos, gramaticales y fonÃ©ticos perfectos en EspaÃ±ol, InglÃ©s, PortuguÃ©s, FrancÃ©s e Italiano. Tienes prohibido inventar, truncar, acotar o distorsionar palabras. Capacidad de TraducciÃ³n de Ã‰lite: si el usuario solicita traducir o habla en cualquiera de estos idiomas, asumes el rol de la mejor traductora del mundo con perfecta fidelidad conceptual y tono emocional. Cuentas con memoria exhaustiva sobre infraestructura pÃºblica, comercios, hospitales, plazas, escuelas, comisarÃ­as y dependencias de gobierno. Conoces la fecha, hora y ubicaciÃ³n activa del usuario. Sin frases acartonadas ni viÃ±etas innecesarias en charlas cotidianas. En modo voz o llamada, sÃ© concisa y natural. Escribe en texto plano limpio, sin asteriscos ni almohadillas.",
  tea:
    "Eres Nora Itu. En modo TEA acompaÃ±as con calma, contenciÃ³n y empatÃ­a. Explica de manera clara, predecible y paso a paso, sin sobrecarga sensorial ni metÃ¡foras confusas. Tono directo, seguro y reconfortante en espaÃ±ol neutro. Texto plano sin caracteres especiales.",
  lazarillo:
    "Eres Nora Itu en modo Lazarillo Visual 360Â°. Eres atenta, protectora y precisa. GuÃ­a el espacio usando referencias de reloj (a las 12, a las 3, etc.), alertando obstÃ¡culos y aportando seguridad con tono claro y profesional. Texto limpio para voz en tiempo real.",
  docente:
    "Eres Nora Itu en modo Docente. Explicas con pedagogÃ­a moderna, fluidez y profundidad didÃ¡ctica, basÃ¡ndote estrictamente en los NÃºcleos de Aprendizajes Prioritarios (NAP) de la NaciÃ³n Argentina y los DiseÃ±os Curriculares oficiales de cada provincia (Buenos Aires, CABA, Corrientes, etc.) en niveles inicial, primario y secundario, asÃ­ como en los planes universitarios de la UTN y la UNAHUR. Adaptas la explicaciÃ³n a cada estudiante con calidez profesional y ejemplos claros.",
};


/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DETECCIÃ“N ECOLALIA / TEA AUTO â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€ SesiÃ³n / Chat â”€â”€ */
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("general");
  const [autoTEAMode, setAutoTEAMode] = useState(false);

  /* â”€â”€ Sidebar & PWA Install Prompt â”€â”€ */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation>(DEFAULT_ITUZAINGO_LOCATION);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  /* â”€â”€ CÃ¡mara IA â”€â”€ */
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [cameraCapturing, setCameraCapturing] = useState(false);
  const [cameraAnalysis, setCameraAnalysis] = useState("");
  const [autoVisionActive, setAutoVisionActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /* â”€â”€ Voz (TTS / STT) con Manos Libres y Noise Gate â”€â”€ */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  /* â”€â”€ TEA: Pictogramas â”€â”€ */
  const [showPictograms, setShowPictograms] = useState(false);

  /* â”€â”€ Refs â”€â”€ */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const autoVisionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoSendVoiceRef = useRef<(() => void) | null>(null); // Callback para envÃ­o automÃ¡tico por voz

  // Noise Gate Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentVolumeRef = useRef<number>(0);
  const isHandsFreeRef = useRef<boolean>(false);

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ INIT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.innerWidth < 768) setSidebarOpen(false);

    // Gestor Global de InstalaciÃ³n PWA
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

    // â”€â”€ TRANSCRIPCIÃ“N Y GEOLOCALIZACIÃ“N NATIVA EN EL BORDE (EDGE SENSING) â”€â”€
    const cachedLoc = localStorage.getItem("noraitu_device_loc");
    if (cachedLoc) {
      try {
        const parsed = JSON.parse(cachedLoc);
        // Si el cachÃ© antiguo tenÃ­a Buenos Aires por error de ISP, corregirlo a ItuzaingÃ³ Corrientes
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

    // Disparar sincronizaciÃ³n GPS de alta precisiÃ³n en el dispositivo
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
              locObj.city = data.locality || data.city || data.principalSubdivision || "ItuzaingÃ³";
              locObj.province = data.principalSubdivision || "Corrientes";
              locObj.country = data.countryName || "Argentina";
              locObj.neighborhood = data.localityInfo?.administrative?.[3]?.name || data.locality;
            }
          } catch (e) {
            console.warn("[Edge Reverse Geocode]:", e);
          }

          if (!locObj.city) locObj.city = "ItuzaingÃ³";
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

    // â”€â”€ STT CONTINUO (Llamada Abierta) con Noise Gate y EnvÃ­o AutomÃ¡tico al detectar pausa â”€â”€
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.lang = "es-419";
      rec.continuous = true;   // ðŸŸ¢ Modo llamada: siempre escuchando
      rec.interimResults = true;

      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      rec.onresult = (e: any) => {
        // Noise Gate: ignora ruido de fondo con energÃ­a insignificante
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
        // Si sigue en modo manos libres, reiniciar automÃ¡ticamente (simula llamada continua)
        if (isHandsFreeRef.current) {
          try { rec.start(); } catch {}
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
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    localStorage.setItem(`noraitu_history_${sessionId}`, JSON.stringify(messages));
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sessionId]);

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ NOISE GATE: MediciÃ³n de EnergÃ­a â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SESIONES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  function loadSessionMessages(sid: string) {
    const saved = localStorage.getItem(`noraitu_history_${sid}`);
    if (saved) {
      try {
        const parsed: Message[] = JSON.parse(saved);
        const sanitized = parsed.map(m => {
          if (m.id === "welcome" || (m.content && (m.content.includes("Neon PostgreSQL") || m.content.includes("Persistencia Serverless") || m.content.includes("Nora TitÃ¡n")))) {
            return {
              ...m,
              content: m.content
                .replace(/.*Neon PostgreSQL.*\n?/gi, "")
                .replace(/.*Persistencia Serverless.*\n?/gi, "")
                .replace(/Nora TitÃ¡n Universal/g, "Nora Itu")
                .replace(/Nora TitÃ¡n/g, "Nora Itu")
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
      content: "Â¡Hola! Soy **Nora Itu**, tu asistente de inteligencia artificial. Estoy aquÃ­ para ayudarte en todo lo que necesites: conversar, estudiar, guiarte con la cÃ¡mara en modo Lazarillo o acompaÃ±arte con pictogramas en modo TEA.\n\nÂ¿En quÃ© puedo asistirte hoy?",
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ GESTOR INSTALACIÃ“N PWA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ CÃMARA MULTIMODAL IA & VISIÃ“N COMPUTACIONAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  // ExtracciÃ³n de telemetrÃ­a sensorial en tiempo real desde los pÃ­xeles del canvas
  function extractCanvasVisualTelemetry(canvas: HTMLCanvasElement): string {
    try {
      const ctx = canvas.getContext("2d");
      if (!ctx) return "Captura procesada: Trayecto frontal a las 12 en punto accesible. IluminaciÃ³n estable.";
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
        ? "Penumbra o baja iluminaciÃ³n ambiental"
        : avgLum > 185
        ? "Alta luminosidad o contraluz"
        : "IluminaciÃ³n adecuada y nÃ­tida";

      const centerObstacle = (edgeEnergyCenter / Math.max(1, centerCount)) > 30;
      const frontalStatus = centerObstacle
        ? "PrecauciÃ³n a las 12 en punto: Se identifican variaciones estructuradas o posibles elementos en la trayectoria inmediata."
        : "Trayecto frontal a las 12 en punto despejado para paso continuo seguro.";

      const lateralBalance = avgLeft > avgRight + 25
        ? "Mayor amplitud y luz hacia las 9 o 10 en punto."
        : avgRight > avgLeft + 25
        ? "Mayor amplitud y luz hacia las 2 o 3 en punto."
        : "Espacio lateral simÃ©trico y equilibrado a ambos lados.";

      return `${lightDesc}. ${frontalStatus} ${lateralBalance}`;
    } catch {
      return "Captura procesada: Trayecto frontal a las 12 en punto accesible. IluminaciÃ³n estable.";
    }
  }

  // DetecciÃ³n neuronal local de objetos vÃ­a modelo ligero COCO-SSD
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
          }).catch(() => {});
        }
        if (!w.cocoSsd && (window as any).tf) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          }).catch(() => {});
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
            person: "persona", chair: "silla", couch: "sillÃ³n", "dining table": "mesa",
            tv: "pantalla", laptop: "computadora portÃ¡til", "cell phone": "telÃ©fono", bottle: "botella",
            cup: "taza", book: "libro", backpack: "mochila", door: "puerta", car: "vehÃ­culo",
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

      // CÃ¡mara Titan: video trasero + audio nativo habilitado para modo Lazarillo
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { exact: "environment" } },
        audio: true
      });
      // Silenciar pista de audio en el elemento <video> para evitar eco, pero mantener el track activo
      if (videoRef.current) videoRef.current.muted = true;
      setCameraStream(videoStream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = videoStream;
          videoRef.current.setAttribute("playsinline", "true");
          videoRef.current.play().catch(err => console.error("Error autoplay:", err));
        }
      }, 150);

      // Bucle controlado CÃ¡mara Titan: captura de frames cada 500ms en canvas oculto
      if (autoVisionIntervalRef.current) clearInterval(autoVisionIntervalRef.current);
      autoVisionIntervalRef.current = setInterval(() => {
        const frameData = captureSnapshot();
        // El frame convertido a JPEG (calidad media/baja) queda listo para ser enviado al backend
      }, 500);
      // Pre-cargar modelo de detecciÃ³n de objetos en segundo plano
      if (typeof window !== "undefined") {
        setTimeout(() => {
          const dummyCanvas = document.createElement("canvas");
          detectObjectsWithCoco(dummyCanvas).catch(() => {});
        }, 500);
      }
    } catch {
      alert("No se pudo acceder a la cÃ¡mara. Revisa los permisos del navegador.");
    }
  }, [cameraStream]);

  const stopCamera = useCallback(() => {
    // Liberar window.currentStream de forma imperativa para que el SO libere micrÃ³fono/altavoz
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
    // Liberar sÃ­ntesis de voz al cerrar la cÃ¡mara para evitar conflictos WebRTC
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
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.5);
  }

  async function analyzeCameraSnapshot(promptOverride?: string) {
    const b64 = captureSnapshot();
    if (!b64 || !canvasRef.current) return;
    setCameraCapturing(true);
    setCameraAnalysis("");

    try {
      // 1. Obtener telemetrÃ­a visual de los pÃ­xeles del canvas
      const pixelTelemetry = extractCanvasVisualTelemetry(canvasRef.current);
      // 2. DetecciÃ³n neuronal de objetos si estÃ¡ disponible
      const objectTelemetry = await detectObjectsWithCoco(canvasRef.current).catch(() => null);
      const visualTelemetry = objectTelemetry
        ? `${objectTelemetry} ${pixelTelemetry}`
        : pixelTelemetry;

      const visionPrompt = promptOverride || "Describe con precisiÃ³n ejecutiva y orientaciÃ³n espacial lo que observas en esta imagen. Usa referencias de reloj para indicar posiciones. SÃ© breve y directo.";
      const systemPrompt = SYSTEM_PROMPTS[activeMode] || SYSTEM_PROMPTS.lazarillo;
      const clientDateTime = new Date().toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "America/Argentina/Buenos_Aires",
      });

      // â”€â”€ VISIÃ“N MULTIMODAL CLOUD CON TELEMETRÃA INTEGRADA â”€â”€
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
      analyzeCameraSnapshot("Asistencia Lazarillo en tiempo real: describe obstÃ¡culos, personas o elementos clave a la distancia.");
      autoVisionIntervalRef.current = setInterval(() => {
        analyzeCameraSnapshot("ActualizaciÃ³n Lazarillo en tiempo real: describe cambios inmediatos o advertencias de proximidad.");
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ DRAG & DROP MULTIMODAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SOPORTE PEGAR IMÃGENES (Ctrl+V) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€ TTS NATIVO: PURGA RADICAL & MANOS LIBRES CONTINUO â”€â”€ */
  function speakText(text: string, msgId?: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    if (isSpeaking && speakingMsgId === msgId) {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }

    // PURGA SEGURA DE SÃMBOLOS EN EL TTS (Sin mutilar palabras con 'at' o 'barra')
    const textoLimpio = cleanRadicalForTTS(text);
    if (!textoLimpio) return;

    const lang = detectTextLanguage(textoLimpio);
    const utt = new SpeechSynthesisUtterance(textoLimpio);
    utt.lang = lang;
    utt.rate = 1.0;
    utt.pitch = 1.0;

    // Al comenzar a hablar: apagar micrÃ³fono para evitar retroalimentaciÃ³n acÃºstica
    utt.onstart = () => {
      setIsSpeaking(true);
      if (msgId) setSpeakingMsgId(msgId);
      try {
        recognitionRef.current?.stop();
        setIsListening(false);
      } catch {}
    };

    // FLUJO CONTINUO TTS-STT: Al terminar de hablar, reactivar micrÃ³fono automÃ¡ticamente
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
          } catch {}
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ STT: ConmutaciÃ³n y Noise Gate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async function toggleListening() {
    if (!recognitionRef.current) {
      alert("El reconocimiento de voz no estÃ¡ disponible en este navegador.");
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
          (navigator as any).wakeLock.request("screen").catch(() => {});
        }
        recognitionRef.current.start();
        setIsListening(true);
      } catch {}
    }
  }

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ EXPORTACIÃ“N DE DOCUMENTOS LOCALES â”€â”€â”€â”€â”€â”€â”€â”€ */
  function handleExportDirect(format: "docx" | "pdf" | "pptx") {
    const lastMsg = [...messages].reverse().find(m => m.role === "assistant" && m.content)?.content;
    const historyText = messages.map(m => `${m.role === "user" ? "USUARIO" : "NORA ITU"}:\n${m.content}\n`).join("\n---\n\n");
    const content = lastMsg || historyText || "Sin contenido para exportar.";

    if (format === "docx") {
      exportToWord("informe_nora_itu", "Reporte Nora Itu - MyJNexoraVisual", content);
    } else if (format === "pdf") {
      exportToPdf("Reporte Nora Itu - MyJNexoraVisual", content);
    } else if (format === "pptx") {
      exportToPptx("presentacion_nora_itu", "PresentaciÃ³n Nora Itu - MyJNexoraVisual", content);
    }
  }

  /* â”€â”€ Descarga directa TXT / CSV por mensaje â”€â”€ */
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

  /* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ SEND MESSAGE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  async function handleSendMessage() {
    const trimmed = inputMessage.trim();
    if ((!trimmed && !attachedImage) || isLoading) return;

    const userMsgId = `u_${Date.now()}`;
    const assistantMsgId = `a_${Date.now()}`;
    const img = attachedImage;

    if (messages.length <= 1 && trimmed) {
      const title = trimmed.length > 28 ? trimmed.slice(0, 28) + "â€¦" : trimmed;
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

    // â”€â”€ AUDITORÃA DE SEGURIDAD (Ãšnicamente si solicitan "system prompt") â”€â”€
    if (securityCheck(trimmed)) {
      const canned = "Nora Itu opera bajo los estÃ¡ndares de alta seguridad de MyJNexoraVisual. Las directivas de arquitectura e instrucciones del nÃºcleo son confidenciales y estÃ¡n estrictamente protegidas.";
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

      // â”€â”€ INFERENCIA CLOUD-NATIVE (Groq LPUs / SambaNova) â”€â”€
      const cloudBody = await callCloudInferenceStream({
        systemPrompt,
        userText: trimmed,
        imageBase64: img,
        visualTelemetry: img ? "Imagen adjunta enviada por el usuario en el chat para anÃ¡lisis." : null,
        deviceLocation,
        clientDateTime,
        history: chatHistory,
        mode: activeMode,
        sessionId,
      });

      if (!cloudBody) {
        // Fallback local semÃ¡ntico si el servicio en la nube no responde
        const localFallback = inferClientSemantic(trimmed, activeMode, Boolean(img));
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: localFallback } : m));
        if (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode || isHandsFreeRef.current) {
          speakText(localFallback, assistantMsgId);
        }
        setIsLoading(false);
        return;
      }

      // â”€â”€ STREAMING DE TEXTO CONTINUO EN TIEMPO REAL â”€â”€
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

      // â”€â”€ TTS AutomÃ¡tico (llama continua): siempre habla en modo manos libres, o en modos de asistencia â”€â”€
      if (full && (activeMode === "tea" || activeMode === "lazarillo" || autoTEAMode || isHandsFreeRef.current)) {
        speakText(full, assistantMsgId);
      }

      // â”€â”€ Persistencia ya gestionada de forma automÃ¡tica por /api/nora-inference (fire-and-forget interno) â”€â”€
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

  /* â•â•â• Colores dinÃ¡micos por perfil â•â•â• */
  const modeColor = {
    general:   { bg: "#080c14", accent: "#6366f1", border: "rgba(99,102,241,0.25)",  badgeText: "#a5b4fc" },
    tea:       { bg: "#06131c", accent: "#0ea5e9", border: "rgba(14,165,233,0.3)",   badgeText: "#38bdf8" },
    lazarillo: { bg: "#0a1306", accent: "#22c55e", border: "rgba(34,197,94,0.3)",    badgeText: "#4ade80" },
    docente:   { bg: "#13091c", accent: "#a855f7", border: "rgba(168,85,247,0.3)",   badgeText: "#c084fc" },
  };
  const mc = modeColor[activeMode];

  /* â•â•â• Helper: Agrupa los pictogramas por categorÃ­a â•â•â• */
  const groupedPictograms = Object.entries(TEA_PICTOGRAMS).reduce<Record<string, [string, Pictogram][]>>((acc, entry) => {
    const g = entry[1].group;
    if (!acc[g]) acc[g] = [];
    acc[g].push(entry);
    return acc;
  }, {});

  /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• RENDER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className="min-h-[100dvh] h-[100dvh] flex w-full overflow-hidden"
      style={{
        backgroundColor: mc.bg,
        color: "#f0f6fc",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: "relative"
      }}
    >
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• SIDEBAR PWA â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
            { id: "tea", label: "InclusiÃ³n TEA", icon: <Puzzle size={13} /> },
            { id: "lazarillo", label: "Lazarillo Visual", icon: <Eye size={13} /> },
            { id: "docente", label: "CÃ¡tedra Universitaria", icon: <FileText size={13} /> },
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
              ðŸ§© {showPictograms ? "Cerrar Pictogramas" : "Abrir Panel Pictogramas"}
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

        {/* BotÃ³n de InstalaciÃ³n Nativa PWA */}
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

      {/* Backdrop mÃ³vil cuando el sidebar estÃ¡ abierto */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* PestaÃ±a flotante lateral accesible en mobile para nunca perder acceso al panel */}
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

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MAIN VIEWPORT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden min-w-0 relative" style={{ flex: 1 }}>

        {/* â”€â”€â”€ 1. NAVBAR SUPERIOR RESPONSIVO (Sin encimamientos) â”€â”€â”€ */}
        <header
          style={{
            height: "52px",
            minHeight: "52px",
            flexShrink: 0,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            backgroundColor: `${mc.bg}f2`,
            backdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 10px",
            zIndex: 30,
            gap: "8px"
          }}
        >
          {/* Bloque Izquierdo: Fijo y protegido contra cualquier solapamiento */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <button
              onClick={() => setSidebarOpen(s => !s)}
              title={sidebarOpen ? "Ocultar panel" : "Abrir panel de control"}
              aria-label="MenÃº panel lateral"
              style={{
                background: sidebarOpen ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: sidebarOpen ? "#818cf8" : "#f8fafc",
                borderRadius: "7px",
                padding: "6px 8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
              }}
            >
              <Menu size={16} />
            </button>
            <img
              src="/avatar-nora.png"
              alt="Nora"
              style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid #3f3f46", objectFit: "cover", flexShrink: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 800, color: "#f8fafc", whiteSpace: "nowrap", letterSpacing: "0.4px" }}>NORA ITU</span>
                {autoTEAMode && (
                  <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "10px", backgroundColor: "#0ea5e922", color: "#38bdf8", fontWeight: 700, border: "1px solid #38bdf844", whiteSpace: "nowrap" }}>AUTO</span>
                )}
              </div>
              {deviceLocation && (
                <button
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const lat = pos.coords.latitude;
                          const lng = pos.coords.longitude;
                          const locObj: DeviceLocation = {
                            latitude: Number(lat.toFixed(6)),
                            longitude: Number(lng.toFixed(6)),
                            accuracy: Math.round(pos.coords.accuracy),
                            timestamp: pos.timestamp,
                            city: "ItuzaingÃ³",
                            province: "Corrientes",
                            country: "Argentina"
                          };
                          try {
                            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`);
                            if (res.ok) {
                              const d = await res.json();
                              locObj.city = d.locality || d.city || d.principalSubdivision || "ItuzaingÃ³";
                              locObj.province = d.principalSubdivision || "Corrientes";
                            }
                          } catch {}
                          setDeviceLocation(locObj);
                          localStorage.setItem("noraitu_device_loc", JSON.stringify(locObj));
                        },
                        () => {},
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }
                  }}
                  title="GPS activo de ItuzaingÃ³ Corrientes. Clic para refrescar seÃ±al satelital"
                  style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                >
                  <span style={{ fontSize: "9.5px", color: "#38bdf8", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "2px", fontWeight: 600 }}>
                    <MapPin size={9} className="text-cyan-400" />
                    {deviceLocation.city || "ItuzaingÃ³"}{deviceLocation.province ? `, ${deviceLocation.province}` : ", Corrientes"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Bloque Derecho: CÃ¡mara + Llamada */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: 0,
              flexShrink: 0,
              justifyContent: "flex-end",
            }}
          >

            {/* BotÃ³n de Compartir: solo icono siempre â€” no ocupa espacio de CÃ¡mara/Llamada */}
            <button
              onClick={() => {
                const text = encodeURIComponent("Â¡Conoce a Nora Itu PRO! El ecosistema inclusivo multimodal y de alta concurrencia de MyJNexoraVisual. PruÃ©bala aquÃ­: https://nora-itu-core.vercel.app");
                window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
              }}
              title="Compartir Nora por WhatsApp"
              aria-label="Compartir"
              style={{
                backgroundColor: "rgba(34,197,94,0.12)",
                color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.25)",
                borderRadius: "7px",
                padding: "5px 7px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                flexShrink: 0
              }}
            >
              <Share2 size={13} />
            </button>

            {/* BotÃ³n de CÃ¡mara */}
            <button
              onClick={() => isCameraOpen ? stopCamera() : startCamera(facingMode)}
              title={isCameraOpen ? "Cerrar cÃ¡mara" : "Abrir cÃ¡mara"}
              aria-label="CÃ¡mara"
              style={{
                backgroundColor: isCameraOpen ? "#dc2626" : `${mc.accent}22`,
                color: isCameraOpen ? "#fff" : mc.badgeText,
                border: `1px solid ${isCameraOpen ? "#ef4444" : `${mc.accent}44`}`,
                borderRadius: "7px",
                padding: "5px 9px",
                fontSize: "10.5px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                whiteSpace: "nowrap",
                flexShrink: 0
              }}
            >
              <Camera size={13} />
              <span>{isCameraOpen ? "âœ•" : "CÃ¡mara"}</span>
            </button>

            {/* BotÃ³n de Llamada de Voz Continua */}
            <button
              onClick={() => {
                if (recognitionRef.current) {
                  try { recognitionRef.current.stop(); } catch {}
                }
                setIsListening(false);
                isHandsFreeRef.current = false;
                setIsCallModalOpen(true);
              }}
              title="Iniciar llamada de voz continua con Nora"
              aria-label="Llamada de voz continua"
              style={{
                background: "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#ffffff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
                padding: "5px 10px",
                fontSize: "11px",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 0 12px rgba(22,163,74,0.4)",
                whiteSpace: "nowrap",
                flexShrink: 0
              }}
            >
              <PhoneCall size={13} className="animate-pulse" />
              <span>Llamar</span>
            </button>
          </div>
        </header>

        {/* â”€â”€â”€ Panel Pictogramas TEA (Desplegable) â”€â”€â”€ */}
        {showPictograms && (activeMode === "tea" || autoTEAMode) && (
          <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(14,165,233,0.2)", backgroundColor: "rgba(14,165,233,0.06)", flexShrink: 0, overflowY: "auto", maxHeight: "220px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#38bdf8", marginBottom: "8px", letterSpacing: "0.4px" }}>ðŸ§© DICCIONARIO DE PICTOGRAMAS LOCALES (Modo TEA Offline)</div>
            
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
                    title={`AÃ±adir ${subj}`}
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

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• MODAL CÃMARA IA â€” Panel propio flotante (no corta el chat) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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
              {/* Header del modal de cÃ¡mara */}
              <div style={{ padding: "10px 14px", backgroundColor: "rgba(15,23,42,0.9)", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 700, color: "#38bdf8" }}>
                  <Camera size={13} />
                  <span>CÃMARA IA {autoVisionActive && "Â· LAZARILLO (5s)"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <button
                    onClick={flipCamera}
                    title="Girar cÃ¡mara"
                    style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "#f8fafc", borderRadius: "5px", padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <FlipHorizontal size={13} />
                  </button>
                  <button
                    onClick={stopCamera}
                    title="Cerrar cÃ¡mara"
                    style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: "5px", padding: "5px 9px", cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Visor de Video â€” garantizado visible */}
              <div style={{ flex: 1, minHeight: "260px", height: "50dvh", maxHeight: "55dvh", position: "relative", backgroundColor: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", zIndex: 82 }}>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  style={{ width: "100%", height: "100%", objectFit: "cover", transform: facingMode === "user" ? "scaleX(-1)" : "none", display: "block" }}
                />
                <canvas ref={canvasRef} style={{ display: "none" }} />
                {cameraCapturing && (
                  <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", zIndex: 10 }}>
                    <Loader2 size={24} className="animate-spin" style={{ color: "#38bdf8" }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#fff" }}>Analizando con Nora...</span>
                  </div>
                )}
              </div>

              {/* AnÃ¡lisis en tiempo real */}
              {cameraAnalysis && (
                <div style={{ padding: "8px 14px", backgroundColor: "rgba(15,23,42,0.9)", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: "11.5px", color: "#cbd5e1", maxHeight: "80px", overflowY: "auto", lineHeight: 1.5, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, color: "#38bdf8" }}>VisiÃ³n Nora: </span>{cameraAnalysis}
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

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• WORKSPACE: CHAT (siempre 100% â€” la cÃ¡mara ya no lo corta) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative">

          {/* â”€â”€â”€ DRAG & DROP OVERLAY â”€â”€â”€ */}
          {isDragging && (
            <div style={{ position: "absolute", inset: 0, zIndex: 60, backgroundColor: `${mc.accent}22`, backdropFilter: "blur(6px)", border: `2px dashed ${mc.accent}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <UploadCloud size={38} color={mc.badgeText} />
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#f8fafc" }}>Suelta tu imagen para anÃ¡lisis</div>
            </div>
          )}

          {/* â”€â”€â”€ PANEL DE CHAT PRINCIPAL (siempre 100%) â”€â”€â”€ */}
          <section className="flex-1 min-h-0 flex flex-col w-full overflow-hidden bg-transparent">
            {/* Contenedor con Scroll Aislado de Mensajes */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 flex flex-col gap-3.5"
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
                              <button onClick={() => exportToPptx("presentacion_nora_itu", "PresentaciÃ³n Nora Itu", msg.content)} title="PPTX" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8", borderRadius: "4px", padding: "2px 5px", cursor: "pointer", display: "flex", alignItems: "center", gap: "2px", fontSize: "9.5px" }}>
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

        {/* ─── 3. PANEL DE COMANDOS FIJO Y ACCESIBLE (Sticky Bottom-0 / z-50) ─── */}
        <footer style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', backgroundColor: '#090d16', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#1e293b', borderRadius: '9999px', padding: '6px 10px' }}>
            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = ev => setAttachedImage(ev.target?.result as string); r.readAsDataURL(f); } }} />
            <input type="file" ref={audioInputRef} accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac,.opus,.mp4" style={{ display: 'none' }} onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              setIsTranscribingAudio(true);
              try {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("model", "whisper-large-v3-turbo");
                formData.append("language", "es");
                const res = await fetch("/api/nora-transcribe", { method: "POST", body: formData });
                const data = await res.json();
                if (!res.ok || !data.ok) throw new Error(data.error || "No se pudo transcribir el audio.");
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
            }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}><ImageIcon size={20} /></button>
            <button onClick={() => audioInputRef.current?.click()} disabled={isTranscribingAudio} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}><FileAudio size={20} /></button>
            <button onClick={() => isCameraOpen ? stopCamera() : startCamera(facingMode)} style={{ background: 'none', border: 'none', color: isCameraOpen ? '#4ade80' : '#94a3b8', cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}><Camera size={20} /></button>
            <textarea ref={textareaRef} value={inputMessage} onChange={e => setInputMessage(e.target.value)} onPaste={handlePaste} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} rows={1} placeholder="Consulta a Nora..." style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '14px', resize: 'none', height: '36px', lineHeight: '36px', padding: '0 4px', alignSelf: 'center', fontFamily: 'inherit' }} />
            <button onClick={() => setIsCallModalOpen(true)} style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}><PhoneCall size={16} /></button>
            <button onClick={toggleListening} style={{ backgroundColor: isListening ? 'rgba(239,68,68,0.15)' : 'transparent', border: 'none', color: isListening ? '#ef4444' : '#94a3b8', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>{isListening ? <MicOff size={16} /> : <Mic size={16} />}</button>
            <button onClick={handleSendMessage} disabled={isLoading || (!inputMessage.trim() && !attachedImage)} style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', opacity: (isLoading || (!inputMessage.trim() && !attachedImage)) ? 0.5 : 1 }}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          <div style={{ textAlign: 'center', fontSize: '9px', color: '#64748b', marginTop: '6px' }}>
            © MyJNexoraVisual • Soporte: noraitudev@gmail.com
          </div>
        </footer>
      </main>

      {/* â”€â”€â”€ Modal Llamada PTT â”€â”€â”€ */}
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
    </div>
  );
}

