"use client";

/**
 * NEXORA ONE ENGINE — VISUAL FORGE (PRO NEWS PLACAS, COMFYUI & CLOUD PROMOS)
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Component: src/components/nexora/VisualForge.tsx
 */

import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Radio,
  Share2,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

export type AspectRatioOption = "16:9" | "9:16" | "1:1";
export type ForgeWorkflowMode = "NEWS_PLACA" | "CLOUD_PROMO" | "COMFYUI_RENDER";

export interface VisualAssetItem {
  id: string;
  filename: string;
  vfsPath: string;
  modelUsed: string;
  aspectRatio: AspectRatioOption;
  resolution: string;
  prompt: string;
  typographyOverlay: string;
  sizeBytes: string;
  createdAt: string;
}

const INITIAL_VFS_GALLERY: VisualAssetItem[] = [
  {
    id: "vfs-vis-1",
    filename: "NXR-PLACA-ULTIMO-MOMENTO-1080x1920.svg",
    vfsPath:
      "/mnt/nexora_storage/media_production/nexora_visual/NXR-PLACA-ULTIMO-MOMENTO-1080x1920.svg",
    modelUsed: "Visual Forge News Engine",
    aspectRatio: "9:16",
    resolution: "1080x1920",
    prompt: "Placa oficial de transmisión en vivo para redes sociales",
    typographyOverlay: "PANORAMA CENTRAL — INFORMACIÓN DE ÚLTIMO MOMENTO | BY NORA",
    sizeBytes: "8.4 KB (Vector HD)",
    createdAt: "2026-10-29 16:30 UTC",
  },
  {
    id: "vfs-vis-2",
    filename: "NXR-20261029-AGRO2026_agrovial_spot.mp4",
    vfsPath:
      "/mnt/nexora_storage/media_production/nexora_visual/NXR-20261029-AGRO2026_agrovial_spot.mp4",
    modelUsed: "Tencent-HunyuanVideo",
    aspectRatio: "16:9",
    resolution: "1920x1080",
    prompt:
      "Heavy modern green and gold combine harvester working at golden hour in Argentine pampas soy field",
    typographyOverlay: "AGROVIAL LITORAL — ASISTENCIA 24/7 EN CAMPO | BY NORA",
    sizeBytes: "524.4 KB",
    createdAt: "2026-10-29 15:01 UTC",
  },
];

export interface VisualForgeProps {
  isDispatching: boolean;
  onDispatchVisualOrder: (params: {
    clientBrand: string;
    imageModel: "FLUX.1-schnell" | "Kolors-v1.0";
    videoModel: "Tencent-HunyuanVideo" | "CogVideoX-5B";
    resolution: "3840x2160" | "1920x1080" | "1080x1920";
    positivePrompt: string;
    negativePrompt: string;
    typographyText: string;
    correlationSuffix: string;
  }) => Promise<unknown>;
}

export function VisualForge({
  isDispatching,
  onDispatchVisualOrder,
}: VisualForgeProps) {
  const [activeWorkflow, setActiveWorkflow] = useState<ForgeWorkflowMode>("NEWS_PLACA");
  const [selectedEngine, setSelectedEngine] = useState<
    "FLUX.1-schnell" | "Tencent-HunyuanVideo"
  >("FLUX.1-schnell");
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>("9:16");

  // News Placa Generator state
  const [placaHeadline, setPlacaHeadline] = useState(
    "EL BANCO CENTRAL Y ECONOMÍA DEFINEN MEDIDAS PARA EL MERCADO CAMBIARIO"
  );
  const [placaSubheadline, setPlacaSubheadline] = useState(
    "Seguimiento en vivo en la mesa de noticias sobre reservas, liquidación y estabilidad."
  );
  const [placaCategory, setPlacaCategory] = useState("ÚLTIMO MOMENTO");
  const [placaProgram, setPlacaProgram] = useState("Panorama Central");
  const [placaDial, setPlacaDial] = useState("FM del Este 98.7");
  const [placaAccentColor, setPlacaAccentColor] = useState("#06b6d4"); // Cyan
  const [isGeneratingPlaca, setIsGeneratingPlaca] = useState(false);
  const [generatedSvgCode, setGeneratedSvgCode] = useState<string>("");
  const [generatedPlacaDataUrl, setGeneratedPlacaDataUrl] = useState<string>("");

  // Promo Script Generator state
  const [promoSpokenScript, setPromoSpokenScript] = useState<string>("");
  const [promoVisualDirection, setPromoVisualDirection] = useState<string>("");
  const [isGeneratingPromo, setIsGeneratingPromo] = useState(false);

  // ComfyUI traditional form state
  const [clientBrand, setClientBrand] = useState("AgroVial Litoral");
  const [positivePrompt, setPositivePrompt] = useState(
    "Heavy modern green and gold combine harvester working at golden hour in Argentine pampas soy field, cinematic aerial tracking shot, ultra sharp commercial lighting"
  );
  const [negativePrompt, setNegativePrompt] = useState(
    "blurry, deformed wheels, misspelled text, watermark, low resolution"
  );
  const [typographyOverlay, setTypographyOverlay] = useState(
    "AGROVIAL LITORAL — ASISTENCIA 24/7 EN CAMPO | BY NORA"
  );

  const [gallery, setGallery] = useState<VisualAssetItem[]>(INITIAL_VFS_GALLERY);
  const [selectedPreview, setSelectedPreview] = useState<VisualAssetItem>(
    INITIAL_VFS_GALLERY[0]
  );
  const [previewDataUrl, setPreviewDataUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mapAspectToResolution = (
    ratio: AspectRatioOption
  ): "3840x2160" | "1920x1080" | "1080x1920" => {
    if (ratio === "9:16") return "1080x1920";
    if (ratio === "1:1") return "1920x1080";
    return "3840x2160";
  };

  /**
   * Generates a high-res news placa via /api/nexora/visual-forge
   */
  const handleGenerateNewsPlaca = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGeneratingPlaca(true);
    try {
      const format = aspectRatio === "9:16" ? "1080x1920" : aspectRatio === "1:1" ? "1080x1080" : "1920x1080";
      const res = await fetch("/api/nexora/visual-forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_PLACA",
          headline: placaHeadline,
          subheadline: placaSubheadline,
          category: placaCategory,
          format,
          programName: placaProgram,
          stationDial: placaDial,
          accentColor: placaAccentColor,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedSvgCode(data.svg);
        setGeneratedPlacaDataUrl(data.dataUrl);

        const newAsset: VisualAssetItem = {
          id: `vfs-placa-${Date.now()}`,
          filename: data.filename || `NORA_PLACA_${format}.svg`,
          vfsPath: `/mnt/nexora_storage/media_production/nexora_visual/${data.filename}`,
          modelUsed: "Visual Forge SVG 4K",
          aspectRatio,
          resolution: format,
          prompt: placaHeadline,
          typographyOverlay: `${placaProgram} — ${placaCategory} | BY NORA`,
          sizeBytes: "8.5 KB (Vector)",
          createdAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
        };
        setGallery((prev) => [newAsset, ...prev]);
        setSelectedPreview(newAsset);
      }
    } catch (err) {
      console.error("Error generating news placa:", err);
    } finally {
      setIsGeneratingPlaca(false);
    }
  };

  /**
   * Generates a fast 15-second promo script via Cloud LLM
   */
  const handleGeneratePromoScript = async () => {
    setIsGeneratingPromo(true);
    try {
      const res = await fetch("/api/nexora/visual-forge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "GENERATE_PROMO_SCRIPT",
          headline: placaHeadline,
          programName: placaProgram,
          stationDial: placaDial,
          targetSocialNetwork: aspectRatio === "9:16" ? "INSTAGRAM_REELS" : "TWITTER_X",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPromoSpokenScript(data.spoken_script || "");
        setPromoVisualDirection(data.visual_direction || "");
      }
    } catch (err) {
      console.error("Error generating promo script:", err);
    } finally {
      setIsGeneratingPromo(false);
    }
  };

  // Auto-generate default news placa on first load if empty
  useEffect(() => {
    if (!generatedPlacaDataUrl && activeWorkflow === "NEWS_PLACA") {
      handleGenerateNewsPlaca();
    }
  }, [aspectRatio]);

  /**
   * Renders a live high-contrast commercial visual preview onto HTML5 Canvas
   * for ComfyUI mode.
   */
  useEffect(() => {
    if (activeWorkflow !== "COMFYUI_RENDER") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = aspectRatio === "9:16" ? 540 : aspectRatio === "1:1" ? 640 : 800;
    const h = aspectRatio === "9:16" ? 720 : aspectRatio === "1:1" ? 640 : 450;
    canvas.width = w;
    canvas.height = h;

    // Cinematic background gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (selectedEngine === "FLUX.1-schnell") {
      grad.addColorStop(0, "#090d16");
      grad.addColorStop(0.5, "#1e1b4b");
      grad.addColorStop(1, "#0f766e");
    } else {
      grad.addColorStop(0, "#020617");
      grad.addColorStop(0.5, "#0c4a6e");
      grad.addColorStop(1, "#3b0764");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Cybernetic grid
    ctx.strokeStyle = "rgba(34, 211, 238, 0.16)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top metadata bar
    ctx.fillStyle = "rgba(2, 6, 23, 0.78)";
    ctx.fillRect(16, 16, w - 32, 38);
    ctx.strokeStyle = "rgba(34, 211, 238, 0.45)";
    ctx.strokeRect(16, 16, w - 32, 38);

    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 13px monospace";
    ctx.fillText(
      `COMFYUI HEADLESS • ${selectedEngine} • ${aspectRatio} (${mapAspectToResolution(aspectRatio)})`,
      28,
      40
    );

    // Prompt card
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.fillRect(28, h * 0.25, w - 56, h * 0.36);
    ctx.strokeStyle = "rgba(139, 92, 246, 0.45)";
    ctx.strokeRect(28, h * 0.25, w - 56, h * 0.36);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`CLIENTE: ${clientBrand.toUpperCase()}`, 44, h * 0.25 + 30);

    // Bottom Typography Overlay
    ctx.fillStyle = "rgba(2, 6, 23, 0.9)";
    ctx.fillRect(16, h - 86, w - 32, 68);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.strokeRect(16, h - 86, w - 32, 68);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(typographyOverlay.slice(0, 62), 30, h - 54);

    try {
      setPreviewDataUrl(canvas.toDataURL("image/png"));
    } catch {
      // Ignore
    }
  }, [activeWorkflow, selectedEngine, aspectRatio, clientBrand, positivePrompt, typographyOverlay]);

  const handleRenderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = mapAspectToResolution(aspectRatio);
    const suffix = selectedEngine === "FLUX.1-schnell" ? "FLUX4K01" : "HUNYVID1";

    await onDispatchVisualOrder({
      clientBrand,
      imageModel: "FLUX.1-schnell",
      videoModel: "Tencent-HunyuanVideo",
      resolution: res,
      positivePrompt,
      negativePrompt,
      typographyText: typographyOverlay,
      correlationSuffix: suffix,
    });

    const newFilename =
      selectedEngine === "FLUX.1-schnell"
        ? `NXR-${Date.now().toString().slice(-6)}_flux_poster.png`
        : `NXR-${Date.now().toString().slice(-6)}_hunyuan_spot.mp4`;

    const newAsset: VisualAssetItem = {
      id: `vfs-vis-${Date.now()}`,
      filename: newFilename,
      vfsPath: `/mnt/nexora_storage/media_production/nexora_visual/${newFilename}`,
      modelUsed: selectedEngine,
      aspectRatio,
      resolution: res,
      prompt: positivePrompt,
      typographyOverlay,
      sizeBytes: selectedEngine === "FLUX.1-schnell" ? "2.4 MB" : "14.8 MB (4K MP4)",
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    };

    setGallery((prev) => [newAsset, ...prev]);
    setSelectedPreview(newAsset);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto bg-slate-950/60">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-violet-500/30 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">
              Visual Forge — Producción Gráfica & Video ({NEXORA_ENGINE_NAME})
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-violet-500/20 text-violet-300 border border-violet-500/40">
              {NEXORA_SIGNATURE}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Generá placas de transmisión para redes (1080x1920 / 1920x1080) y clips promocionales listos para salir al aire
          </p>
        </div>

        {/* Workflow Mode Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveWorkflow("NEWS_PLACA")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeWorkflow === "NEWS_PLACA"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Radio size={14} />
            <span>Placas de Redes</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkflow("CLOUD_PROMO")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeWorkflow === "CLOUD_PROMO"
                ? "bg-violet-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap size={14} />
            <span>Promo 15s Cloud</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveWorkflow("COMFYUI_RENDER")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeWorkflow === "COMFYUI_RENDER"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Film size={14} />
            <span>ComfyUI Headless</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Form + Live Visual Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Context Form depending on Workflow */}
        <div className="lg:col-span-6 space-y-4">
          {activeWorkflow === "NEWS_PLACA" && (
            <form
              onSubmit={handleGenerateNewsPlaca}
              className="p-4 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Radio size={14} />
                  <span>Editor de Placas de Noticias para Redes</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Exportación Vectorial 4K
                </span>
              </div>

              {/* Format & Aspect Ratio Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Formato de Salida
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio("9:16")}
                    className={`py-2 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                      aspectRatio === "9:16"
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    9:16 (1080x1920 Reel/Story)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("16:9")}
                    className={`py-2 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                      aspectRatio === "16:9"
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    16:9 (1920x1080 TV/Twitter)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio("1:1")}
                    className={`py-2 rounded-lg text-xs font-mono font-bold border cursor-pointer ${
                      aspectRatio === "1:1"
                        ? "bg-cyan-500/25 border-cyan-400 text-cyan-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    1:1 (Feed Cuadrado)
                  </button>
                </div>
              </div>

              {/* Headline */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Titular Principal (En Mayúsculas)
                </label>
                <textarea
                  rows={2}
                  value={placaHeadline}
                  onChange={(e) => setPlacaHeadline(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              {/* Subheadline / Bajada */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Bajada / Contexto de la Noticia
                </label>
                <textarea
                  rows={2}
                  value={placaSubheadline}
                  onChange={(e) => setPlacaSubheadline(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Categoría / Pastilla
                  </label>
                  <select
                    value={placaCategory}
                    onChange={(e) => setPlacaCategory(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ÚLTIMO MOMENTO">ÚLTIMO MOMENTO</option>
                    <option value="PRIMICIA EXCLUSIVA">PRIMICIA EXCLUSIVA</option>
                    <option value="POLÍTICA NACIONAL">POLÍTICA NACIONAL</option>
                    <option value="ECONOMÍA & MERCADOS">ECONOMÍA & MERCADOS</option>
                    <option value="DEPORTES">DEPORTES</option>
                    <option value="SOCIEDAD">SOCIEDAD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Color de Acento
                  </label>
                  <div className="flex items-center gap-2">
                    {["#06b6d4", "#ef4444", "#eab308", "#10b981", "#8b5cf6"].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setPlacaAccentColor(col)}
                        style={{ backgroundColor: col }}
                        className={`w-7 h-7 rounded-full border-2 cursor-pointer transition-all ${
                          placaAccentColor === col ? "border-white scale-110" : "border-transparent opacity-70"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Nombre del Programa
                  </label>
                  <input
                    type="text"
                    value={placaProgram}
                    onChange={(e) => setPlacaProgram(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Frecuencia / Emisora
                  </label>
                  <input
                    type="text"
                    value={placaDial}
                    onChange={(e) => setPlacaDial(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isGeneratingPlaca}
                className="w-full py-3 rounded-xl text-xs font-extrabold uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles size={16} />
                <span>
                  {isGeneratingPlaca ? "Generando Placa HD..." : "Actualizar & Renderizar Placa HD"}
                </span>
              </button>
            </form>
          )}

          {activeWorkflow === "CLOUD_PROMO" && (
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-violet-500/30 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
                  <Zap size={14} />
                  <span>Generador Rápido de Promo Radial & Clip (Cloud LLM)</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400">Baja Latencia (&lt;1.2s)</span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Titular de Noticia a Promocionar
                </label>
                <input
                  type="text"
                  value={placaHeadline}
                  onChange={(e) => setPlacaHeadline(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <button
                type="button"
                onClick={handleGeneratePromoScript}
                disabled={isGeneratingPromo}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Sparkles size={15} />
                <span>
                  {isGeneratingPromo ? "Generando con Groq LPU..." : "Generar Guion de 15s y Dirección Visual"}
                </span>
              </button>

              {promoSpokenScript && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-violet-500/40">
                    <span className="text-[10px] font-mono uppercase text-violet-300 block mb-1">
                      🎙️ Guion de Locución para Redes (15s):
                    </span>
                    <p className="text-xs text-slate-100 font-sans italic leading-relaxed">
                      &ldquo;{promoSpokenScript}&rdquo;
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-mono uppercase text-cyan-300 block mb-1">
                      🎬 Dirección de Arte Visual:
                    </span>
                    <p className="text-xs text-slate-300 font-mono text-[11px]">
                      {promoVisualDirection}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeWorkflow === "COMFYUI_RENDER" && (
            <form
              onSubmit={handleRenderSubmit}
              className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                  <Layers size={14} />
                  <span>ComfyUI Headless (FLUX.1 Schnell / Hunyuan Video)</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {selectedEngine}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEngine("FLUX.1-schnell")}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedEngine === "FLUX.1-schnell"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  <ImageIcon size={14} />
                  <span>FLUX.1 Schnell</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEngine("Tencent-HunyuanVideo")}
                  className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                    selectedEngine === "Tencent-HunyuanVideo"
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-950 text-slate-400 border border-slate-800"
                  }`}
                >
                  <Film size={14} />
                  <span>HunyuanVideo 4K</span>
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Marca / Cliente
                </label>
                <input
                  type="text"
                  value={clientBrand}
                  onChange={(e) => setClientBrand(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Prompt Positivo
                </label>
                <textarea
                  rows={2}
                  value={positivePrompt}
                  onChange={(e) => setPositivePrompt(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2 text-xs text-slate-200 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isDispatching}
                className="w-full py-2.5 rounded-xl text-xs font-extrabold uppercase bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50"
              >
                {isDispatching ? "Despachando a ComfyUI..." : "Renderizar en VFS (/mnt/nexora_storage/)"}
              </button>
            </form>
          )}
        </div>

        {/* Right Column: Live Visual Result Viewer + VFS Asset Gallery */}
        <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <Eye size={15} />
                <span>
                  {activeWorkflow === "NEWS_PLACA"
                    ? `Vista Previa de Placa HD (${aspectRatio === "9:16" ? "1080x1920 Reel/Story" : aspectRatio === "1:1" ? "1080x1080 Feed" : "1920x1080 Broadcast"})`
                    : `Visor de Render (${aspectRatio})`}
                </span>
              </span>

              {generatedPlacaDataUrl && activeWorkflow === "NEWS_PLACA" ? (
                <a
                  href={generatedPlacaDataUrl}
                  download={`NORA_PLACA_${aspectRatio.replace(":", "x")}_${Date.now()}.svg`}
                  className="px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Download size={13} />
                  <span>Descargar Placa HD (SVG)</span>
                </a>
              ) : previewDataUrl ? (
                <a
                  href={previewDataUrl}
                  download={selectedPreview.filename.replace(".mp4", ".png")}
                  className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-500/30 text-[11px] font-mono flex items-center gap-1"
                >
                  <Download size={12} />
                  <span>Descargar Render</span>
                </a>
              ) : null}
            </div>

            {/* Display SVG or Canvas according to workflow */}
            <div className="w-full min-h-[300px] max-h-[440px] rounded-xl bg-slate-950 border border-cyan-500/40 p-3 flex items-center justify-center overflow-hidden">
              {activeWorkflow === "NEWS_PLACA" && generatedSvgCode ? (
                <div
                  className="w-full h-full max-h-[420px] flex items-center justify-center overflow-hidden [&>svg]:max-h-[410px] [&>svg]:w-auto [&>svg]:rounded-lg [&>svg]:shadow-2xl"
                  dangerouslySetInnerHTML={{ __html: generatedSvgCode }}
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  className="max-h-56 w-auto rounded-lg shadow-lg border border-slate-800"
                />
              )}
            </div>
          </div>

          {/* VFS /nexora_visual/ Asset List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FolderOpen size={14} className="text-emerald-400" />
                <span>Activos en /nexora_visual/ ({gallery.length})</span>
              </span>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedPreview(item);
                    setAspectRatio(item.aspectRatio);
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                    selectedPreview.id === item.id
                      ? "bg-slate-950 border-cyan-400/60"
                      : "bg-slate-950/70 border-slate-800 hover:border-violet-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono font-bold text-white truncate">
                        {item.filename}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                      {item.resolution}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
