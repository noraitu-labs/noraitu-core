"use client";

/**
 * NEXORA ONE ENGINE — 5 TB VFS STORAGE & GPU HARDWARE TELEMETRY GAUGE
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Component: src/components/nexora/TelemetryVFSGauge.tsx
 */

import React from "react";
import { Database, HardDrive, Layers, Server } from "lucide-react";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

export interface TelemetryVFSGaugeProps {
  usedTb?: number;
  totalTb?: number;
  vramUsedGb?: number;
  vramTotalGb?: number;
  pgvectorIndexedRecords?: number;
}

const VFS_PARTITIONS = [
  {
    name: "nexora_audio",
    path: "/mnt/nexora_storage/media_production/nexora_audio/",
    desc: "Masters -14 LUFS, locución CosyVoice y emisiones al aire By Nora",
    sizeGb: 412.4,
    color: "bg-cyan-400",
  },
  {
    name: "nexora_visual",
    path: "/mnt/nexora_storage/media_production/nexora_visual/",
    desc: "Renders comerciales 4K, afiches FLUX.1 y clips HunyuanVideo",
    sizeGb: 1280.8,
    color: "bg-violet-400",
  },
  {
    name: "nexora_editorial",
    path: "/mnt/nexora_storage/media_production/nexora_editorial/",
    desc: "Artículos Schema.org, infografías y boletines de 45s",
    sizeGb: 194.2,
    color: "bg-emerald-400",
  },
  {
    name: "nexora_demos",
    path: "/mnt/nexora_storage/media_production/nexora_demos/",
    desc: "Jingles de 10s y flyers automáticos de prospección SDR 24/7",
    sizeGb: 318.6,
    color: "bg-amber-400",
  },
];

export function TelemetryVFSGauge({
  usedTb = 2.84,
  totalTb = 5.0,
  vramUsedGb = 19.4,
  vramTotalGb = 24.0,
  pgvectorIndexedRecords = 14820,
}: TelemetryVFSGaugeProps) {
  const storagePct = Math.min(100, Math.round((usedTb / totalTb) * 100));
  const vramPct = Math.min(100, Math.round((vramUsedGb / vramTotalGb) * 100));

  return (
    <section className="w-full xl:w-80 bg-slate-950/90 border-t xl:border-t-0 xl:border-l border-slate-800/80 p-3.5 flex flex-col justify-between shrink-0 space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              VFS Storage 5 TB & GPU
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            rclone VFS FULL
          </span>
        </div>

        {/* 5 TB Google Drive / VFS Cache Gauge */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-300 font-semibold">
              /mnt/nexora_storage
            </span>
            <span className="font-mono text-cyan-300">
              {usedTb.toFixed(2)} TB / {totalTb.toFixed(1)} TB ({storagePct}%)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-all duration-500"
              style={{ width: `${storagePct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
            Flags: --vfs-cache-mode full • I/O Atomic Probe OK
          </p>
        </div>

        {/* Official Directory Hierarchy Breakdown */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Layers size={13} className="text-cyan-400" />
            <span>Jerarquía Oficial ({NEXORA_SIGNATURE})</span>
          </div>

          {VFS_PARTITIONS.map((part) => (
            <div
              key={part.name}
              className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${part.color}`} />
                  <span className="font-mono font-bold text-slate-200">
                    {part.name}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  {part.sizeGb.toFixed(1)} GB
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 truncate">
                {part.desc}
              </p>
            </div>
          ))}
        </div>

        {/* NVIDIA GPU VRAM & Inference Cluster */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Server size={13} className="text-violet-400" />
              <span>GPU Tensor Core Pool</span>
            </span>
            <span className="font-mono text-violet-300">
              {vramUsedGb} / {vramTotalGb} GB ({vramPct}%)
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${vramPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1">
            <span>vLLM: Qwen 2.5 72B</span>
            <span>ComfyUI: cu124-highvram</span>
          </div>
        </div>
      </div>

      {/* pgvector Semantic Memory Footer */}
      <div className="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={15} className="text-emerald-400" />
          <div>
            <div className="text-[11px] font-bold text-white">
              pgvector HNSW Index
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {NEXORA_ENGINE_NAME} • {NEXORA_SIGNATURE}
            </div>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-emerald-300">
          {pgvectorIndexedRecords.toLocaleString()} vecs
        </span>
      </div>
    </section>
  );
}

