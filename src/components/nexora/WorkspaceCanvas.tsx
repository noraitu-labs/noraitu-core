"use client";

/**
 * NEXORA ONE ENGINE — INTERACTIVE RADIO CO-HOST DESK & SOUND DESIGNER STUDIO
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Component: src/components/nexora/WorkspaceCanvas.tsx
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Activity,
  Camera,
  CameraOff,
  CheckCircle2,
  Disc,
  Eye,
  FileText,
  Mic,
  MicOff,
  Music,
  Play,
  PlusCircle,
  Radio,
  Send,
  Sliders,
  Sparkles,
  Square,
  Terminal,
  UploadCloud,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  NexoraRedisLogEntry,
  NexoraSpecialistAgentId,
} from "@/hooks/useNexoraDispatch";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

export interface WorkspaceCanvasProps {
  mode: Extract<NexoraSpecialistAgentId, "RADIO_CO_HOST" | "SOUND_DESIGNER">;
  redisLogs: NexoraRedisLogEntry[];
  isDispatching: boolean;
  onDispatchAction: (params: {
    clientBrand: string;
    positivePrompt: string;
    correlationSuffix: string;
  }) => Promise<unknown>;
  onAppendLog: (
    agent: string,
    message: string,
    level?: "INFO" | "SUCCESS" | "WARN"
  ) => void;
}

export interface OnAirDialogueMessage {
  id: string;
  speaker: "LOCUTOR_HUMANO" | "NORA_CO_HOST";
  speakerLabel: string;
  text: string;
  timestamp: string;
  modelBadge?: string;
  /** True when no live LLM answered (on-air "return lost" line); excluded from LLM history. */
  degraded?: boolean;
}

export type BroadcastTableStyle =
  | "Informativo Formal"
  | "Debate Picante"
  | "Magazine Relajado";

export interface BroadcastStationConfig {
  stationDial: string;
  programName: string;
  hostNames: string;
  tableStyle: BroadcastTableStyle;
}

/**
 * Discriminator for Open-Mic Duplex mode: normalizes to lowercase and strips accents,
 * returning true when the spoken phrase invokes Nora ("Nora", "Norita", "Che Nora", "A ver Nora",
 * including common WebSpeech phonetic transcriptions like "Ahora me escuchás") or asks a direct
 * question to the co-host on air.
 */
function containsNoraWakeWord(transcript: string): boolean {
  const raw = (transcript || "").trim();
  const normalized = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    /\b(nora|norita|mora|dora|che\s+nora|a\s+ver\s+nora|hola\s+nora|contanos\s+nora|decime\s+nora|escuchame\s+nora)\b/.test(
      normalized
    )
  ) {
    return true;
  }
  // Also match direct 2nd-person booth appeals & STT "Ahora me escuchas" -> "Nora, ¿me escuchás?"
  if (
    /\b(me\s+escuchas|ahora\s+me\s+escuchas|estas\s+ahi|hola\s+me\s+escuchas|que\s+opinas|que\s+pensas|como\s+ves|como\s+la\s+ves|contame|contanos|decime|que\s+te\s+parece)\b/.test(
      normalized
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Ambient Studio Noise & False-Positive Filter:
 * Rejects pure throat clearing, table bumps, and single-syllable filler noises ("eh", "ah", "mm", "uh")
 * without blocking valid speech even when Chromium reports `confidence === 0`.
 */
function isAmbientNoiseOrFalsePositive(transcript: string): boolean {
  const cleaned = (transcript || "").trim();
  if (cleaned.length < 2) return true;
  const normalized = cleaned
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  if (!normalized) return true;
  if (
    /^(eh+|ah+|oh+|uh+|mm+|hm+|tos|ajam)$/.test(normalized)
  ) {
    return true;
  }
  return false;
}

/**
 * Formats an 8-block ASCII VU meter bar (`[████░░░░]`) from a 0..100 percentage.
 */
function formatVuAsciiBar(pct: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const filled = Math.min(8, Math.max(clamped > 4 ? 1 : 0, Math.round((clamped / 100) * 8)));
  return `[${"█".repeat(filled)}${"░".repeat(8 - filled)}]`;
}

const BASE_WAVEFORM_BARS = [
  32, 58, 74, 45, 88, 95, 62, 40, 78, 92, 68, 52, 84, 70, 48, 90, 64, 38, 76,
  86, 54, 42, 80, 94, 60, 46, 72, 85, 50, 36, 66, 79,
];

const QUICK_RADIO_PROMPTS = [
  "Nora, contame qué repercusiones hay en Europa sobre la cumbre de hoy y qué dice la prensa francesa",
  "¿Cómo ves la previa del superclásico el domingo?",
  "Nos escriben desde Milán en italiano: 'Come vedete l'economia argentina?' Contanos al aire y saludalos en italiano",
];

/**
 * Generates an in-memory stereo WAV Data URL so the user can immediately listen
 * to synthesized jingles / broadcast beds in the Sound Designer audio player.
 */
function synthesizeJingleWavDataUrl(
  durationSec: number,
  style: string
): string {
  const sampleRate = 22050;
  const clampedSec = Math.min(Math.max(durationSec, 4), 15);
  const numSamples = sampleRate * clampedSec;
  const numChannels = 2;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) {
      view.setUint8(offset + i, s.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const chords =
    style === "Radio News Stinger"
      ? [440, 554.37, 659.25, 880]
      : style === "Agro-Industrial Epic"
      ? [196, 246.94, 293.66, 392]
      : [261.63, 329.63, 392.0, 523.25];

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const stepIdx = Math.floor(t * 4) % chords.length;
    const freq = chords[stepIdx];
    const env = Math.min(1, t / 0.15) * Math.min(1, (clampedSec - t) / 0.4);
    const pulse = 0.65 + 0.35 * Math.sin(2 * Math.PI * 2 * t);
    const sigL =
      Math.sin(2 * Math.PI * freq * t) * 0.35 +
      Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25 +
      Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.15;
    const sigR =
      Math.sin(2 * Math.PI * (freq * 1.003) * t) * 0.35 +
      Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.25 +
      Math.cos(2 * Math.PI * (freq * 1.5) * t) * 0.15;

    const valL = Math.max(-1, Math.min(1, sigL * env * pulse));
    const valR = Math.max(-1, Math.min(1, sigR * env * pulse));
    view.setInt16(offset, valL * 32767, true);
    view.setInt16(offset + 2, valR * 32767, true);
    offset += 4;
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function WorkspaceCanvas({
  mode,
  redisLogs,
  isDispatching,
  onDispatchAction,
  onAppendLog,
}: WorkspaceCanvasProps) {
  const isRadio = mode === "RADIO_CO_HOST";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- WHITE-LABEL BROADCAST STATION CONFIGURATION STATE ---
  const [stationConfig, setStationConfig] = useState<BroadcastStationConfig>({
    stationDial: "FM del Este 98.7",
    programName: "Panorama Central",
    hostNames: "Equipo del estudio",
    tableStyle: "Debate Picante",
  });
  const [showStationConfig, setShowStationConfig] = useState<boolean>(false);

  // --- OPEN-MIC DUPLEX & WAKE-WORD DISCRIMINATOR STATE ---
  const [openMicDuplexMode, setOpenMicDuplexMode] = useState<boolean>(false);
  const [passiveTableContext, setPassiveTableContext] = useState<string[]>([]);

  // --- RADIO CO-HOST LIVE DIALOGUE STATE ---
  const [dialogueHistory, setDialogueHistory] = useState<OnAirDialogueMessage[]>([
    {
      id: "turn-init-1",
      speaker: "NORA_CO_HOST",
      speakerLabel: "Nora (Co-Host • Panorama Central)",
      text: "¡Hola a todo el equipo! Micrófonos listos en la mesa de Panorama Central por FM del Este 98.7. Activá el Modo Cabina Abierta y nombrame ('Che Nora', 'A ver Nora') cuando quieras que tome el aire, o tocá 'Dar Pase a Nora'.",
      timestamp: "EN VIVO",
      modelBadge: "Groq LPU • llama-3.3-70b-versatile",
    },
  ]);
  const [consoleInput, setConsoleInput] = useState("");
  const [isSendingToNora, setIsSendingToNora] = useState(false);
  const [isNoraSpeaking, setIsNoraSpeaking] = useState(false);
  const [isListeningMic, setIsListeningMic] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isLiveOnAir, setIsLiveOnAir] = useState(true);
  const [animatedBars, setAnimatedBars] = useState<number[]>(BASE_WAVEFORM_BARS);

  // --- SOUND DESIGNER STATE ---
  const [jingleDescription, setJingleDescription] = useState(
    "Jingle comercial energético con sintetizadores analógicos cálidos, pulso electrónico moderno y cierre brillante By Nora"
  );
  const [jingleDuration, setJingleDuration] = useState<number>(10);
  const [jingleStyle, setJingleStyle] = useState<string>("Corporate Synthwave");
  const [targetLufs, setTargetLufs] = useState(-14.0);
  const [sidechainDb, setSidechainDb] = useState(-12.0);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [lastGeneratedJingleName, setLastGeneratedJingleName] = useState<string>(
    "NXR-JINGLE-10S-MASTER-14LUFS.wav"
  );

  // --- BROADCAST SOUND CART & MASTER ENGINE STATE ---
  const [soundCartPlayingBed, setSoundCartPlayingBed] = useState<boolean>(false);
  const [soundCartBedVolume, setSoundCartBedVolume] = useState<number>(0.45);
  const [soundCartMasterVolume, setSoundCartMasterVolume] = useState<number>(0.85); // -14 LUFS Ref
  const [isDuckingActive, setIsDuckingActive] = useState<boolean>(false);
  const [lastTriggeredStinger, setLastTriggeredStinger] = useState<string | null>(null);

  const soundCartCtxRef = useRef<AudioContext | null>(null);
  const soundCartMasterGainRef = useRef<GainNode | null>(null);
  const soundCartBedGainRef = useRef<GainNode | null>(null);
  const soundCartBedSourcesRef = useRef<AudioNode[]>([]);
  const isDuckingActiveRef = useRef<boolean>(false);
  const soundCartBedVolumeRef = useRef<number>(0.45);
  const soundCartMasterVolumeRef = useRef<number>(0.85);

  // --- STUDIO VISION & CAMERA GROUNDING STATE ---
  const [studioCameraActive, setStudioCameraActive] = useState<boolean>(false);
  const [visualStudioContext, setVisualStudioContext] = useState<string[]>([]);
  const [lastVisualObservation, setLastVisualObservation] = useState<string | null>(null);
  const studioCameraStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const visionCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const visualStudioContextRef = useRef<string[]>([]);

  // --- SHARED DESK BOARD (PLIEGO EDITORIAL EN MESA) STATE ---
  const [showDeskBriefing, setShowDeskBriefing] = useState<boolean>(false);
  const [deskBriefingItems, setDeskBriefingItems] = useState<
    Array<{
      id: string;
      title: string;
      lead: string;
      body: string;
      category: string;
      publishedAt: string;
      sourceType: string;
    }>
  >([]);
  const [newDeskTitle, setNewDeskTitle] = useState("");
  const [newDeskLead, setNewDeskLead] = useState("");
  const [newDeskCategory, setNewDeskCategory] = useState("ECONOMÍA");
  const [isUploadingDeskItem, setIsUploadingDeskItem] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const studioAudioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const vuAnimFrameRef = useRef<number | null>(null);
  const lastVuDomUpdateMsRef = useRef<number>(0);
  const vuBarFillRef = useRef<HTMLDivElement | null>(null);
  const vuLabelTextRef = useRef<HTMLSpanElement | null>(null);
  const vuVoicePillRef = useRef<HTMLSpanElement | null>(null);
  const interimBannerDomRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const lastSpeechRecResultMsRef = useRef<number>(0);
  const voiceSpokeDuringChunkRef = useRef<boolean>(false);
  const silenceSinceMsRef = useRef<number>(0);
  const isListeningMicRef = useRef<boolean>(false);
  const isSendingToNoraRef = useRef<boolean>(false);
  const consoleInputRef = useRef<string>("");
  const lastNoraSpeechEndMsRef = useRef<number>(0);
  const lastInteractionEpochMsRef = useRef<number>(0);
  const interimSpeechTimeoutRef = useRef<any>(null);
  const speechSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const accumulatedSpeechTranscriptRef = useRef<string>("");
  const latestInterimSpeechRef = useRef<string>("");
  const latestCameraFrameBase64Ref = useRef<string | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const sentenceQueueRef = useRef<Array<{ id: string; sentenceText: string; audio: HTMLAudioElement; status: "ready" | "playing" | "played" | "error" }>>([]);
  const isSentenceQueuePlayingRef = useRef<boolean>(false);
  const isStreamDoneRef = useRef<boolean>(false);
  const openMicDuplexModeRef = useRef<boolean>(false);
  const isNoraSpeakingRef = useRef<boolean>(false);
  const passiveTableContextRef = useRef<string[]>([]);
  const dialogueHistoryRef = useRef<OnAirDialogueMessage[]>(dialogueHistory);
  const stationConfigRef = useRef<BroadcastStationConfig>(stationConfig);
  const [pinnedVoiceLabel, setPinnedVoiceLabel] = useState<string>(
    "Voz Cloud Neuronal (HD Broadcast)"
  );
  const [micHardwareWarning, setMicHardwareWarning] = useState<string | null>(
    null
  );

  useEffect(() => {
    isListeningMicRef.current = isListeningMic;
  }, [isListeningMic]);

  useEffect(() => {
    isSendingToNoraRef.current = isSendingToNora;
  }, [isSendingToNora]);

  useEffect(() => {
    consoleInputRef.current = consoleInput;
  }, [consoleInput]);

  useEffect(() => {
    openMicDuplexModeRef.current = openMicDuplexMode;
  }, [openMicDuplexMode]);

  useEffect(() => {
    isNoraSpeakingRef.current = isNoraSpeaking;
  }, [isNoraSpeaking]);

  useEffect(() => {
    passiveTableContextRef.current = passiveTableContext;
  }, [passiveTableContext]);

  useEffect(() => {
    dialogueHistoryRef.current = dialogueHistory;
  }, [dialogueHistory]);

  useEffect(() => {
    stationConfigRef.current = stationConfig;
  }, [stationConfig]);

  useEffect(() => {
    soundCartBedVolumeRef.current = soundCartBedVolume;
    if (soundCartBedGainRef.current && soundCartCtxRef.current && !isDuckingActiveRef.current) {
      soundCartBedGainRef.current.gain.setTargetAtTime(
        soundCartBedVolume,
        soundCartCtxRef.current.currentTime,
        0.05
      );
    }
  }, [soundCartBedVolume]);

  useEffect(() => {
    soundCartMasterVolumeRef.current = soundCartMasterVolume;
    if (soundCartMasterGainRef.current && soundCartCtxRef.current) {
      soundCartMasterGainRef.current.gain.setTargetAtTime(
        soundCartMasterVolume,
        soundCartCtxRef.current.currentTime,
        0.05
      );
    }
  }, [soundCartMasterVolume]);

  // Cleanup on unmount to free all audio contexts, video streams & timers
  useEffect(() => {
    return () => {
      if (soundCartCtxRef.current && soundCartCtxRef.current.state !== "closed") {
        try {
          soundCartCtxRef.current.close();
        } catch {
          // Ignore
        }
      }
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current);
        visionIntervalRef.current = null;
      }
      if (studioCameraStreamRef.current) {
        studioCameraStreamRef.current.getTracks().forEach((t) => t.stop());
        studioCameraStreamRef.current = null;
      }
      releaseHardwareStudioAudioStream();
    };
  }, []);

  // Ingest initial Shared Desk Briefing items on mount
  useEffect(() => {
    const fetchBriefing = async () => {
      try {
        const res = await fetch("/api/nexora/desk-briefing");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            setDeskBriefingItems(data.items);
          }
        }
      } catch {
        // Ignore network drops
      }
    };
    fetchBriefing();
  }, []);

  // Initialize default audio preview for Sound Designer
  useEffect(() => {
    if (!generatedAudioUrl && typeof window !== "undefined") {
      setGeneratedAudioUrl(synthesizeJingleWavDataUrl(10, "Corporate Synthwave"));
    }
  }, [generatedAudioUrl]);

  // Scroll radio dialogue history on new turn
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dialogueHistory]);

  /**
   * Resolves and pins the single deterministic LATAM / Argentine voice in `selectedVoiceRef`
   * so Nora never jumps between accents (Spain es-ES, French fr-FR, Italian it-IT, or English en-US).
   */
  const resolveAndPinLatamVoice = (): SpeechSynthesisVoice | null => {
    if (selectedVoiceRef.current) {
      return selectedVoiceRef.current;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return null;
    }

    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) {
      return null;
    }

    // Explicit prohibition filter: discard Spain (es-ES), French (fr-FR), Italian (it-IT), English (en-US)
    const isForbiddenVoice = (v: SpeechSynthesisVoice): boolean => {
      const lang = (v.lang || "").toLowerCase();
      const name = (v.name || "").toLowerCase();
      if (
        lang.startsWith("es-es") ||
        lang.startsWith("fr") ||
        lang.startsWith("it") ||
        lang.startsWith("en") ||
        name.includes("spain") ||
        name.includes("españa") ||
        name.includes("helena") ||
        name.includes("laura") ||
        name.includes("pablo") ||
        name.includes("alvaro") ||
        name.includes("álvaro") ||
        name.includes("french") ||
        name.includes("italian")
      ) {
        return true;
      }
      return false;
    };

    const allowedVoices = voices.filter((v) => !isForbiddenVoice(v));

    // Priority 1 (Argentina Nativo Pro): lang === 'es-AR' or name includes Argentina, Elena, or Tomas
    const prio1 = allowedVoices.find((v) => {
      const lang = v.lang.toLowerCase();
      const name = v.name;
      return (
        lang === "es-ar" ||
        lang.includes("es-ar") ||
        name.includes("Argentina") ||
        name.includes("Elena") ||
        name.includes("Tomas") ||
        name.includes("Tomás")
      );
    });

    // Priority 2 (Latino Neutro Natural / Online): Microsoft Sabina Online (Natural), Paulina, Dalia, Jorge, or es-419 / es-MX Natural
    const prio2 = allowedVoices.find((v) => {
      const lang = v.lang.toLowerCase();
      const name = v.name;
      return (
        name.includes("Microsoft Sabina Online (Natural)") ||
        name.includes("Sabina") ||
        name.includes("Paulina") ||
        name.includes("Dalia") ||
        name.includes("Jorge") ||
        ((lang === "es-419" || lang === "es-mx" || lang.startsWith("es-mx")) &&
          name.includes("Natural"))
      );
    });

    // Priority 3 (Latinoamericano Estándar): lang in ['es-419', 'es-MX', 'es-CO', 'es-CL', 'es-US']
    const latamLangSet = new Set([
      "es-419",
      "es-mx",
      "es-co",
      "es-cl",
      "es-us",
      "es-uy",
      "es-pe",
      "es-ve",
    ]);
    const prio3 = allowedVoices.find((v) =>
      latamLangSet.has(v.lang.toLowerCase())
    );

    // Fallback to any non-forbidden Spanish voice
    const prio4 = allowedVoices.find((v) =>
      v.lang.toLowerCase().startsWith("es")
    );

    const chosen = prio1 || prio2 || prio3 || prio4 || null;
    if (chosen) {
      selectedVoiceRef.current = chosen;
      // Pinned to Voz Cloud Neuronal (HD Broadcast)
    }
    return chosen;
  };

  // Preload and pin browser synthesis voice as soon as available
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    resolveAndPinLatamVoice();
    const handleVoicesChanged = () => {
      resolveAndPinLatamVoice();
    };
    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged
    );
    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged
      );
    };
  }, []);

  /**
   * Phonetic cleanup & natural breathing pause injection for LATAM / Rioplatense broadcast pronunciation.
   * 1. Converts prosodic pause/breath tags into natural punctuation pauses.
   * 2. Converts sentence periods (`. `) into `. , ` and ensures commas after ellipses/connectors so TTS breathes calmly.
   * 3. Enforces LATAM phonetic pronunciation for common acronyms (Mercosur -> Mércosur, FMI -> F M I, EE.UU. -> Estados Unidos, IA -> I A).
   */
  const cleanPhoneticsForLatamTTS = (rawText: string): string => {
    return rawText
      .replace(/\[pause_long\]/gi, "... , ")
      .replace(/\[soft_breath\]/gi, "... , ")
      .replace(/\[breath\]/gi, ", ")
      .replace(/\[pause_short\]/gi, ", ")
      .replace(/\[radio_[^\]]*\]/gi, " ")
      .replace(/\[laugh_[^\]]*\]/gi, " ")
      .replace(/\[laughter\]/gi, " ")
      .replace(/\[emphasis\]/gi, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\((?:risas|pausa|suspiro|énfasis)[^)]*\)/gi, " ")
      .replace(/[*#_`~]/g, "")
      .replace(/\bMercosur\b/gi, "Mércosur")
      .replace(/\bFMI\b/g, "F M I")
      .replace(/\bEE\.?\s*UU\.?\b/g, "Estados Unidos")
      .replace(/\bEEUU\b/g, "Estados Unidos")
      .replace(/\bIA\b/g, "I A")
      .replace(/\bBCRA\b/g, "Banco Central")
      .replace(/\bPBI\b/g, "P B I")
      .replace(/\bPIB\b/g, "P I B")
      .replace(/\bUE\b/g, "Unión Europea")
      .replace(/\bPyMEs\b/gi, "pimes")
      .replace(/\bUSD\b/g, "dólares")
      .replace(/\bDT\b/g, "director técnico")
      // Force natural breathing pause after ellipses and sentence periods
      .replace(/\.{3,}\s*(?!,)/g, "... , ")
      .replace(/\.\s+(?=[A-ZÁÉÍÓÚÑ¡¿])/g, ". , ")
      .replace(/;\s+/g, ", ")
      // Ensure calm pause after conversational connectors if not already followed by comma
      .replace(
        /\b(sin embargo|no obstante|por eso|es decir|además|ahora bien)\s+(?!,)/gi,
        "$1, "
      )
      .replace(/,\s*,+/g, ", ")
      .replace(/\s+/g, " ")
      .trim();
  };

  /**
   * Speaks Nora's response out loud using Web Speech API (`window.speechSynthesis`)
   * with a strictly pinned LATAM / Argentina voice (`selectedVoiceRef`) and a calm,
   * unhurried radio cadence (`rate = 0.92`, `pitch = 0.98`).
   */
  const speakNoraAloud = (
    textToSpeak: string,
    _ignoredLangCode?: string,
    _speechRate: number = 0.92,
    _pitchShift: number = 0.98
  ) => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      // Pause mic recognition while Nora speaks so her own speaker output isn't captured
      if (recognitionRef.current && isListeningMic) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore stop race
        }
      }

      // Pause previous cloud audio stream if playing
      if (cloudAudioRef.current) {
        try {
          cloudAudioRef.current.pause();
          cloudAudioRef.current.currentTime = 0;
        } catch {
          // Ignore
        }
      }
      if ("speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore
        }
      }

      const cleanForTts = cleanPhoneticsForLatamTTS(textToSpeak);
      if (!cleanForTts) return;

      const audioUrl = `/api/nexora/radio-tts?text=${encodeURIComponent(cleanForTts)}`;
      let audio = cloudAudioRef.current;
      if (!audio) {
        audio = new Audio();
        cloudAudioRef.current = audio;
      }
      audio.src = audioUrl;

      const handleSpeechDone = () => {
        lastNoraSpeechEndMsRef.current = Date.now();
        isNoraSpeakingRef.current = false;
        setIsNoraSpeaking(false);
        if (openMicDuplexModeRef.current) {
          setTimeout(() => {
            if (openMicDuplexModeRef.current && !isNoraSpeakingRef.current) {
              startCabinRecognition(true);
            }
          }, 550);
        }
      };

      audio.onplay = () => {
        isNoraSpeakingRef.current = true;
        setIsNoraSpeaking(true);
      };
      audio.onended = handleSpeechDone;
      audio.onerror = () => {
        handleSpeechDone();
      };

      audio.play().catch(() => {
        handleSpeechDone();
      });
    } catch {
      isNoraSpeakingRef.current = false;
      setIsNoraSpeaking(false);
    }
  };

  const pumpSentenceAudioQueue = () => {
    if (typeof window === "undefined") return;
    if (isSentenceQueuePlayingRef.current) return;
    const next = sentenceQueueRef.current.find((i) => i.status === "ready");
    if (!next) {
      if (
        isStreamDoneRef.current &&
        sentenceQueueRef.current.every((i) => i.status === "played" || i.status === "error")
      ) {
        lastNoraSpeechEndMsRef.current = Date.now();
        lastInteractionEpochMsRef.current = Date.now();
        isNoraSpeakingRef.current = false;
        setIsNoraSpeaking(false);
        if (openMicDuplexModeRef.current) {
          setTimeout(() => {
            if (openMicDuplexModeRef.current && !isNoraSpeakingRef.current) {
              startCabinRecognition(true);
            }
          }, 550);
        }
      }
      return;
    }

    isSentenceQueuePlayingRef.current = true;
    isNoraSpeakingRef.current = true;
    setIsNoraSpeaking(true);
    cloudAudioRef.current = next.audio;
    next.status = "playing";

    next.audio.onplay = () => {
      isNoraSpeakingRef.current = true;
      setIsNoraSpeaking(true);
    };

    next.audio.onended = () => {
      next.status = "played";
      isSentenceQueuePlayingRef.current = false;
      lastNoraSpeechEndMsRef.current = Date.now();
      lastInteractionEpochMsRef.current = Date.now();
      pumpSentenceAudioQueue();
    };

    next.audio.onerror = () => {
      next.status = "error";
      isSentenceQueuePlayingRef.current = false;
      pumpSentenceAudioQueue();
    };

    next.audio.play().catch(() => {
      next.status = "error";
      isSentenceQueuePlayingRef.current = false;
      pumpSentenceAudioQueue();
    });
  };

  const queueSentenceForCloudPlayback = (sentenceText: string) => {
    if (typeof window === "undefined") return;
    const clean = cleanPhoneticsForLatamTTS(sentenceText);
    if (!clean || clean.length < 2) return;

    const audioUrl = `/api/nexora/radio-tts?text=${encodeURIComponent(clean)}`;
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = audioUrl;

    sentenceQueueRef.current.push({
      id: `sq-${Date.now()}-${Math.random()}`,
      sentenceText: clean,
      audio,
      status: "ready",
    });

    pumpSentenceAudioQueue();
  };

  const stopNoraSpeech = () => {
    sentenceQueueRef.current.forEach((item) => {
      try {
        item.audio.pause();
        item.audio.currentTime = 0;
      } catch {}
    });
    sentenceQueueRef.current = [];
    isSentenceQueuePlayingRef.current = false;
    isStreamDoneRef.current = true;

    if (cloudAudioRef.current) {
      try {
        cloudAudioRef.current.pause();
        cloudAudioRef.current.currentTime = 0;
      } catch {
        // Ignore
      }
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
    lastNoraSpeechEndMsRef.current = Date.now();
    lastInteractionEpochMsRef.current = Date.now();
    isNoraSpeakingRef.current = false;
    setIsNoraSpeaking(false);
    if (openMicDuplexModeRef.current) {
      setTimeout(() => {
        if (openMicDuplexModeRef.current && !isNoraSpeakingRef.current) {
          startCabinRecognition(true);
        }
      }, 550);
    }
  };

  /**
   * Direct DOM updater for the Live VU-Meter bar and label.
   * Manipulates `ref.current.style` and `textContent` directly (throttled to ~6 Hz for text)
   * without triggering any React state re-renders, eliminating 60 FPS screen flicker/jitter.
   */
  const syncVuDomElements = (
    levelPct: number,
    micActive: boolean,
    forceTextUpdate: boolean = false
  ) => {
    const clamped = Math.max(0, Math.min(100, Math.round(levelPct)));
    if (vuBarFillRef.current) {
      vuBarFillRef.current.style.width = `${Math.max(micActive ? 4 : 0, clamped)}%`;
      vuBarFillRef.current.style.background =
        clamped > 15
          ? "linear-gradient(90deg, #06b6d4 0%, #3b82f6 70%, #10b981 100%)"
          : micActive
          ? "linear-gradient(90deg, #06b6d4 0%, #3b82f6 100%)"
          : "#334155";
    }

    // Automatic Sound Cart Ducking:
    // If Nora is speaking OR studio mic captures voice (levelPct > 16), duck the bed!
    const shouldDuck = isNoraSpeakingRef.current || clamped > 16;
    if (soundCartBedGainRef.current && soundCartCtxRef.current) {
      if (shouldDuck !== isDuckingActiveRef.current) {
        isDuckingActiveRef.current = shouldDuck;
        setIsDuckingActive(shouldDuck);
        const targetGain = shouldDuck
          ? Math.max(0.06, soundCartBedVolumeRef.current * 0.22)
          : soundCartBedVolumeRef.current;
        soundCartBedGainRef.current.gain.setTargetAtTime(
          targetGain,
          soundCartCtxRef.current.currentTime,
          shouldDuck ? 0.08 : 0.35
        );
      }
    }

    const now = Date.now();
    if (!forceTextUpdate && now - lastVuDomUpdateMsRef.current < 175) {
      return;
    }
    lastVuDomUpdateMsRef.current = now;

    if (vuLabelTextRef.current) {
      vuLabelTextRef.current.textContent =
        clamped > 15
          ? `Escuchando... ${clamped}%`
          : micActive
          ? "Micrófono activo"
          : "Micrófono en reposo";
    }

    if (vuVoicePillRef.current) {
      vuVoicePillRef.current.className = `w-2 h-2 rounded-full transition-colors duration-200 ${
        clamped > 15
          ? "bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]"
          : micActive
          ? "bg-emerald-400"
          : "bg-slate-500"
      }`;
    }
  };

  /**
   * Central dispatcher for captured spoken transcripts (from either Web Speech API or
   * the MediaRecorder -> Groq Whisper / SenseVoice STT fallback).
   */
  const dispatchCapturedSpeechTranscript = (rawTranscript: string) => {
    const transcript = (rawTranscript || "").trim();
    if (!transcript) return;

    // 1. Acoustic Echo Guard: ignore audio while Nora speaks or during 650ms room reverberation tail
    if (
      isNoraSpeakingRef.current ||
      Date.now() - lastNoraSpeechEndMsRef.current < 650
    ) {
      return;
    }

    // 2. Ambient Noise & False-Positive Gate (filters throat clearing, table bumps, "eh/ah/mm")
    if (isAmbientNoiseOrFalsePositive(transcript)) {
      return;
    }

    if (interimBannerDomRef.current) {
      interimBannerDomRef.current.textContent = `🎙️ Frase recibida: "${transcript.slice(0, 65)}"`;
    }

    const now = Date.now();
    const isBoothActive = openMicDuplexModeRef.current || isListeningMicRef.current;

    if (isBoothActive) {
      // Continuous booth conversation: dispatch automatically upon 2.5s silence completion.
      // NO wake-word "Nora" required, NO getting stuck in CABINA_ESCUCHA_PASIVA.
      lastInteractionEpochMsRef.current = now;
      consoleInputRef.current = "";
      setConsoleInput("");
      onAppendLog(
        "CABINA_CONTINUA",
        `Voz en cabina recibida (silencio 2.5s cumplido): "${transcript.slice(0, 80)}" -> Procesando automáticamente.`,
        "SUCCESS"
      );
      void handleSendRadioDialogue(transcript);
    } else {
      lastInteractionEpochMsRef.current = now;
      consoleInputRef.current = "";
      setConsoleInput("");
      void handleSendRadioDialogue(transcript);
    }
  };

  /**
   * Initializes the native `AudioContext` + `AnalyserNode` Live VU-Meter (`requestAnimationFrame` loop)
   * using direct DOM references (`vuBarFillRef`, `vuLabelTextRef`) so React NEVER re-renders at 60 FPS.
   */
  const startLiveVuMeterAndHardwareStream = async () => {
    if (typeof window === "undefined") return;

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicHardwareWarning(
        "El navegador bloqueó el micrófono por origen HTTP LAN no seguro. Abrí http://localhost:3005/nexora en esta PC para habilitar el hardware de audio."
      );
      onAppendLog(
        "SENSEVOICE_MIC_STT",
        "Origen no seguro detectado (sin navigator.mediaDevices). Usá http://localhost:3005/nexora para habilitar el micrófono.",
        "WARN"
      );
      return;
    }

    try {
      setMicHardwareWarning(null);
      if (!studioAudioStreamRef.current) {
        studioAudioStreamRef.current =
          await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              channelCount: 1,
            },
          });
      }

      const stream = studioAudioStreamRef.current;
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (
          !audioContextRef.current ||
          audioContextRef.current.state === "closed"
        ) {
          audioContextRef.current = new AudioCtx();
        }
        const audioCtx = audioContextRef.current;
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyserNodeRef.current = analyser;

        const timeData = new Uint8Array(analyser.fftSize);

        if (vuAnimFrameRef.current) {
          cancelAnimationFrame(vuAnimFrameRef.current);
        }

        const updateVuMeterLoop = () => {
          if (!analyserNodeRef.current || !isListeningMicRef.current) {
            syncVuDomElements(0, false, true);
            return;
          }
          analyserNodeRef.current.getByteTimeDomainData(timeData);
          let sumSquares = 0;
          for (let i = 0; i < timeData.length; i++) {
            const centered = (timeData[i] - 128) / 128;
            sumSquares += centered * centered;
          }
          const rms = Math.sqrt(sumSquares / timeData.length);
          const levelPct = Math.min(100, Math.round(rms * 340));

          // Direct DOM update (zero React re-renders)
          syncVuDomElements(levelPct, true, false);

          // Voice Activity Detection (VAD) for MediaRecorder -> Groq Whisper fallback
          const now = Date.now();
          if (levelPct > 15 && !isNoraSpeakingRef.current) {
            voiceSpokeDuringChunkRef.current = true;
            silenceSinceMsRef.current = now;
          } else if (
            voiceSpokeDuringChunkRef.current &&
            levelPct <= 10 &&
            now - silenceSinceMsRef.current > 2500
          ) {
            voiceSpokeDuringChunkRef.current = false;
            if (
              now - lastSpeechRecResultMsRef.current > 2500 &&
              mediaRecorderRef.current &&
              mediaRecorderRef.current.state === "recording"
            ) {
              try {
                mediaRecorderRef.current.stop();
              } catch {
                // Ignore stop race
              }
            }
          }

          vuAnimFrameRef.current = requestAnimationFrame(updateVuMeterLoop);
        };

        vuAnimFrameRef.current = requestAnimationFrame(updateVuMeterLoop);
      }

      // Start background MediaRecorder for automatic Groq Whisper STT fallback when Web Speech API doesn't fire
      if (typeof MediaRecorder !== "undefined") {
        const startFallbackRecorder = () => {
          if (!studioAudioStreamRef.current || !isListeningMicRef.current) return;
          try {
            recordedChunksRef.current = [];
            const recorder = new MediaRecorder(studioAudioStreamRef.current);
            recorder.ondataavailable = (ev) => {
              if (ev.data && ev.data.size > 0) {
                recordedChunksRef.current.push(ev.data);
              }
            };
            recorder.onstop = async () => {
              const chunks = [...recordedChunksRef.current];
              recordedChunksRef.current = [];
              const now = Date.now();
              if (
                chunks.length > 0 &&
                now - lastSpeechRecResultMsRef.current > 2500 &&
                !isNoraSpeakingRef.current
              ) {
                const audioBlob = new Blob(chunks, {
                  type: recorder.mimeType || "audio/webm",
                });
                if (audioBlob.size > 1500) {
                  try {
                    const form = new FormData();
                    form.append("file", audioBlob, "studio_mic.webm");
                    const res = await fetch("/api/nexora/radio-stt", {
                      method: "POST",
                      body: form,
                    });
                    if (res.ok) {
                      const sttData = (await res.json()) as {
                        transcript?: string;
                        provider?: string;
                      };
                      const whisperText = (sttData.transcript || "").trim();
                      if (
                        whisperText &&
                        now - lastSpeechRecResultMsRef.current > 2500
                      ) {
                        lastSpeechRecResultMsRef.current = Date.now();
                        onAppendLog(
                          "WHISPER_STT_FALLBACK",
                          `Transcripción hardware (${sttData.provider || "Whisper"}): "${whisperText.slice(0, 80)}"`,
                          "SUCCESS"
                        );
                        dispatchCapturedSpeechTranscript(whisperText);
                      }
                    }
                  } catch {
                    // Ignore fallback network error
                  }
                }
              }
              if (isListeningMicRef.current && studioAudioStreamRef.current) {
                startFallbackRecorder();
              }
            };
            mediaRecorderRef.current = recorder;
            recorder.start();
          } catch {
            // Ignore MediaRecorder init error
          }
        };
        startFallbackRecorder();
      }
    } catch (err: any) {
      setMicHardwareWarning(
        `No se pudo acceder al micrófono (${err?.name || "Permiso denegado"}). Verificá el ícono de candado/micrófono en la barra del navegador o usá http://localhost:3005/nexora.`
      );
    }
  };

  const releaseHardwareStudioAudioStream = () => {
    if (vuAnimFrameRef.current) {
      cancelAnimationFrame(vuAnimFrameRef.current);
      vuAnimFrameRef.current = null;
    }
    syncVuDomElements(0, false, true);
    if (interimBannerDomRef.current) {
      interimBannerDomRef.current.textContent =
        "🎙️ Listo para transcribir en vivo...";
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.onstop = null;
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch {
        // Ignore
      }
      mediaRecorderRef.current = null;
    }
    if (studioAudioStreamRef.current) {
      try {
        studioAudioStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      } catch {
        // Ignore track stop errors
      }
      studioAudioStreamRef.current = null;
    }
  };

  /**
   * Starts Web Speech API recognition directly inside a user-gesture event (`onClick`).
   * Configured with `lang = 'es-AR'`, `interimResults = true`, `maxAlternatives = 1`, `continuous = true`.
   */
  const startCabinRecognition = (duplexContinuous: boolean) => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    isListeningMicRef.current = true;
    setIsListeningMic(true);
    syncVuDomElements(0, true, true);

    // Initialize live AudioContext + AnalyserNode VU-Meter & hardware DSP stream in parallel
    void startLiveVuMeterAndHardwareStream();

    if (!SpeechRec) {
      onAppendLog(
        "SENSEVOICE_MIC_STT",
        "Web Speech API no disponible; activo fallback automático por hardware (AudioContext + Whisper STT).",
        "INFO"
      );
      return;
    }

    // Explicitly release any previous recognition instance before starting a new session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.abort();
        recognitionRef.current.stop();
      } catch {
        // Ignore previous instance abort/stop
      }
    }

    const rec = new SpeechRec();
    rec.lang = "es-AR";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = true;

    rec.onstart = () => {
      isListeningMicRef.current = true;
      setIsListeningMic(true);
      syncVuDomElements(0, true, true);
    };

    rec.onresult = (event: any) => {
      // Acoustic Echo Guard: ignore audio while Nora speaks or during 650ms room reverberation tail
      if (
        isNoraSpeakingRef.current ||
        Date.now() - lastNoraSpeechEndMsRef.current < 650
      ) {
        return;
      }

      lastSpeechRecResultMsRef.current = Date.now();

      let interimPiece = "";
      let newlyFinalPiece = "";

      const startIdx =
        typeof event.resultIndex === "number" ? event.resultIndex : 0;
      for (let i = startIdx; i < (event.results?.length || 0); i++) {
        const resItem = event.results[i];
        const piece = (resItem?.[0]?.transcript || "").trim();
        if (!piece) continue;
        if (resItem.isFinal) {
          newlyFinalPiece += (newlyFinalPiece ? " " : "") + piece;
        } else {
          interimPiece += (interimPiece ? " " : "") + piece;
        }
      }

      if (newlyFinalPiece) {
        accumulatedSpeechTranscriptRef.current = (
          accumulatedSpeechTranscriptRef.current +
          " " +
          newlyFinalPiece
        ).trim();
      }
      latestInterimSpeechRef.current = interimPiece;

      const liveSpokenDisplay = (
        accumulatedSpeechTranscriptRef.current +
        " " +
        interimPiece
      ).trim();

      // Show preliminary transcription directly in the fixed DOM banner (zero layout shift)
      if (liveSpokenDisplay && interimBannerDomRef.current) {
        interimBannerDomRef.current.textContent = `🗣️ Escuchando: "${liveSpokenDisplay}"`;
      }

      // Continuous 2.5s silence window: restart timer on every incoming speech chunk
      if (speechSilenceTimerRef.current) {
        clearTimeout(speechSilenceTimerRef.current);
      }
      if (interimSpeechTimeoutRef.current) {
        clearTimeout(interimSpeechTimeoutRef.current);
      }

      speechSilenceTimerRef.current = setTimeout(() => {
        const fullTranscript = (
          accumulatedSpeechTranscriptRef.current +
          " " +
          latestInterimSpeechRef.current
        ).trim();

        // Clear accumulation buffers
        accumulatedSpeechTranscriptRef.current = "";
        latestInterimSpeechRef.current = "";

        if (
          !isNoraSpeakingRef.current &&
          fullTranscript.length > 2 &&
          (openMicDuplexModeRef.current || isListeningMicRef.current)
        ) {
          dispatchCapturedSpeechTranscript(fullTranscript);

          if (!duplexContinuous && !openMicDuplexModeRef.current) {
            try {
              rec.onend = null;
              rec.stop();
            } catch {
              // Ignore
            }
            isListeningMicRef.current = false;
            setIsListeningMic(false);
            releaseHardwareStudioAudioStream();
          }
        }
      }, 2500);
    };

    rec.onerror = (event: any) => {
      const errCode = String(event?.error || "");
      if (errCode === "no-speech" || errCode === "aborted") {
        return;
      }
      if (errCode === "not-allowed" || errCode === "service-not-allowed") {
        setMicHardwareWarning(
          `Permiso de voz bloqueado (${errCode}). Asegurate de abrir http://localhost:3005/nexora y permitir el acceso al micrófono.`
        );
        onAppendLog(
          "SENSEVOICE_MIC_STT",
          `Aviso de micrófono (${errCode}): abrí http://localhost:3005/nexora o habilitá el permiso de micrófono.`,
          "WARN"
        );
      }
    };

    rec.onend = () => {
      if (
        (openMicDuplexModeRef.current || isListeningMicRef.current) &&
        !isNoraSpeakingRef.current
      ) {
        setTimeout(() => {
          if (
            (openMicDuplexModeRef.current || isListeningMicRef.current) &&
            !isNoraSpeakingRef.current
          ) {
            try {
              rec.start();
              setIsListeningMic(true);
            } catch {
              // Ignore InvalidStateError if recognition has already started
            }
          }
        }, 350);
      } else {
        setIsListeningMic(false);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListeningMic(true);
    } catch (err: any) {
      if (err?.name === "InvalidStateError") {
        setIsListeningMic(true);
      }
    }
  };

  /**
   * Toggles single-turn Web Speech API + Hardware VU-Meter microphone recognition
   * directly inside the synchronous `onClick` user gesture.
   */
  const handleToggleMicrophone = () => {
    if (isListeningMic) {
      isListeningMicRef.current = false;
      openMicDuplexModeRef.current = false;
      setOpenMicDuplexMode(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      releaseHardwareStudioAudioStream();
      setIsListeningMic(false);
      return;
    }
    startCabinRecognition(openMicDuplexModeRef.current);
  };

  /**
   * Toggles Continuous Open-Mic Duplex Mode (`[🎤 Modo Cabina Abierta: ON/OFF]`).
   * Executes `startCabinRecognition(true)` directly inside the synchronous `onClick` user gesture.
   */
  const handleToggleOpenMicDuplex = () => {
    const nextState = !openMicDuplexModeRef.current;
    openMicDuplexModeRef.current = nextState;
    setOpenMicDuplexMode(nextState);

    if (nextState) {
      isListeningMicRef.current = true;
      setIsListeningMic(true);
      onAppendLog(
        "SENSEVOICE_MIC_STT",
        "Modo Cabina Abierta (Dúplex) ACTIVO: hablá al micrófono (ej. 'Nora, ¿ahora me escuchás?')...",
        "SUCCESS"
      );
      startCabinRecognition(true);
    } else {
      isListeningMicRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.abort();
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      releaseHardwareStudioAudioStream();
      setIsListeningMic(false);
      onAppendLog(
        "SENSEVOICE_MIC_STT",
        "Modo Cabina Abierta: OFF (intervención sólo manual).",
        "INFO"
      );
    }
  };

  /**
   * Captures the current camera video frame to a Base64 JPEG URI (640x480 at 0.7 quality).
   */
  const captureCurrentCameraFrame = (): string | null => {
    if (typeof window === "undefined") return null;

    let video = videoPreviewRef.current;
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      if (typeof document !== "undefined") {
        const videos = Array.from(document.querySelectorAll("video")) as HTMLVideoElement[];
        const validVideo = videos.find(
          (v) => v.readyState >= 2 && v.videoWidth > 0 && v.videoHeight > 0
        );
        if (validVideo) {
          video = validVideo;
        }
      }
    }

    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn(
        `[NEXORA_VISION] Elemento <video> no listo para captura: readyState=${video?.readyState}, videoWidth=${video?.videoWidth}, videoHeight=${video?.videoHeight}`
      );
      return latestCameraFrameBase64Ref.current;
    }

    const canvas =
      visionCanvasRef.current ||
      (typeof document !== "undefined" ? document.createElement("canvas") : null);
    if (!canvas) {
      console.warn("[NEXORA_VISION] No hay canvas disponible");
      return latestCameraFrameBase64Ref.current;
    }

    try {
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.warn("[NEXORA_VISION] No se pudo inicializar contexto 2D del canvas");
        return latestCameraFrameBase64Ref.current;
      }
      ctx.drawImage(video, 0, 0, 640, 480);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
      latestCameraFrameBase64Ref.current = dataUrl;
      console.log("[NEXORA_VISION] Frame capturado bytes:", dataUrl.length);
      return dataUrl;
    } catch (err) {
      console.warn("[NEXORA_VISION] Excepción al capturar frame de video:", err);
      return latestCameraFrameBase64Ref.current;
    }
  };

  /**
   * Toggles the live studio webcam for vision grounding and samples keyframes at low frequency.
   */
  const handleToggleStudioCamera = async () => {
    if (studioCameraActive) {
      if (visionIntervalRef.current) {
        clearInterval(visionIntervalRef.current);
        visionIntervalRef.current = null;
      }
      if (studioCameraStreamRef.current) {
        studioCameraStreamRef.current.getTracks().forEach((t) => t.stop());
        studioCameraStreamRef.current = null;
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
      setStudioCameraActive(false);
      latestCameraFrameBase64Ref.current = null;
      onAppendLog("VISION_GROUNDING", "Cámara de cabina desactivada.", "INFO");
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
        });
        studioCameraStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          try {
            await videoPreviewRef.current.play();
          } catch {
            // Autoplay catch
          }
        }
        setStudioCameraActive(true);
        onAppendLog(
          "VISION_GROUNDING",
          "Cámara de cabina activada (Ojos de Nora en vivo a 720p).",
          "SUCCESS"
        );

        // Low-frequency sampling (1 frame every 3.5 seconds) to keep local CPU and network light
        visionIntervalRef.current = setInterval(async () => {
          const dataUrl = captureCurrentCameraFrame();
          if (!dataUrl) return;

          try {
            const res = await fetch("/api/nexora/vision-grounding", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ frame_data_url: dataUrl }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.visual_event) {
                setLastVisualObservation(data.description);
                const updated = [
                  ...visualStudioContextRef.current,
                  data.visual_event,
                ].slice(-4);
                visualStudioContextRef.current = updated;
                setVisualStudioContext(updated);
              }
            }
          } catch {
            // Non-blocking drop
          }
        }, 3500);
      } catch (err: any) {
        onAppendLog(
          "VISION_GROUNDING",
          `Aviso de cámara: ${err?.message || "acceso bloqueado o no disponible"}.`,
          "WARN"
        );
      }
    }
  };

  /**
   * Adds an editorial note or uploaded memo to the Shared Desk Board.
   */
  const handleAddDeskBriefingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeskTitle.trim()) return;
    setIsUploadingDeskItem(true);
    try {
      const res = await fetch("/api/nexora/desk-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newDeskTitle.trim(),
          lead: newDeskLead.trim(),
          category: newDeskCategory,
          sourceType: "MANUAL_UPLOAD",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDeskBriefingItems((prev) => [data.item, ...prev]);
        setNewDeskTitle("");
        setNewDeskLead("");
        onAppendLog(
          "DESK_BRIEFING",
          `Material en mesa incorporado: "${data.item.title.slice(0, 50)}..."`,
          "SUCCESS"
        );
      }
    } finally {
      setIsUploadingDeskItem(false);
    }
  };

  /**
   * Manual button `[Dar Pase a Nora]`: immediately dispatches the exact phrase
   * currently in the input box or the latest phrase in passive studio memory.
   */
  const handleGiveFloorToNora = () => {
    const typed = (consoleInputRef.current || consoleInput).trim();
    if (typed) {
      consoleInputRef.current = "";
      setConsoleInput("");
      void handleSendRadioDialogue(typed);
      return;
    }
    const recentPassive = passiveTableContextRef.current;
    if (recentPassive.length > 0) {
      const lastCapturedPhrase = recentPassive[recentPassive.length - 1];
      void handleSendRadioDialogue(lastCapturedPhrase);
      return;
    }
    const cuePrompt = `Nora, te damos el pase en el aire de ${stationConfigRef.current.programName} con ${stationConfigRef.current.hostNames}: ¿qué análisis sumás a la mesa en este momento?`;
    void handleSendRadioDialogue(cuePrompt);
  };

  /**
   * Sends the human host's message to `/api/nexora/radio-chat` with real-time SSE streaming,
   * sentence-by-sentence TTS audio pipelining, and continuous conversation tracking.
   */
  const handleSendRadioDialogue = async (overrideText?: string) => {
    const messageText = (
      overrideText ??
      consoleInputRef.current ??
      consoleInput
    ).trim();
    if (!messageText || isSendingToNoraRef.current) return;

    // Immediately clear input, pending silence timers and record interaction timestamp
    if (speechSilenceTimerRef.current) {
      clearTimeout(speechSilenceTimerRef.current);
      speechSilenceTimerRef.current = null;
    }
    accumulatedSpeechTranscriptRef.current = "";
    latestInterimSpeechRef.current = "";

    consoleInputRef.current = "";
    setConsoleInput("");
    isSendingToNoraRef.current = true;
    setIsSendingToNora(true);
    lastInteractionEpochMsRef.current = Date.now();

    // Capture the camera frame in real-time at the moment the operator finishes speaking
    const currentCameraFrame = studioCameraActive
      ? (captureCurrentCameraFrame() || latestCameraFrameBase64Ref.current)
      : null;
    console.log("[NEXORA_VISION] Frame capturado bytes:", currentCameraFrame?.length || 0);

    const activeCfg = stationConfigRef.current;
    const nowStr = new Date().toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    // Capture the last 10 live turns from dialogueHistoryRef
    const priorHistoryPayload = dialogueHistoryRef.current
      .filter((m) => m.id !== "turn-init-1" && !m.degraded)
      .slice(-10)
      .map((m) => ({
        role: (m.speaker === "LOCUTOR_HUMANO" ? "user" : "assistant") as "user" | "assistant",
        content: m.text,
      }));

    const capturedPassiveContext = [...passiveTableContextRef.current];

    const userTurn: OnAirDialogueMessage = {
      id: `turn-u-${Date.now()}`,
      speaker: "LOCUTOR_HUMANO",
      speakerLabel: `${activeCfg.hostNames || "Locutor Humano"} (Cabina)`,
      text: messageText,
      timestamp: nowStr,
    };

    const noraTurnId = `turn-n-${Date.now()}`;
    const noraTurn: OnAirDialogueMessage = {
      id: noraTurnId,
      speaker: "NORA_CO_HOST",
      speakerLabel: `Nora (${activeCfg.programName})`,
      text: "",
      timestamp: nowStr,
      modelBadge: "Transmitiendo...",
    };

    const updatedWithUserAndNora = [...dialogueHistoryRef.current, userTurn, noraTurn];
    dialogueHistoryRef.current = updatedWithUserAndNora;
    setDialogueHistory(updatedWithUserAndNora);

    onAppendLog(
      "RADIO_CO_HOST_IN",
      `${activeCfg.hostNames} -> Nora [${activeCfg.programName} | Turno #${
        Math.floor(priorHistoryPayload.length / 2) + 1
      }]: "${messageText.slice(0, 80)}"`,
      "INFO"
    );

    // Reset sentence audio queue for low-latency streaming playback
    sentenceQueueRef.current = [];
    isSentenceQueuePlayingRef.current = false;
    isStreamDoneRef.current = false;

    try {
      const res = await fetch("/api/nexora/radio-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "X-Nexora-Tenant": "NEXORA_ONE_ENGINE",
        },
        body: JSON.stringify({
          message: messageText,
          station_config: activeCfg,
          passive_context: capturedPassiveContext,
          history: priorHistoryPayload,
          desk_briefing: deskBriefingItems,
          visual_context: visualStudioContextRef.current,
          visual_frame: currentCameraFrame,
          image_base64: currentCameraFrame,
          stream: true,
        }),
      });

      const isStream = (res.headers.get("content-type") || "").includes("text/event-stream");

      if (isStream && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedReply = "";
        let unspokenSentenceBuffer = "";
        let sseBuffer = "";
        let usedModelBadge = "Groq LPU (Stream)";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(trimmed.slice(6));
              if (payload.type === "meta") {
                if (payload.model_used) usedModelBadge = payload.model_used;
              } else if (payload.type === "delta" && typeof payload.text === "string") {
                accumulatedReply += payload.text;
                unspokenSentenceBuffer += payload.text;

                // Update text live in the chat bubble
                setDialogueHistory((prev) =>
                  prev.map((turn) =>
                    turn.id === noraTurnId ? { ...turn, text: accumulatedReply } : turn
                  )
                );

                // Sentence boundary detection: trigger instant TTS at the first punctuation mark
                const match = unspokenSentenceBuffer.match(/^(.*?[.?!;\n])(?:\s+|$)([\s\S]*)$/);
                if (match) {
                  const sentence = match[1].trim();
                  unspokenSentenceBuffer = match[2] || "";
                  if (sentence && ttsEnabled) {
                    queueSentenceForCloudPlayback(sentence);
                  }
                }
              } else if (payload.type === "done") {
                if (payload.model_used) usedModelBadge = payload.model_used;
                if (payload.full_reply) accumulatedReply = payload.full_reply;
              }
            } catch {
              // Ignore partial JSON
            }
          }
        }

        isStreamDoneRef.current = true;

        // Queue any remaining tail text
        if (unspokenSentenceBuffer.trim() && ttsEnabled) {
          queueSentenceForCloudPlayback(unspokenSentenceBuffer.trim());
          unspokenSentenceBuffer = "";
        }

        // Finalize Nora dialogue message
        setDialogueHistory((prev) =>
          prev.map((turn) =>
            turn.id === noraTurnId
              ? {
                  ...turn,
                  text: accumulatedReply || "Acá te escucho perfecto en cabina, sigamos al aire.",
                  modelBadge: `STREAM • ${usedModelBadge}`,
                }
              : turn
          )
        );

        passiveTableContextRef.current = [];
        setPassiveTableContext([]);

        onAppendLog(
          "NORA_CO_HOST_ON_AIR",
          `Nora al aire (Stream) [${activeCfg.programName}]: "${accumulatedReply.slice(0, 90)}..."`,
          "SUCCESS"
        );
      } else {
        // Fallback for non-streaming response
        const data = await res.json();
        const noraReply = data.reply || "Acá estoy firme al aire en la mesa con vos.";
        setDialogueHistory((prev) =>
          prev.map((turn) =>
            turn.id === noraTurnId
              ? {
                  ...turn,
                  text: noraReply,
                  modelBadge: `${data.emotion_state || "WARM_EMPATHIC"} • ${data.model_used || "LLM"}`,
                }
              : turn
          )
        );

        passiveTableContextRef.current = [];
        setPassiveTableContext([]);

        if (ttsEnabled) {
          speakNoraAloud(noraReply, data.spoken_language, data.speech_rate, data.pitch_shift);
        }
      }
    } catch {
      const firstHost =
        (activeCfg.hostNames || "Equipo").split(/\s+y\s+|,/)[0].trim() ||
        "Equipo";
      const fallbackReply = `Perdón ${firstHost}, se nos cortó un segundo la línea con cabina. ¿Me repetís la pregunta?`;
      onAppendLog(
        "LLM_INFERENCE_ERROR",
        "Error de red al contactar /api/nexora/radio-chat.",
        "WARN"
      );
      setDialogueHistory((prev) =>
        prev.map((turn) =>
          turn.id === noraTurnId
            ? {
                ...turn,
                text: fallbackReply,
                modelBadge: "⚠️ SIN CONEXIÓN CON EL SERVIDOR",
                degraded: true,
              }
            : turn
        )
      );
      if (ttsEnabled) {
        speakNoraAloud(fallbackReply);
      }
    } finally {
      isSendingToNoraRef.current = false;
      setIsSendingToNora(false);
    }
  };

  /**
   * Initializes or returns the Sound Cart Web Audio context and calibrated gain hierarchy.
   */
  const initSoundCartContextIfNeeded = (): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!soundCartCtxRef.current || soundCartCtxRef.current.state === "closed") {
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = soundCartMasterVolumeRef.current;
      master.connect(ctx.destination);

      const bedGain = ctx.createGain();
      bedGain.gain.value = soundCartBedVolumeRef.current;
      bedGain.connect(master);

      soundCartCtxRef.current = ctx;
      soundCartMasterGainRef.current = master;
      soundCartBedGainRef.current = bedGain;
    }

    if (soundCartCtxRef.current.state === "suspended") {
      soundCartCtxRef.current.resume();
    }
    return soundCartCtxRef.current;
  };

  /**
   * Starts or stops the loopable background bed with automatic ducking on voice activity.
   */
  const handleToggleSoundCartBed = () => {
    const ctx = initSoundCartContextIfNeeded();
    if (!ctx) return;

    if (soundCartPlayingBed) {
      soundCartBedSourcesRef.current.forEach((src) => {
        try {
          (src as any).stop?.();
          src.disconnect();
        } catch {
          // Ignore
        }
      });
      soundCartBedSourcesRef.current = [];
      setSoundCartPlayingBed(false);
      onAppendLog("SOUND_CART", "Cortina de fondo detenida", "INFO");
    } else {
      const freqs = [220, 261.63, 329.63, 392.0]; // Am7 chord pulse
      const sources: AudioNode[] = [];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(750, ctx.currentTime);

        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.4 + idx * 0.12, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);

        const voiceGain = ctx.createGain();
        voiceGain.gain.setValueAtTime(0.18, ctx.currentTime);

        lfo.connect(lfoGain);
        lfoGain.connect(voiceGain.gain);

        osc.connect(filter);
        filter.connect(voiceGain);
        voiceGain.connect(soundCartBedGainRef.current!);

        osc.start();
        lfo.start();
        sources.push(osc, lfo);
      });

      soundCartBedSourcesRef.current = sources;
      setSoundCartPlayingBed(true);
      onAppendLog(
        "SOUND_CART",
        "Cortina de fondo en el aire (-14 LUFS) con ducking automático activo",
        "SUCCESS"
      );
    }
  };

  /**
   * Fires instant procedural radio sound effects (sweepers, news stinger, tension, applause).
   */
  const handlePlaySoundCartStinger = (
    type: "NEWS" | "SWEEPER" | "APPLAUSE" | "TENSION"
  ) => {
    const ctx = initSoundCartContextIfNeeded();
    if (!ctx) return;
    const master = soundCartMasterGainRef.current;
    if (!master) return;

    setLastTriggeredStinger(type);
    setTimeout(() => setLastTriggeredStinger(null), 2400);

    const now = ctx.currentTime;

    if (type === "NEWS") {
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.28, now + i * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.65);

        osc.connect(gain);
        gain.connect(master);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.7);
      });
      onAppendLog("SOUND_CART", "Disparada ráfaga: ÚLTIMO MOMENTO / FLASH NOTICIAS", "INFO");
    } else if (type === "SWEEPER") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(1300, now + 0.6);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      const bell = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bell.type = "triangle";
      bell.frequency.setValueAtTime(1760, now + 0.55);
      bellGain.gain.setValueAtTime(0.38, now + 0.55);
      bellGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

      osc.connect(gain);
      gain.connect(master);
      bell.connect(bellGain);
      bellGain.connect(master);

      osc.start(now);
      osc.stop(now + 0.85);
      bell.start(now + 0.55);
      bell.stop(now + 1.55);
      onAppendLog("SOUND_CART", "Disparado separador de bloque (Sweeper)", "INFO");
    } else if (type === "APPLAUSE") {
      const bufferSize = ctx.sampleRate * 2.2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1200, now);
      filter.Q.setValueAtTime(1.5, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.28, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.1);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      whiteNoise.start(now);
      onAppendLog("SOUND_CART", "Disparado efecto: Aplausos de estudio", "INFO");
    } else if (type === "TENSION") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(55, now);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(160, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.38, now + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.8);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + 2.9);
      onAppendLog("SOUND_CART", "Disparado efecto: Tensión de debate", "INFO");
    }
  };

  /**
   * Generates a musical jingle in Sound Designer mode and loads it into the audio player.
   */
  const handleGenerateJingle = async (e: React.FormEvent) => {
    e.preventDefault();
    const wavUrl = synthesizeJingleWavDataUrl(jingleDuration, jingleStyle);
    setGeneratedAudioUrl(wavUrl);
    const fname = `NXR-${Date.now().toString().slice(-5)}_${jingleStyle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")}_${jingleDuration}s.wav`;
    setLastGeneratedJingleName(fname);

    onAppendLog(
      "SOUND_DESIGNER_FFMPEG",
      `Jingle sintetizado (${jingleDuration}s, ${jingleStyle}) y masterizado a ${targetLufs} LUFS con sidechain ${sidechainDb} dB -> /nexora_audio/${fname} [By Nora]`,
      "SUCCESS"
    );

    await onDispatchAction({
      clientBrand: "Nexora Audio Master",
      positivePrompt: `[${jingleStyle} | ${jingleDuration}s] ${jingleDescription}`,
      correlationSuffix: "SNDMASTR",
    });
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Iniciando Cabina de Transmisión Nexora...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3.5 p-4 overflow-y-auto bg-slate-950/60">
      {/* =====================================================================
          MODE 1: RADIO & CO-HOST LIVE ("MESA DE RADIO EN VIVO")
         ===================================================================== */}
      {isRadio ? (
        <>
          {/* Top Radio Desk Banner: Strictly stacked in isolated flex-col rows (Zero Overlap, Zero Jitter) */}
          <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/30 flex flex-col gap-3 shadow-lg relative">
            {/* Row 1: Co-Host Avatar & Program Identity (Left) + Studio Controls (Right) */}
            <div className="w-full flex flex-wrap items-center justify-between gap-3 relative">
              <div className="flex items-center gap-3.5 min-w-0">
                {/* Nora's Official Profile Avatar inside the Radio Co-Host Console */}
                <div className="relative shrink-0 w-14 h-14">
                  <div
                    className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-colors ${
                      isNoraSpeaking
                        ? "border-cyan-400 shadow-md shadow-cyan-400/40"
                        : "border-emerald-400/70"
                    }`}
                  >
                    <img
                      src="/avatar-nora.png"
                      alt="Nora Co-Host On Air Avatar"
                      className="w-full h-full object-cover block"
                    />
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                      isNoraSpeaking
                        ? "bg-rose-600 text-white border-rose-300"
                        : "bg-emerald-600 text-white border-emerald-300"
                    }`}
                  >
                    {isNoraSpeaking ? "HABLANDO" : "ON AIR"}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                      {stationConfig.programName || "Panorama Central"}{" "}
                      {stationConfig.stationDial
                        ? `• ${stationConfig.stationDial}`
                        : ""}{" "}
                      — Nora (Co-Host)
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                      Mesa: {stationConfig.hostNames} ({stationConfig.tableStyle})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">
                    Voz Fijada (Pinned LATAM):{" "}
                    <span className="font-mono text-emerald-300">
                      {pinnedVoiceLabel}
                    </span>{" "}
                    • Wake-Word:{" "}
                    <span className="font-mono text-amber-300">
                      &quot;Nora&quot; / &quot;Che Nora&quot;
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={handleToggleOpenMicDuplex}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                    openMicDuplexMode
                      ? "bg-emerald-500/25 text-emerald-200 border-emerald-400 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50"
                  }`}
                  title="En ON, Nora escucha en bucle continuo y responde automáticamente al nombrarla ('Nora', 'Che Nora')"
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${
                      openMicDuplexMode ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                  <span>
                    {openMicDuplexMode
                      ? "🎤 Cabina Abierta: Escuchando en vivo"
                      : "🎤 Modo Cabina Abierta: OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleStudioCamera}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                    studioCameraActive
                      ? "bg-violet-500/25 text-violet-200 border-violet-400 shadow-md shadow-violet-500/20"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:border-violet-500/40"
                  }`}
                  title="Activa la cámara del estudio para que Nora observe el lenguaje corporal y eventos físicos de la mesa"
                >
                  {studioCameraActive ? (
                    <Camera size={13} className="text-violet-400 animate-pulse" />
                  ) : (
                    <CameraOff size={13} />
                  )}
                  <span>
                    {studioCameraActive
                      ? "📷 Ojos de Cabina: ON"
                      : "📷 Ojos de Cabina: OFF"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDeskBriefing((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                    showDeskBriefing
                      ? "bg-amber-500/25 text-amber-200 border-amber-400"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:border-amber-500/40"
                  }`}
                  title="Abre el pliego editorial compartido y material en mesa"
                >
                  <FileText size={13} />
                  <span>Material en Mesa ({deskBriefingItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowStationConfig((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                    showStationConfig
                      ? "bg-cyan-500/25 text-cyan-200 border-cyan-400"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/40"
                  }`}
                >
                  <Sliders size={13} />
                  <span>Configurar Programa</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isNoraSpeaking) stopNoraSpeech();
                    setTtsEnabled((v) => !v);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-colors ${
                    ttsEnabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{ttsEnabled ? "Voz de Nora: ACTIVA" : "Voz Muted"}</span>
                </button>

                {isNoraSpeaking && (
                  <button
                    type="button"
                    onClick={stopNoraSpeech}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square size={12} />
                    <span>Cortar Locución</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsLiveOnAir((v) => !v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
                    isLiveOnAir
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  <Radio size={14} />
                  <span>{isLiveOnAir ? "AIRE • 48kHz PCM" : "OFF AIR"}</span>
                </button>
              </div>
            </div>

            {/* Row 2: VU Meter Visual Sobrio */}
            <div className="w-full pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 relative">
              <div className="flex items-center gap-3 min-w-0">
                {/* Badge discreto de estado de micrófono */}
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800/90 text-xs text-slate-300 backdrop-blur-sm">
                  <span
                    ref={vuVoicePillRef}
                    className="w-2 h-2 rounded-full bg-slate-500 transition-colors duration-200"
                  />
                  <span
                    ref={vuLabelTextRef}
                    className="font-mono text-[11px] text-slate-300"
                  >
                    Micrófono en reposo
                  </span>
                </div>

                {/* Barra de progreso sutil con gradiente cyan/blue */}
                <div className="w-36 h-2 rounded-full bg-slate-950/90 border border-slate-800 overflow-hidden flex items-center p-0.5 relative">
                  <div
                    ref={vuBarFillRef}
                    className="h-full rounded-full transition-[width] duration-100"
                    style={{
                      width: "0%",
                      background: "linear-gradient(90deg, #06b6d4, #3b82f6)",
                    }}
                  />
                </div>
              </div>

              <div
                ref={interimBannerDomRef}
                className="text-xs font-mono text-cyan-200 bg-slate-950/90 border border-slate-800 px-2.5 py-1 rounded-lg truncate max-w-md min-w-[230px]"
              >
                🎙️ Listo para transcribir en vivo...
              </div>
            </div>

            {micHardwareWarning && (
              <div className="w-full px-3 py-2 rounded-xl bg-amber-950/60 border border-amber-400/50 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2 relative">
                <span>⚠️ {micHardwareWarning}</span>
                <a
                  href="http://localhost:3005/nexora"
                  className="px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-[11px] hover:bg-amber-300"
                >
                  Abrir en http://localhost:3005/nexora
                </a>
              </div>
            )}
          </div>

          {/* Offscreen video & canvas for studio vision grounding & live frame capture */}
          <canvas ref={visionCanvasRef} className="hidden" />
          <video
            ref={videoPreviewRef}
            autoPlay
            playsInline
            muted
            style={{
              position: "fixed",
              top: -9999,
              left: -9999,
              width: 640,
              height: 360,
              pointerEvents: "none",
              opacity: 0,
            }}
          />

          {/* Studio Vision Grounding Monitor (Ojos de Nora en Cabina) */}
          {studioCameraActive && (
            <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-violet-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-28 h-20 rounded-xl overflow-hidden bg-black border border-violet-500/50 relative shrink-0 shadow-md">
                  <video
                    ref={(el) => {
                      if (
                        el &&
                        studioCameraStreamRef.current &&
                        el.srcObject !== studioCameraStreamRef.current
                      ) {
                        el.srcObject = studioCameraStreamRef.current;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-rose-600/90 text-white text-[8px] font-mono font-bold animate-pulse">
                    LIVE CAM
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                      <Eye size={13} className="text-violet-400" />
                      <span>Percepción Visual Activa (Ojos de Nora en Mesa)</span>
                    </span>
                    <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-violet-500/20 text-violet-300 border border-violet-500/40">
                      720p // 1 FRAME / 3.2s
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1 font-mono italic">
                    {lastVisualObservation
                      ? `Nora observa: "${lastVisualObservation}"`
                      : "Sintonizando cámara... Nora percibe gestos y lenguaje corporal de la mesa."}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {visualStudioContext.slice(-2).map((tag, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-slate-950 border border-violet-500/30 text-violet-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shared Desk Board (Pliego Editorial en Mesa Compartido con Nora) */}
          {showDeskBriefing && (
            <div className="p-4 rounded-2xl bg-slate-900/95 border border-amber-500/40 space-y-3.5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <FileText size={15} />
                    <span>Pliego Editorial en Mesa (Compartido con Nora)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    {deskBriefingItems.length} Materiales Activos
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Nora lee este pliego en vivo para citar datos con familiaridad
                </span>
              </div>

              {/* Add / Upload Material Bar */}
              <form
                onSubmit={handleAddDeskBriefingItem}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-2"
              >
                <input
                  type="text"
                  value={newDeskTitle}
                  onChange={(e) => setNewDeskTitle(e.target.value)}
                  placeholder="Título de la nota, comunicado o cable..."
                  className="flex-1 min-w-[200px] rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <input
                  type="text"
                  value={newDeskLead}
                  onChange={(e) => setNewDeskLead(e.target.value)}
                  placeholder="Bajada o puntos clave para la mesa..."
                  className="w-64 rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <select
                  value={newDeskCategory}
                  onChange={(e) => setNewDeskCategory(e.target.value)}
                  className="rounded-lg bg-slate-900 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="ECONOMÍA">ECONOMÍA</option>
                  <option value="POLÍTICA">POLÍTICA</option>
                  <option value="SOCIEDAD">SOCIEDAD</option>
                  <option value="DEPORTES">DEPORTES</option>
                  <option value="COMUNICADO">COMUNICADO</option>
                </select>
                <button
                  type="submit"
                  disabled={isUploadingDeskItem || !newDeskTitle.trim()}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer disabled:opacity-50"
                >
                  + Sumar a la Mesa
                </button>
              </form>

              {/* Grid of Briefing Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                {deskBriefingItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {item.publishedAt}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {item.lead}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-emerald-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <span>En Mesa</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          void handleSendRadioDialogue(
                            `Nora, sobre la nota que tenemos acá en el pliego: "${item.title}". ¿Cuál es tu lectura para la mesa?`
                          );
                        }}
                        className="hover:underline text-cyan-300 font-bold"
                      >
                        Pedir Análisis al Aire →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* White-Label Broadcast Station Configuration Panel (Editable On-Air Identity) */}
          {showStationConfig && (
            <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-lg">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Nombre de la Radio / Dial
                </label>
                <input
                  type="text"
                  value={stationConfig.stationDial}
                  onChange={(e) =>
                    setStationConfig((prev) => ({
                      ...prev,
                      stationDial: e.target.value,
                    }))
                  }
                  placeholder="Ej: FM del Este 98.7, Radio Ciudad o vacío"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Nombre del Programa
                </label>
                <input
                  type="text"
                  value={stationConfig.programName}
                  onChange={(e) =>
                    setStationConfig((prev) => ({
                      ...prev,
                      programName: e.target.value,
                    }))
                  }
                  placeholder="Ej: Panorama Central, Primera Mañana"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Conductor(es) Principal(es)
                </label>
                <input
                  type="text"
                  value={stationConfig.hostNames}
                  onChange={(e) =>
                    setStationConfig((prev) => ({
                      ...prev,
                      hostNames: e.target.value,
                    }))
                  }
                  placeholder="Ej: Equipo del estudio o conductores"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">
                  Estilo de Mesa
                </label>
                <select
                  value={stationConfig.tableStyle}
                  onChange={(e) =>
                    setStationConfig((prev) => ({
                      ...prev,
                      tableStyle: e.target.value as BroadcastTableStyle,
                    }))
                  }
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 focus:border-cyan-400 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="Informativo Formal">Informativo Formal</option>
                  <option value="Debate Picante">Debate Picante</option>
                  <option value="Magazine Relajado">Magazine Relajado</option>
                </select>
              </div>
            </div>
          )}

          {/* Acoustic Waveform Monitor */}
          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <Volume2 size={14} className="text-cyan-400" />
                <span>
                  Modulación Acústica en Cabina (
                  {isNoraSpeaking
                    ? "Nora modulando al aire en vivo..."
                    : "En espera de intervención"}
                  )
                </span>
              </span>
              <span className="font-mono text-emerald-400">
                Master: -14.0 LUFS • Sidechain: -12.0 dB
              </span>
            </div>
            <div className="h-14 w-full bg-slate-950 rounded-xl border border-slate-800/90 px-3 py-2 flex items-end justify-between gap-1">
              {animatedBars.map((heightPct, idx) => (
                <div
                  key={idx}
                  className={`flex-1 rounded-t transition-all duration-150 ${
                    isNoraSpeaking
                      ? "bg-gradient-to-t from-cyan-500 via-teal-300 to-white"
                      : isLiveOnAir
                      ? "bg-gradient-to-t from-cyan-700 to-cyan-400/70"
                      : "bg-slate-800"
                  }`}
                  style={{
                    height: `${isLiveOnAir ? heightPct : 15}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Bidirectional On-Air Dialogue History + Live Input Dock */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 min-h-0">
            {/* Left 8 Cols: Live Conversation History & Input Box */}
            <div className="lg:col-span-8 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                    <Mic size={14} />
                    <span>
                      Historial de Conversación al Aire (Locutor Humano ↔ Nora
                      Co-Host)
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {dialogueHistory.length} intervenciones
                  </span>
                </div>

                {/* Scrollable Dialogue Turns */}
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {dialogueHistory.map((turn) => {
                    const isNora = turn.speaker === "NORA_CO_HOST";
                    return (
                      <div
                        key={turn.id}
                        className={`p-3 rounded-xl border ${
                          isNora
                            ? "bg-cyan-950/30 border-cyan-500/30 mr-4"
                            : "bg-slate-950 border-slate-800 ml-6"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            {isNora && (
                              <img
                                src="/avatar-nora.png"
                                alt="Nora"
                                className="w-5 h-5 rounded-full object-cover border border-cyan-400"
                              />
                            )}
                            <span
                              className={`text-xs font-bold ${
                                isNora ? "text-cyan-300" : "text-amber-300"
                              }`}
                            >
                              {turn.speakerLabel}
                            </span>
                            {turn.modelBadge && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                {turn.modelBadge}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isNora && (
                              <button
                                type="button"
                                onClick={() => speakNoraAloud(turn.text)}
                                className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                                title="Reproducir voz de Nora por altavoces"
                              >
                                <Volume2 size={11} />
                                <span>Escuchar</span>
                              </button>
                            )}
                            <span className="text-[10px] font-mono text-slate-500">
                              {turn.timestamp}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-100 leading-relaxed">
                          {turn.text}
                        </p>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Quick Suggestion Chips + Passive Studio Memory + Interactive Input Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-2">
                {(openMicDuplexMode || passiveTableContext.length > 0) && (
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-emerald-200 font-mono truncate flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full inline-block shrink-0 ${
                          isListeningMic
                            ? "bg-emerald-400 animate-ping"
                            : "bg-amber-400"
                        }`}
                      />
                      <span>
                        {isListeningMic
                          ? "Escuchando mesa en vivo..."
                          : "Reenganchando micrófono..."}{" "}
                        ({passiveTableContext.length} frases en memoria pasiva):{" "}
                        {passiveTableContext.length > 0
                          ? `"${passiveTableContext[passiveTableContext.length - 1]}"`
                          : "Activación por voz: 'Nora' / 'Che Nora'"}
                      </span>
                    </span>
                    {passiveTableContext.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPassiveTableContext([])}
                        className="text-[10px] font-mono text-slate-400 hover:text-white shrink-0 cursor-pointer"
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {QUICK_RADIO_PROMPTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setConsoleInput(preset);
                        void handleSendRadioDialogue(preset);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-[11px] text-slate-300 hover:text-cyan-200 transition-all cursor-pointer truncate max-w-full"
                    >
                      💬 {preset}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendRadioDialogue();
                  }}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={handleToggleMicrophone}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all shrink-0 backdrop-blur-md ${
                      isListeningMic
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/20 animate-pulse"
                        : "bg-slate-900/80 hover:bg-slate-800 text-cyan-300 border-slate-700/80"
                    }`}
                    title="Hablarle a Nora por micrófono en vivo"
                  >
                    {isListeningMic ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>

                  <input
                    type="text"
                    value={consoleInput}
                    onChange={(e) => setConsoleInput(e.target.value)}
                    placeholder="Hablá en Modo Cabina Abierta ('Che Nora...') o escribí acá tu pie al aire..."
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-400 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    disabled={isSendingToNora}
                    onClick={handleGiveFloorToNora}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0 transition-all"
                    title="Dar el pase manual a Nora para que intervenga sobre lo que se viene hablando en la mesa"
                  >
                    <Radio size={13} />
                    <span>Dar Pase a Nora</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSendingToNora || !consoleInput.trim()}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-cyan-500/20"
                  >
                    <Send size={14} />
                    <span>
                      {isSendingToNora ? "Saliendo al Aire..." : "Salir al Aire"}
                    </span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right 4 Cols: Live Redis Stream Bus */}
            <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Terminal size={14} className="text-emerald-400" />
                  <span>Bus Redis 7 (nexora:bus:*)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <Activity size={11} />
                  <span>LIVE</span>
                </span>
              </div>

              <div className="flex-1 max-h-[290px] overflow-y-auto rounded-xl bg-slate-950 border border-slate-800/90 p-3 space-y-2 font-mono text-[11px]">
                {redisLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border-b border-slate-900 pb-1.5 last:border-b-0"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="text-cyan-400 font-semibold">
                        [{log.agent}]
                      </span>
                      <span>{log.timestamp.slice(11, 19)} UTC</span>
                    </div>
                    <div
                      className={`mt-0.5 ${
                        log.level === "SUCCESS"
                          ? "text-emerald-300"
                          : log.level === "WARN"
                          ? "text-amber-300"
                          : "text-slate-300"
                      }`}
                    >
                      {log.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ===================================================================
           MODE 3: SOUND DESIGNER & BROADCAST MASTERING STUDIO
           =================================================================== */
        <>
          <div className="p-4 rounded-2xl bg-slate-900/95 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300">
                <Music size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">
                    Sound Cart & Mastering Studio (EBU R128 -14 LUFS • Ducking en Vivo)
                  </h2>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {NEXORA_SIGNATURE}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Dispará cortinas continuas, ráfagas y efectos en tiempo real con atenuación inteligente de voz
                </p>
              </div>
            </div>

            {/* Live Ducking Status Pill */}
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                  isDuckingActive
                    ? "bg-amber-500/25 border border-amber-400 text-amber-200 animate-pulse"
                    : "bg-slate-950 border border-slate-800 text-slate-400"
                }`}
              >
                <Sliders size={13} className={isDuckingActive ? "text-amber-300" : "text-slate-500"} />
                <span>
                  {isDuckingActive
                    ? "⚡ DUCKING ACTIVO: -14 dB (Voz en Aire)"
                    : "DUCKING AUTOMÁTICO EN ESPERA"}
                </span>
              </span>
            </div>
          </div>

          {/* Sound Cart: Live Broadcast Beds & Instant Stinger Triggers */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Disc size={15} className={soundCartPlayingBed ? "animate-spin text-emerald-400" : "text-slate-400"} />
                  <span>Cartuchera Radial de Transmisión (Disparadores al Aire)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Respuesta instantánea a 48kHz con Web Audio API nativo
                </span>
              </div>

              {/* Master Volume Faders */}
              <div className="flex items-center gap-4 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Volumen Cortina:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundCartBedVolume}
                    onChange={(e) => setSoundCartBedVolume(Number(e.target.value))}
                    className="w-24 accent-emerald-400 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-emerald-300 w-8">
                    {Math.round(soundCartBedVolume * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-2 border-l border-slate-800 pl-4">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase">Master (-14 LUFS):</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundCartMasterVolume}
                    onChange={(e) => setSoundCartMasterVolume(Number(e.target.value))}
                    className="w-24 accent-cyan-400 cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-cyan-300 w-8">
                    {Math.round(soundCartMasterVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Instant Sound Cart Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Button 1: Loopable Background Bed */}
              <button
                type="button"
                onClick={handleToggleSoundCartBed}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  soundCartPlayingBed
                    ? "bg-emerald-500/25 border-emerald-400 text-white shadow-lg shadow-emerald-950/50"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-emerald-500/50 hover:text-white"
                }`}
              >
                <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-300">
                  <Music size={18} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">
                    {soundCartPlayingBed ? "⏸ Detener Cortina" : "▶ Cortina de Fondo"}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                    {soundCartPlayingBed ? "AL AIRE (Ducking ON)" : "Loop Continuo"}
                  </div>
                </div>
              </button>

              {/* Button 2: News Stinger */}
              <button
                type="button"
                onClick={() => handlePlaySoundCartStinger("NEWS")}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  lastTriggeredStinger === "NEWS"
                    ? "bg-rose-500/25 border-rose-400 text-white scale-105"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-rose-500/50 hover:text-white"
                }`}
              >
                <div className="p-2 rounded-full bg-rose-500/20 text-rose-300">
                  <Radio size={18} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">🚨 Ráfaga Noticias</div>
                  <div className="text-[10px] font-mono text-rose-400 mt-0.5">
                    Último Momento (4s)
                  </div>
                </div>
              </button>

              {/* Button 3: Sweeper / Station ID */}
              <button
                type="button"
                onClick={() => handlePlaySoundCartStinger("SWEEPER")}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  lastTriggeredStinger === "SWEEPER"
                    ? "bg-cyan-500/25 border-cyan-400 text-white scale-105"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-white"
                }`}
              >
                <div className="p-2 rounded-full bg-cyan-500/20 text-cyan-300">
                  <Disc size={18} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">📻 Separador / ID</div>
                  <div className="text-[10px] font-mono text-cyan-400 mt-0.5">
                    Sweeper + Campana
                  </div>
                </div>
              </button>

              {/* Button 4: Studio Applause */}
              <button
                type="button"
                onClick={() => handlePlaySoundCartStinger("APPLAUSE")}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  lastTriggeredStinger === "APPLAUSE"
                    ? "bg-amber-500/25 border-amber-400 text-white scale-105"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-white"
                }`}
              >
                <div className="p-2 rounded-full bg-amber-500/20 text-amber-300">
                  <Sparkles size={18} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">👏 Aplausos Mesa</div>
                  <div className="text-[10px] font-mono text-amber-400 mt-0.5">
                    Estudio & Ovación
                  </div>
                </div>
              </button>

              {/* Button 5: Debate Tension */}
              <button
                type="button"
                onClick={() => handlePlaySoundCartStinger("TENSION")}
                className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                  lastTriggeredStinger === "TENSION"
                    ? "bg-violet-500/25 border-violet-400 text-white scale-105"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-violet-500/50 hover:text-white"
                }`}
              >
                <div className="p-2 rounded-full bg-violet-500/20 text-violet-300">
                  <Volume2 size={18} />
                </div>
                <div className="text-center">
                  <div className="text-xs font-bold">🔥 Tensión / Debate</div>
                  <div className="text-[10px] font-mono text-violet-400 mt-0.5">
                    Sub-Bass Riser (3s)
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left 7 Cols: Musical Generator Form */}
            <form
              onSubmit={handleGenerateJingle}
              className="lg:col-span-7 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Sliders size={14} />
                  <span>Generador de Jingle & Publicidad</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  EBU R128 Broadcast Ready
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Descripción del Jingle / Cama Musical
                </label>
                <textarea
                  rows={2}
                  value={jingleDescription}
                  onChange={(e) => setJingleDescription(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Estilo Musical
                  </label>
                  <select
                    value={jingleStyle}
                    onChange={(e) => setJingleStyle(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Corporate Synthwave">
                      Corporate Synthwave (122 BPM)
                    </option>
                    <option value="Radio News Stinger">
                      Radio News Stinger (130 BPM)
                    </option>
                    <option value="Agro-Industrial Epic">
                      Agro-Industrial Epic (110 BPM)
                    </option>
                    <option value="Upbeat Commercial Pop">
                      Upbeat Commercial Pop (126 BPM)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Duración del Master (Segundos)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 15, 30, 45].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setJingleDuration(sec)}
                        className={`py-2 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                          jingleDuration === sec
                            ? "bg-emerald-500/25 border-emerald-400 text-emerald-200"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <label className="block text-[10px] text-slate-400 uppercase">
                    Normalización EBU R128 (LUFS)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="-24"
                    max="-12"
                    value={targetLufs}
                    onChange={(e) => setTargetLufs(Number(e.target.value))}
                    className="mt-1 w-full bg-transparent text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                  />
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <label className="block text-[10px] text-slate-400 uppercase">
                    Sidechain Ducking (dB)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="-24"
                    max="-6"
                    value={sidechainDb}
                    onChange={(e) => setSidechainDb(Number(e.target.value))}
                    className="mt-1 w-full bg-transparent text-xs font-mono font-bold text-emerald-300 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isDispatching}
                className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                <Sparkles size={15} />
                <span>
                  {isDispatching
                    ? "Masterizando con MusicGen + FFmpeg..."
                    : `Generar Jingle (${jingleDuration}s) & Masterizar a ${targetLufs} LUFS`}
                </span>
              </button>
            </form>

            {/* Right 5 Cols: Built-in Master Audio Player */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                    <Disc size={15} className="animate-spin" />
                    <span>Reproductor de Master en Vivo</span>
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300">
                    48kHz Stereo WAV
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-white truncate">
                      {lastGeneratedJingleName}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                      {jingleStyle} • {jingleDuration}s
                    </span>
                  </div>

                  {generatedAudioUrl && (
                    <audio
                      controls
                      src={generatedAudioUrl}
                      className="w-full h-10 rounded-lg"
                    />
                  )}

                  <p className="text-[11px] text-slate-400 font-mono">
                    Ruta VFS: /mnt/nexora_storage/media_production/nexora_audio/
                    {lastGeneratedJingleName}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Engine: {NEXORA_ENGINE_NAME}</span>
                <span>Signature: {NEXORA_SIGNATURE}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
