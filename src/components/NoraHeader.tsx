"use client";

import React, { useState } from "react";
import {
  Menu,
  PhoneCall,
  Sparkles,
  Zap,
  Eye,
  Puzzle,
  FileText,
  FileDown,
} from "lucide-react";
import { NoraMode } from "@/lib/prompts/types";
import { exportToWord, exportToPdf, exportToPptx } from "@/lib/exportUtils";
import { ChatMessage } from "@/hooks/useNoraChat";

interface NoraHeaderProps {
  currentMode: NoraMode;
  onModeChange: (mode: NoraMode) => void;
  onOpenCallModal: () => void;
  messages: ChatMessage[];
  isStreaming?: boolean;
  audioEngine?: "cloud-whisper" | "native-edge";
}

const MODE_CONFIGS: Record<NoraMode, { label: string; accent: string; icon: React.ReactNode }> = {
  executive: {
    label: "Ejecutivo Corporativo",
    accent: "#6366f1",
    icon: <Zap size={14} />,
  },
  lazarillo: {
    label: "Lazarillo Visual",
    accent: "#10b981",
    icon: <Eye size={14} />,
  },
  tea: {
    label: "Inclusión TEA",
    accent: "#0ea5e9",
    icon: <Puzzle size={14} />,
  },
};

export function NoraHeader({
  currentMode,
  onModeChange,
  onOpenCallModal,
  messages,
  isStreaming = false,
  audioEngine = "cloud-whisper",
}: NoraHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const formatConversationForExport = (): string => {
    if (messages.length === 0) return "Sin mensajes registrados.";
    return messages
      .map((m) => `### ${m.role === "user" ? "Usuario" : "Nora"}:\n${m.content}\n`)
      .join("\n\n");
  };

  const handleExport = (type: "word" | "pdf" | "pptx") => {
    setShowExportMenu(false);
    const content = formatConversationForExport();
    if (type === "word") exportToWord("consulta_nora", "Reporte de Sesión - Nora Itu", content);
    if (type === "pdf") exportToPdf("Reporte de Sesión - Nora Itu", content);
    if (type === "pptx") exportToPptx("presentacion_nora", "Sesión Nora Itu", content);
  };

  const activeConfig = MODE_CONFIGS[currentMode] || MODE_CONFIGS.executive;

  return (
    <header className="h-14 border-b border-white/10 bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-30 shrink-0">
      {/* IDENTIDAD & SELECTOR DE MODO */}
      <div className="flex items-center gap-3 shrink-0" style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        <div className="flex items-center gap-2 shrink-0" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <img
            src="/avatar-nora.png"
            alt="Nora"
            className="w-8 h-8 rounded-full border border-indigo-500/40 object-cover shadow-sm shrink-0"
            style={{ width: "32px", height: "32px", maxWidth: "32px", maxHeight: "32px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-white leading-none">NORA ITU</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Asistente Multimodal Edge</div>
          </div>
        </div>

        {/* SELECTOR DE PERFIL COGNITIVO */}
        <div className="flex items-center bg-slate-950/70 p-1 rounded-lg border border-white/5 gap-1">
          {(["executive", "lazarillo", "tea"] as const).map((m) => {
            const isSelected = currentMode === m;
            const cfg = MODE_CONFIGS[m];
            return (
              <button
                key={m}
                onClick={() => onModeChange(m)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {cfg.icon}
                <span className="hidden md:inline">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ACCIONES: EXPORTACIÓN, STREAMING INDICATOR, MOTOR DE AUDIO Y LLAMADA EN VIVO */}
      <div className="flex items-center gap-2">
        {/* TELEMETRÍA DE MOTOR DE AUDIO */}
        <div
          className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
            audioEngine === "native-edge"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
          }`}
          title={
            audioEngine === "native-edge"
              ? "Voz procesada localmente en el dispositivo (Edge Nativo)"
              : "Voz procesada en la nube con Whisper Turbo"
          }
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              audioEngine === "native-edge" ? "bg-amber-400" : "bg-indigo-400"
            }`}
          />
          <span>{audioEngine === "native-edge" ? "STT: Edge Nativo" : "STT: Cloud Whisper"}</span>
        </div>
        {isStreaming && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Generando</span>
          </div>
        )}

        {/* MENU EXPORTACIÓN */}
        <div className="relative">
          <button
            onClick={() => setShowExportMenu((v) => !v)}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-white/10 transition-colors"
            title="Exportar conversación"
          >
            <FileDown size={16} />
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-1 w-32 bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden py-1 z-50">
              <button
                onClick={() => handleExport("word")}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>Word (.doc)</span>
              </button>
              <button
                onClick={() => handleExport("pdf")}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>PDF Document</span>
              </button>
              <button
                onClick={() => handleExport("pptx")}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
              >
                <span>PowerPoint (.ppt)</span>
              </button>
            </div>
          )}
        </div>

        {/* LLAMADA EN TIEMPO REAL */}
        <button
          onClick={onOpenCallModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
        >
          <PhoneCall size={14} />
          <span className="hidden sm:inline">Llamada en Vivo</span>
        </button>
      </div>
    </header>
  );
}

export default NoraHeader;
