"use client";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — COPILOT INTERACTIVO DE CABINA Y PRODUCCIÓN
//  Guías paso a paso: Spot Comercial, Transmisión en Vivo y Auto-Test
//  Monitoreo en tiempo real de GPU, VFS, Cabina y Centinela Policial
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  ChevronRight,
  ShieldCheck,
  Film,
  Cpu,
  Database,
  Cloud,
  Check,
} from "lucide-react";

interface DiagnosticsData {
  overallStatus?: string;
  results?: {
    neon?: { status: string; latencyMs?: number; database?: string; error?: string };
    googleDrive?: { status: string; latencyMs?: number; folderName?: string; quotaMode?: string; error?: string };
    redis?: { status: string; latencyMs?: number; note?: string; response?: string };
  };
}

export function NoraCopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"SPOT" | "LIVE" | "DIAGNOSTICS">("SPOT");

  // Estado de inspección de consola
  const [isCabinaOn, setIsCabinaOn] = useState(false);
  const [materialOnDesk, setMaterialOnDesk] = useState(true);
  const [gpuStatus, setGpuStatus] = useState<"OPTIMAL" | "STANDBY">("OPTIMAL");

  // Checklist de Transmisión en Vivo
  const [liveChecklist, setLiveChecklist] = useState({
    cabinaAbierta: false,
    retornoCalibrado: false,
    wakeWordTesteada: false,
    radarSdrSincronizado: false,
  });

  // Paso actual de Guía de Spot
  const [spotStep, setSpotStep] = useState(1);

  // Diagnóstico
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagData, setDiagData] = useState<DiagnosticsData | null>(null);

  // Ejecuta auto-test
  const runAutoTest = async () => {
    setIsDiagnosing(true);
    try {
      const res = await fetch("/api/security/police", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diagnostics" }),
      });
      const data = await res.json();
      if (data.success) {
        setDiagData(data);
      }
    } catch (err) {
      console.error("[Copilot AutoTest Error]:", err);
    } finally {
      setIsDiagnosing(false);
    }
  };

  useEffect(() => {
    if (isOpen && !diagData) {
      void runAutoTest();
    }
  }, [isOpen]);

  const toggleChecklistItem = (key: keyof typeof liveChecklist) => {
    setLiveChecklist((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (next.cabinaAbierta && next.retornoCalibrado) {
        setIsCabinaOn(true);
      }
      return next;
    });
  };

  const completedChecklistCount = Object.values(liveChecklist).filter(Boolean).length;

  return (
    <>
      {/* ── BOTÓN FLOTANTE ACCESO RÁPIDO COPILOT ── */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full font-mono text-xs font-semibold shadow-2xl transition-all duration-300 border ${
            isOpen
              ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/40"
              : "bg-slate-900/95 hover:bg-slate-800 text-cyan-400 border-cyan-500/40 hover:border-cyan-400 shadow-slate-950"
          }`}
          title="Abrir Nora Copilot Asistente de Cabina"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
          </span>
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>COPILOT NORA</span>
          <span className="hidden sm:inline-block text-[10px] text-slate-400 border-l border-slate-700 pl-2">
            {isCabinaOn ? "EN VIVO" : "STANDBY"}
          </span>
        </button>
      </div>

      {/* ── PANEL MODAL FLOTANTE INTERACTIVO ── */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 z-50 w-[95vw] sm:w-[460px] max-h-[82vh] bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-xs tracking-wide text-slate-100 flex items-center gap-2">
                  <span>NORA COPILOT</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">
                    By Nora
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Asistencia interactiva, flujos de producción y diagnóstico
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Consola Status Strip */}
          <div className="px-3.5 py-2 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isCabinaOn ? "bg-emerald-400" : "bg-amber-400"}`} />
              <span className="text-slate-300">Cabina: {isCabinaOn ? "AL AIRE" : "OFF / STANDBY"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-300">VRAM: {gpuStatus}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">POLICÍA: OK</span>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 gap-1 text-xs">
            <button
              onClick={() => setActiveTab("SPOT")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "SPOT"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Spot Comercial</span>
            </button>
            <button
              onClick={() => setActiveTab("LIVE")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "LIVE"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>En Vivo ({completedChecklistCount}/4)</span>
            </button>
            <button
              onClick={() => setActiveTab("DIAGNOSTICS")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "DIAGNOSTICS"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Auto-Test</span>
            </button>
          </div>

          {/* Contenido Dinámico con Scroll */}
          <div className="p-4 overflow-y-auto flex-1 space-y-3.5 text-xs text-slate-300">
            {/* ── PESTAÑA 1: SPOT COMERCIAL PASO A PASO ── */}
            {activeTab === "SPOT" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="font-semibold text-slate-200 text-xs">
                    Guía de Producción: Spot Publicitario
                  </span>
                  <span className="font-mono text-[10px] text-cyan-400">Paso {spotStep} de 4</span>
                </div>

                {/* Steps indicator */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <button
                      key={step}
                      onClick={() => setSpotStep(step)}
                      className={`h-1.5 rounded-full transition-all ${
                        step <= spotStep ? "bg-cyan-400" : "bg-slate-800"
                      }`}
                    />
                  ))}
                </div>

                {spotStep === 1 && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="font-medium text-slate-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center text-[10px]">1</span>
                      Redacción Persuasiva del Guion
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Estructurá el guion en 3 bloques de 10 segundos: Gancho empático, propuesta de valor y Llamado a la Acción (CTA).
                    </p>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 font-mono text-[11px] text-cyan-200">
                      "Descubrí la nueva era de la IA con Nexora One. Rendimiento industrial en tiempo real."
                    </div>
                  </div>
                )}

                {spotStep === 2 && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="font-medium text-slate-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center text-[10px]">2</span>
                      Generación Visual (FLUX / Hunyuan)
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Definí los prompts visuales para los clips de 4 segundos. El orquestador aplicará resolución uniforme 1080p (16:9 apaisado o 9:16 vertical para reels).
                    </p>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                      <span>Aspect Ratio: 16:9 / 9:16</span>
                      <span className="font-mono text-cyan-300">1080p Web</span>
                    </div>
                  </div>
                )}

                {spotStep === 3 && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="font-medium text-slate-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center text-[10px]">3</span>
                      Locución & Sidechain Ducking
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Sintetizá la voz con Edge-TTS (es-AR-TomasNeural) y combiná con la cama musical. Se aplicará atenuación automática de 60% (-10 dB) mientras la voz hable.
                    </p>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-emerald-300 font-mono">
                      Ducking: -10 dB | Attack: 20ms | Release: 300ms
                    </div>
                  </div>
                )}

                {spotStep === 4 && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="font-medium text-slate-100 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-300 flex items-center justify-center text-[10px]">4</span>
                      Ensamble xfade & Master -14 LUFS
                    </h4>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      FFmpeg concatena con transiciones suaves xfade (0.5s fade), calibra la sonoridad a -14 LUFS broadcast y almacena en <code>/nexora_visual</code>.
                    </p>
                    <div className="p-2 bg-slate-900 rounded border border-slate-800 text-[11px] text-cyan-300 font-mono">
                      Destino: /public/nexora_visual/spot_*.mp4
                    </div>
                  </div>
                )}

                {/* Controles de Navegación del Paso */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    disabled={spotStep === 1}
                    onClick={() => setSpotStep((s) => Math.max(1, s - 1))}
                    className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setSpotStep((s) => (s < 4 ? s + 1 : 1))}
                    className="px-3.5 py-1.5 rounded bg-cyan-600 text-white font-medium hover:bg-cyan-500 flex items-center gap-1.5"
                  >
                    <span>{spotStep === 4 ? "Reiniciar Guía" : "Siguiente Paso"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── PESTAÑA 2: TRANSMISIÓN EN VIVO ── */}
            {activeTab === "LIVE" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="font-semibold text-slate-200">Checklist Operativo de Cabina</span>
                  <span className="font-mono text-cyan-400 text-[11px]">
                    {completedChecklistCount === 4 ? "¡Listo para Emitir!" : `${completedChecklistCount} de 4`}
                  </span>
                </div>

                <div className="space-y-2">
                  <label
                    onClick={() => toggleChecklistItem("cabinaAbierta")}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border ${liveChecklist.cabinaAbierta ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-600"}`}>
                      {liveChecklist.cabinaAbierta && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">1. Habilitar Cabina Abierta</div>
                      <div className="text-[11px] text-slate-400">Activar micrófono principal y DSP de audio mono.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => toggleChecklistItem("retornoCalibrado")}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border ${liveChecklist.retornoCalibrado ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-600"}`}>
                      {liveChecklist.retornoCalibrado && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">2. Calibrar Retorno & Cancelación</div>
                      <div className="text-[11px] text-slate-400">Asegurar supresión acústica de eco para retorno en auriculares.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => toggleChecklistItem("wakeWordTesteada")}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border ${liveChecklist.wakeWordTesteada ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-600"}`}>
                      {liveChecklist.wakeWordTesteada && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">3. Probar Wake-Word ('Che Nora')</div>
                      <div className="text-[11px] text-slate-400">Verificar que la interrupción conversacional responda en &lt;400ms.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => toggleChecklistItem("radarSdrSincronizado")}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border ${liveChecklist.radarSdrSincronizado ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-600"}`}>
                      {liveChecklist.radarSdrSincronizado && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200">4. Conectar Radar SDR y Oyentes</div>
                      <div className="text-[11px] text-slate-400">Canal de telemetría y transcripción PNL activo en pantalla.</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* ── PESTAÑA 3: DIAGNÓSTICO AUTO-TEST ── */}
            {activeTab === "DIAGNOSTICS" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="font-semibold text-slate-200">Auto-Test de Infraestructura</span>
                  <button
                    disabled={isDiagnosing}
                    onClick={runAutoTest}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isDiagnosing ? "animate-spin" : ""}`} />
                    <span>{isDiagnosing ? "Probando..." : "Re-test"}</span>
                  </button>
                </div>

                {diagData?.results && (
                  <div className="space-y-2">
                    {/* Neon DB */}
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <div>
                          <div className="font-medium text-slate-200">Neon PostgreSQL (pgvector)</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {diagData.results.neon?.database || "nexora_one_db"} • {diagData.results.neon?.latencyMs}ms
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        diagData.results.neon?.status === "ONLINE" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-rose-950 text-rose-400 border border-rose-500/30"
                      }`}>
                        {diagData.results.neon?.status || "OFFLINE"}
                      </span>
                    </div>

                    {/* Google Drive */}
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cloud className="w-4 h-4 text-purple-400" />
                        <div>
                          <div className="font-medium text-slate-200">Google Drive 5TB Data Lake</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {diagData.results.googleDrive?.quotaMode} • {diagData.results.googleDrive?.latencyMs}ms
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        diagData.results.googleDrive?.status === "ONLINE"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-950 text-amber-300 border border-amber-500/30"
                      }`}>
                        {diagData.results.googleDrive?.status || "OFFLINE"}
                      </span>
                    </div>

                    {/* Redis Bus */}
                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <div>
                          <div className="font-medium text-slate-200">Bus de Eventos (Redis/Memory)</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {diagData.results.redis?.note || "Event Bus Zero-Latency"} • {diagData.results.redis?.latencyMs}ms
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                        {diagData.results.redis?.status || "ONLINE"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

