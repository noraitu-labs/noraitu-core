"use client";

/**
 * NEXORA ONE ENGINE — MAIN INDUSTRIAL CONTROL CENTER PAGE
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Repository: D:\Nora itu UTN (branch: feat/nexora-industrial-engine)
 * Route: src/app/nexora/page.tsx
 *
 * CRITICAL NON-REGRESSION GUARANTEE:
 * - Mounted exclusively at `/nexora`.
 * - Does NOT alter `src/app/page.tsx` (Academic/TEA/Lazarillo production interface).
 * - Connects Stitch modular components (`NexoraHeader`, `AgentSidebar`, `WorkspaceCanvas`,
 *   `VisualForge`, `SdrRadar`, `TelemetryVFSGauge`, `NexoraFooter`) to `POST /api/nexora/dispatch`
 *   through `useNexoraDispatch`.
 */

import React, { useState } from "react";
import {
  NexoraSpecialistAgentId,
  useNexoraDispatch,
} from "@/hooks/useNexoraDispatch";
import { NexoraHeader } from "@/components/nexora/NexoraHeader";
import { AgentSidebar } from "@/components/nexora/AgentSidebar";
import dynamic from "next/dynamic";

const WorkspaceCanvas = dynamic(
  () =>
    import("@/components/nexora/WorkspaceCanvas").then(
      (mod) => mod.WorkspaceCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-slate-950 text-slate-400 font-mono text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span>Iniciando Cabina de Transmisión Nexora...</span>
        </div>
      </div>
    ),
  }
);
import { VisualForge } from "@/components/nexora/VisualForge";
import { SdrRadar } from "@/components/nexora/SdrRadar";
import { TelemetryVFSGauge } from "@/components/nexora/TelemetryVFSGauge";
import { NexoraFooter } from "@/components/nexora/NexoraFooter";

export default function NexoraOneEnginePage() {
  const [selectedAgent, setSelectedAgent] =
    useState<NexoraSpecialistAgentId>("RADIO_CO_HOST");
  const [mobileTab, setMobileTab] =
    useState<"CABINA" | "AGENTES" | "TELEMETRIA">("CABINA");

  const {
    isDispatching,
    lastDispatchResult,
    errorMessage,
    clearErrorMessage,
    gatewayOnline,
    redisLogs,
    appendRedisLog,
    dispatchMasterOrder,
  } = useNexoraDispatch();

  const handleSelectAgent = (agentId: NexoraSpecialistAgentId) => {
    setSelectedAgent(agentId);
    appendRedisLog(
      "UI_VIEWPORT_SWITCH",
      `Conmutando estación operativa a ${agentId} [Nexora One Engine | By Nora]`,
      "INFO"
    );
  };

  return (
    <div
      className="w-full min-h-screen lg:h-screen lg:overflow-hidden overflow-y-auto bg-slate-950 text-slate-100 flex flex-col select-none"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {/* 1. Top Stitch Header with LogoNexoraOne & Live Badges */}
      <NexoraHeader
        gatewayOnline={gatewayOnline}
        isDispatching={isDispatching}
        lastCorrelationId={lastDispatchResult?.correlation_id}
        onQuickMasterDispatch={() => {
          void dispatchMasterOrder({
            clientBrand: "AgroVial Litoral",
            correlationSuffix: "MSTRALL1",
          });
        }}
      />

      {/* 1.5 Mobile Navigation Switcher (< lg) — Dedicated Remote Cabin / Agents / Telemetry */}
      <div className="lg:hidden flex items-center justify-between p-1.5 bg-slate-900/95 border-b border-slate-800 shrink-0 sticky top-0 z-30 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setMobileTab("CABINA")}
          className={`flex-1 py-2.5 px-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px] ${
            mobileTab === "CABINA"
              ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <span>🎙️</span>
          <span>Cabina</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("AGENTES")}
          className={`flex-1 py-2.5 px-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px] ${
            mobileTab === "AGENTES"
              ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <span>🤖</span>
          <span>Agentes</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("TELEMETRIA")}
          className={`flex-1 py-2.5 px-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px] ${
            mobileTab === "TELEMETRIA"
              ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
          }`}
        >
          <span>📊</span>
          <span>Telemetría</span>
        </button>
      </div>

      {/* Optional Error Toast (Auto-dismiss 5s & manual close) */}
      {errorMessage && (
        <div className="bg-rose-950/95 border-b border-rose-500/50 px-4 py-2 text-xs text-rose-200 flex items-center justify-between shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping shrink-0" />
            <span className="truncate">Alerta de Despacho: {errorMessage}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-[10px] text-rose-300/80 hidden sm:inline">
              Engine: Nexora One Engine | Signature: By Nora
            </span>
            <button
              type="button"
              onClick={clearErrorMessage}
              className="text-rose-200 hover:text-white px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 border border-rose-500/40 cursor-pointer font-bold text-[10px] transition-colors"
            >
              CERRAR ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Central 3-Column Industrial Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left: 4-Agent Selector Sidebar */}
        <div
          className={`w-full lg:w-72 shrink-0 ${
            mobileTab === "AGENTES" ? "flex flex-col" : "hidden lg:flex lg:flex-col"
          }`}
        >
          <AgentSidebar
            selectedAgent={selectedAgent}
            onSelectAgent={(agentId) => {
              handleSelectAgent(agentId);
              setMobileTab("CABINA");
            }}
          />
        </div>

        {/* Center: Dynamic Operational Viewport */}
        <div
          className={`flex-1 flex-col min-w-0 overflow-hidden ${
            mobileTab === "CABINA" ? "flex" : "hidden lg:flex"
          }`}
        >
          {selectedAgent === "ART_VIDEO_DIRECTOR" ? (
            <VisualForge
              isDispatching={isDispatching}
              onDispatchVisualOrder={async (params) => {
                appendRedisLog(
                  "VISUAL_FORGE_COMFYUI",
                  `Despachando render ${params.imageModel} / ${params.videoModel} (${params.resolution}) hacia /mnt/nexora_storage/media_production/nexora_visual/ [By Nora]`,
                  "INFO"
                );
                return await dispatchMasterOrder(params);
              }}
            />
          ) : selectedAgent === "SDR_24_7" ? (
            <SdrRadar
              isDispatching={isDispatching}
              onTriggerInstantDemo={async (params) => {
                appendRedisLog(
                  "AGENT_GROWTH_NORA_SDR",
                  `Generando demo instantánea (Jingle 10s + Flyer) para ${params.prospectCompany} (USD ${params.anchorPriceUsd}) en /nexora_demos/ [By Nora]`,
                  "SUCCESS"
                );
                return await dispatchMasterOrder(params);
              }}
            />
          ) : (
            <WorkspaceCanvas
              mode={selectedAgent}
              redisLogs={redisLogs}
              isDispatching={isDispatching}
              onAppendLog={appendRedisLog}
              onDispatchAction={async (params) => {
                return await dispatchMasterOrder(params);
              }}
            />
          )}
        </div>

        {/* Right: 5 TB VFS Storage & GPU Telemetry Gauge */}
        <aside
          className={`${
            mobileTab === "TELEMETRIA" ? "flex" : "hidden lg:flex"
          } w-full xl:w-80 h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col shrink-0 border-t xl:border-t-0 xl:border-l border-slate-800/80 bg-slate-950/90`}
        >
          <TelemetryVFSGauge />
        </aside>
      </div>

      {/* 3. Official Institutional Footer */}
      <NexoraFooter />
    </div>
  );
}
