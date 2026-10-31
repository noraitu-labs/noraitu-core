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

  const {
    isDispatching,
    lastDispatchResult,
    errorMessage,
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
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
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

      {/* Optional Error Toast */}
      {errorMessage && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-1.5 text-xs text-rose-200 flex items-center justify-between">
          <span>Alerta de Despacho: {errorMessage}</span>
          <span className="font-mono text-[10px]">
            Engine: Nexora One Engine | Signature: By Nora
          </span>
        </div>
      )}

      {/* 2. Central 3-Column Industrial Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left: 4-Agent Selector Sidebar */}
        <AgentSidebar
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
        />

        {/* Center: Dynamic Operational Viewport */}
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

        {/* Right: 5 TB VFS Storage & GPU Telemetry Gauge */}
        <aside className="w-full xl:w-80 h-[calc(100vh-130px)] max-h-[calc(100vh-130px)] overflow-hidden flex flex-col shrink-0 border-t xl:border-t-0 xl:border-l border-slate-800/80 bg-slate-950/90">
          <TelemetryVFSGauge />
        </aside>
      </div>

      {/* 3. Official Institutional Footer */}
      <NexoraFooter />
    </div>
  );
}

