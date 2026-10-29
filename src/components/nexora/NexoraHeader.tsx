"use client";

/**
 * NEXORA ONE ENGINE — STITCH MODULAR HEADER
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Component: src/components/nexora/NexoraHeader.tsx
 */

import React from "react";
import { Activity, Cpu, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

export interface NexoraHeaderProps {
  gatewayOnline: boolean;
  isDispatching: boolean;
  lastCorrelationId?: string | null;
  onQuickMasterDispatch: () => void;
}

export function NexoraHeader({
  gatewayOnline,
  isDispatching,
  lastCorrelationId,
  onQuickMasterDispatch,
}: NexoraHeaderProps) {
  return (
    <header className="w-full bg-slate-950/95 border-b border-cyan-500/20 px-4 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 z-30">
      {/* Official Brand Identity & Wide LogoNexoraOne.png */}
      <div className="flex items-center gap-3.5">
        <div className="relative h-12 w-44 sm:w-52 rounded-xl overflow-hidden border border-cyan-400/40 bg-black flex items-center justify-center shadow-lg shadow-cyan-950/60 shrink-0">
          <img
            src="/branding/LogoNexoraOne.png"
            alt="Nexora One Engine Official Logo"
            className="w-full h-full object-cover scale-110"
          />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
              {NEXORA_ENGINE_NAME}
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              {NEXORA_SIGNATURE}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Multi-Agent Industrial OS • Orchestrator: Nora Itu (Core / COO)
          </p>
        </div>
      </div>

      {/* Live Infrastructure Status Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
          <span
            className={`w-2 h-2 rounded-full ${
              gatewayOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
            }`}
          />
          <span>Gateway: {gatewayOnline ? "ONLINE" : "STANDBY"}</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-cyan-300">
          <Cpu size={13} />
          <span>VFS 5 TB: /mnt/nexora_storage</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-emerald-300">
          <ShieldCheck size={13} />
          <span>Groq LPU + SambaNova Active</span>
        </div>

        {lastCorrelationId && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-[11px] text-indigo-300 font-mono">
            <Activity size={13} />
            <span>{lastCorrelationId}</span>
          </div>
        )}

        <button
          type="button"
          onClick={onQuickMasterDispatch}
          disabled={isDispatching}
          className="px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 shadow-md shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer transition-all"
        >
          {isDispatching ? (
            <>
              <Radio size={14} className="animate-spin" />
              <span>Despachando...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Despacho Integral By Nora</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
