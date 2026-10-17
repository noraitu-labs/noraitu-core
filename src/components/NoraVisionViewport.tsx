"use client";

import React from "react";
import { Camera, X, Sun, Moon, AlertTriangle, Compass } from "lucide-react";
import { SpatialAlert, OpticalTelemetry } from "@/hooks/useNoraVision";

interface NoraVisionViewportProps {
  isCameraActive: boolean;
  onCloseCamera: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  alerts: SpatialAlert[];
  telemetry: OpticalTelemetry | null;
  isProcessing?: boolean;
}

export function NoraVisionViewport({
  isCameraActive,
  onCloseCamera,
  videoRef,
  canvasRef,
  alerts,
  telemetry,
  isProcessing = false,
}: NoraVisionViewportProps) {
  if (!isCameraActive) {
    // Renderizamos el canvas oculto para procesar snapshots sin alterar la UI
    return <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />;
  }

  const isLowLight = telemetry?.ambientLight === "Baja iluminación ambiental";

  return (
    <div className="absolute top-16 right-4 w-72 bg-slate-900/95 border border-white/15 rounded-xl shadow-2xl overflow-hidden z-40 backdrop-blur-md transition-all">
      {/* HEADER DEL HUD */}
      <div className="px-3 py-2 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Telemetría Óptica Activa</span>
        </div>
        <button
          onClick={onCloseCamera}
          className="text-slate-400 hover:text-rose-400 transition-colors p-1"
          title="Cerrar cámara"
        >
          <X size={14} />
        </button>
      </div>

      {/* FEED DE VIDEO & CANVAS OCULTO */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />

        {isProcessing && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center">
            <span className="text-[11px] font-medium text-emerald-300">Escaneando píxeles...</span>
          </div>
        )}
      </div>

      {/* PANEL DE ALERTAS ESPACIALES (ESFERA DEL RELOJ) */}
      <div className="p-3 text-[11px] space-y-2 bg-slate-900">
        {/* CONDICIONES AMBIENTALES */}
        <div className="flex items-center justify-between text-slate-400 border-b border-white/5 pb-1.5">
          <span className="flex items-center gap-1">
            {isLowLight ? <Moon size={12} className="text-amber-400" /> : <Sun size={12} className="text-sky-400" />}
            <span>{telemetry?.ambientLight || "Iluminación clara"}</span>
          </span>
          <span className="flex items-center gap-1 text-slate-300">
            <Compass size={12} className="text-indigo-400" />
            <span>Esfera 360°</span>
          </span>
        </div>

        {/* LISTADO DE OBJETOS DETECTADOS CON RELOJ Y METROS */}
        {alerts.length > 0 ? (
          <div className="space-y-1">
            {alerts.slice(0, 3).map((alert, index) => (
              <div
                key={index}
                className={`p-1.5 rounded-md flex items-start gap-1.5 ${
                  alert.alertLevel === "danger"
                    ? "bg-rose-600/30 border border-rose-500 text-rose-200 animate-pulse font-bold"
                    : alert.alertLevel === "warning"
                    ? "bg-amber-500/15 border border-amber-500/30 text-amber-300"
                    : "bg-slate-800/80 border border-white/5 text-slate-200"
                }`}
              >
                {alert.alertLevel === "danger" || alert.alertLevel === "warning" ? (
                  <AlertTriangle
                    size={13}
                    className={`shrink-0 mt-0.5 ${
                      alert.alertLevel === "danger" ? "text-rose-400" : "text-amber-400"
                    }`}
                  />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                )}
                <div className="leading-tight">
                  <span className="font-semibold capitalize">{alert.label}</span>{" "}
                  <span className="text-slate-400">a tus</span>{" "}
                  <span className="text-indigo-300 font-medium">{alert.clockPosition}</span>{" "}
                  <span className="text-slate-400">({alert.distance})</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-slate-400 italic py-1 text-center">
            {telemetry?.frontalPathStatus || "Paso frontal despejado a las 12 en punto."}
          </div>
        )}
      </div>
    </div>
  );
}

export default NoraVisionViewport;
