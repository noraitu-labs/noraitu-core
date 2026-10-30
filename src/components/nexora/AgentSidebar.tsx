"use client";

/**
 * NEXORA ONE ENGINE — SPECIALIST AGENT SELECTOR SIDEBAR
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Component: src/components/nexora/AgentSidebar.tsx
 */

import React from "react";
import { Film, Mic, Music, Radar, Terminal } from "lucide-react";
import { NexoraSpecialistAgentId } from "@/hooks/useNexoraDispatch";

export interface AgentDescriptor {
  id: NexoraSpecialistAgentId;
  title: string;
  subtitle: string;
  models: string;
  storageDir: string;
  accentColor: string;
}

export const NEXORA_SPECIALIST_AGENTS: AgentDescriptor[] = [
  {
    id: "RADIO_CO_HOST",
    title: "Radio & Co-Host Live",
    subtitle: "Locución, Boletines y Dossiers al Aire",
    models: "SenseVoice + Qwen 2.5 + CosyVoice",
    storageDir: "/media_production/nexora_audio/",
    accentColor: "#06b6d4",
  },
  {
    id: "ART_VIDEO_DIRECTOR",
    title: "Visual Forge (Art & Video)",
    subtitle: "Spots 4K y Gráfica Tipográfica Headless",
    models: "FLUX.1 Schnell + HunyuanVideo + ComfyUI",
    storageDir: "/media_production/nexora_visual/",
    accentColor: "#8b5cf6",
  },
  {
    id: "SOUND_DESIGNER",
    title: "Sound Designer & Mastering",
    subtitle: "Camas Musicales, Sidechain & -14 LUFS",
    models: "MusicGen Stereo + FFmpeg EBU R128",
    storageDir: "/media_production/nexora_audio/",
    accentColor: "#10b981",
  },
  {
    id: "SDR_24_7",
    title: "SDR Radar 24/7",
    subtitle: "Prospección Activa & Demos Instantáneas",
    models: "n8n + DeepSeek-V3 + pgvector",
    storageDir: "/media_production/nexora_demos/",
    accentColor: "#f59e0b",
  },
];

export interface AgentSidebarProps {
  selectedAgent: NexoraSpecialistAgentId;
  onSelectAgent: (agentId: NexoraSpecialistAgentId) => void;
}

export function AgentSidebar({
  selectedAgent,
  onSelectAgent,
}: AgentSidebarProps) {
  const renderIcon = (id: NexoraSpecialistAgentId) => {
    switch (id) {
      case "RADIO_CO_HOST":
        return <Mic size={18} className="text-cyan-400" />;
      case "ART_VIDEO_DIRECTOR":
        return <Film size={18} className="text-violet-400" />;
      case "SOUND_DESIGNER":
        return <Music size={18} className="text-emerald-400" />;
      case "SDR_24_7":
        return <Radar size={18} className="text-amber-400" />;
    }
  };

  return (
    <aside
      className="w-full lg:w-72 bg-slate-950/90 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-3 flex flex-col justify-between shrink-0 overflow-y-auto max-h-[calc(100vh-120px)] pb-6 scrollbar-thin scrollbar-thumb-cyan-500/20"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(6, 182, 212, 0.25) transparent",
      }}
    >
      <div>
        <div className="px-2 py-1.5 mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Tren de Agentes (By Nora)
          </span>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
            4 ACTIVE
          </span>
        </div>

        <nav className="space-y-2">
          {NEXORA_SPECIALIST_AGENTS.map((agent) => {
            const isActive = selectedAgent === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelectAgent(agent.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-900 border-cyan-400/60 shadow-lg shadow-cyan-950/40"
                    : "bg-slate-900/40 border-slate-800/70 hover:bg-slate-900/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {renderIcon(agent.id)}
                    <span className="text-xs font-bold text-white">
                      {agent.title}
                    </span>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? "bg-cyan-400 animate-ping" : "bg-emerald-500"
                    }`}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {agent.subtitle}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-[155px]">{agent.models}</span>
                  <span className="text-cyan-400">READY</span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Fullstack Code Sandbox Status Card (Siempre visible y accesible con scroll) */}
      <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-200 mb-1">
          <Terminal size={14} className="text-cyan-400" />
          <span>Fullstack Code Sandbox</span>
        </div>
        <p className="text-[11px] text-slate-400">
          DeepSeek-Coder + Qwen 2.5 Coder operando sobre{" "}
          <code className="text-cyan-300">/mnt/nexora_storage/code_sandbox/</code>
        </p>
      </div>
    </aside>
  );
}
