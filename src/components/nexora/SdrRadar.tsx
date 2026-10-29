"use client";

/**
 * NEXORA ONE ENGINE — SDR RADAR 24/7 (BREAKING NEWS INTELLIGENCE & PROSPECTING)
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Component: src/components/nexora/SdrRadar.tsx
 */

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  DollarSign,
  ExternalLink,
  Flame,
  Globe,
  Mic,
  PlusCircle,
  Radar,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";
import { RadarNewsItem } from "@/lib/nexora/liveRadarFeed";

export interface AuditedProspectLead {
  id: string;
  companyName: string;
  decisionMaker: string;
  contact: string;
  weaknesses: string[];
  demoJinglePath: string;
  demoFlyerPath: string;
  estimatedValueUsd: number;
  status: "AUDITED" | "DEMO_GENERATED" | "PROPOSAL_SENT";
}

const INITIAL_PROSPECT_LEADS: AuditedProspectLead[] = [
  {
    id: "lead-01",
    companyName: "Distribuidora Metalúrgica San Jorge S.R.L.",
    decisionMaker: "Socio Gerente / Director Comercial",
    contact: "+5493425550199",
    weaknesses: [
      "NO_ACTIVE_RADIO_SPOTS",
      "ABSENT_LOCAL_PRESS_COVERAGE",
      "NO_SHORT_FORM_VIDEO_REELS",
    ],
    demoJinglePath:
      "/mnt/nexora_storage/media_production/nexora_demos/NXR-20261029-AGRO2026_sanjorge_jingle_10s.wav",
    demoFlyerPath:
      "/mnt/nexora_storage/media_production/nexora_demos/NXR-20261029-AGRO2026_sanjorge_flyer.png",
    estimatedValueUsd: 450,
    status: "DEMO_GENERATED",
  },
  {
    id: "lead-02",
    companyName: "Frigorífico Regional Río Paraná S.A.",
    decisionMaker: "Gerencia de Marketing & Ventas",
    contact: "+5493786414533",
    weaknesses: ["LOW_RESOLUTION_VISUAL_IDENTITY", "NO_ACTIVE_RADIO_SPOTS"],
    demoJinglePath:
      "/mnt/nexora_storage/media_production/nexora_demos/NXR-20261029-PARANA01_jingle_10s.wav",
    demoFlyerPath:
      "/mnt/nexora_storage/media_production/nexora_demos/NXR-20261029-PARANA01_flyer.png",
    estimatedValueUsd: 680,
    status: "DEMO_GENERATED",
  },
];

export interface SdrRadarProps {
  isDispatching: boolean;
  onTriggerInstantDemo: (params: {
    prospectCompany: string;
    anchorPriceUsd: number;
    correlationSuffix: string;
  }) => Promise<unknown>;
  onQuoteNewsInMesa?: (headline: string, source: string) => void;
}

export function SdrRadar({
  isDispatching,
  onTriggerInstantDemo,
  onQuoteNewsInMesa,
}: SdrRadarProps) {
  const [activeTab, setActiveTab] = useState<"LIVE_RADAR_NEWS" | "B2B_LEADS">("LIVE_RADAR_NEWS");
  const [radarNews, setRadarNews] = useState<RadarNewsItem[]>([]);
  const [isLoadingRadar, setIsLoadingRadar] = useState<boolean>(false);
  const [copiedItemNotice, setCopiedItemNotice] = useState<string | null>(null);
  const [quoteNotice, setQuoteNotice] = useState<string | null>(null);

  // B2B Leads state
  const [leads, setLeads] = useState<AuditedProspectLead[]>(INITIAL_PROSPECT_LEADS);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [lastSentProposalNotice, setLastSentProposalNotice] = useState<string | null>(null);
  const [newCompany, setNewCompany] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newPriceUsd, setNewPriceUsd] = useState(550);

  const fetchLiveNews = async () => {
    setIsLoadingRadar(true);
    try {
      const res = await fetch("/api/nexora/sdr-radar?limit=12");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.radar_news)) {
          setRadarNews(data.radar_news);
        }
      }
    } catch (err) {
      console.error("Error fetching live radar news:", err);
    } finally {
      setIsLoadingRadar(false);
    }
  };

  useEffect(() => {
    fetchLiveNews();
  }, []);

  const handleCopyHeadline = (item: RadarNewsItem) => {
    const text = `[${item.source}] ${item.headline}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedItemNotice(`Copiado al portapapeles: "${item.headline.slice(0, 50)}..."`);
      setTimeout(() => setCopiedItemNotice(null), 3000);
    }
  };

  const handleQuoteInMesa = (item: RadarNewsItem) => {
    if (onQuoteNewsInMesa) {
      onQuoteNewsInMesa(item.headline, item.source);
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      const prompt = `Nora, acaba de salir esta noticia en ${item.source}: "${item.headline}". ¿Cómo lo ves para la mesa? Danos tu lectura.`;
      navigator.clipboard.writeText(prompt);
      setQuoteNotice(`Noticia lista para la mesa. Podés pegarla en la consola con Ctrl+V.`);
      setTimeout(() => setQuoteNotice(null), 4000);
    }
  };

  const handleSendProposalWithDemo = async (lead: AuditedProspectLead) => {
    setActiveLeadId(lead.id);
    try {
      await onTriggerInstantDemo({
        prospectCompany: lead.companyName,
        anchorPriceUsd: lead.estimatedValueUsd,
        correlationSuffix: lead.companyName.slice(0, 8),
      });

      setLeads((prev) =>
        prev.map((item) =>
          item.id === lead.id ? { ...item, status: "PROPOSAL_SENT" } : item
        )
      );
      setLastSentProposalNotice(
        `Propuesta comercial con Jingle Demo 10s + Flyer 4K enviada a ${lead.companyName} (${lead.contact}) por USD ${lead.estimatedValueUsd} [By Nora]`
      );
    } finally {
      setActiveLeadId(null);
    }
  };

  const handleAddProspect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    const slug = newCompany.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 14);
    const created: AuditedProspectLead = {
      id: `lead-${Date.now()}`,
      companyName: newCompany.trim(),
      decisionMaker: "Director Comercial / Gerencia",
      contact: newContact.trim() || "+5493786414533",
      weaknesses: ["NO_ACTIVE_RADIO_SPOTS", "ABSENT_LOCAL_PRESS_COVERAGE"],
      demoJinglePath: `/mnt/nexora_storage/media_production/nexora_demos/NXR_${slug}_jingle_10s.wav`,
      demoFlyerPath: `/mnt/nexora_storage/media_production/nexora_demos/NXR_${slug}_flyer.png`,
      estimatedValueUsd: Number(newPriceUsd) || 500,
      status: "AUDITED",
    };
    setLeads((prev) => [created, ...prev]);
    setNewCompany("");
    setNewContact("");
  };

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto bg-slate-950/60">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Radar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                SDR Radar 24/7 — Inteligencia de Noticias & Prospección ({NEXORA_ENGINE_NAME})
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {NEXORA_SIGNATURE}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Monitoreo en tiempo real de agencias de noticias nacionales e internacionales listo para citar en cabina
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("LIVE_RADAR_NEWS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "LIVE_RADAR_NEWS"
                ? "bg-cyan-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame size={14} />
            <span>Noticias & Primicias en Vivo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("B2B_LEADS")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
              activeTab === "B2B_LEADS"
                ? "bg-amber-500 text-slate-950 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <DollarSign size={14} />
            <span>Pipeline B2B ({leads.length})</span>
          </button>
        </div>
      </div>

      {/* Global Notice Banners */}
      {copiedItemNotice && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-xs text-cyan-200 flex items-center gap-2">
          <CheckCircle size={15} className="text-cyan-400 shrink-0" />
          <span>{copiedItemNotice}</span>
        </div>
      )}

      {quoteNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
          <Mic size={15} className="text-emerald-400 shrink-0" />
          <span>{quoteNotice}</span>
        </div>
      )}

      {/* TAB 1: LIVE RADAR NEWS */}
      {activeTab === "LIVE_RADAR_NEWS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <Globe size={15} />
              <span>Titulares Recientes de Agencias (Clarín, Infobae, Ámbito, Olé, BBC)</span>
            </span>
            <button
              type="button"
              onClick={fetchLiveNews}
              disabled={isLoadingRadar}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoadingRadar ? "animate-spin" : ""} />
              <span>{isLoadingRadar ? "Actualizando..." : "Actualizar Noticias"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {radarNews.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-3 shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      {item.source}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.publishedAt}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white leading-snug line-clamp-3">
                    {item.headline}
                  </h3>

                  {item.summary && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {item.summary}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleCopyHeadline(item)}
                    className="p-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                    title="Copiar Titular"
                  >
                    <Copy size={13} />
                    <span>Copiar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuoteInMesa(item)}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5 cursor-pointer"
                    title="Citar noticia para que Nora dé su lectura en la mesa"
                  >
                    <Mic size={13} className="text-cyan-400" />
                    <span>Citar en Mesa</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: B2B COMMERCIAL PIPELINE */}
      {activeTab === "B2B_LEADS" && (
        <div className="space-y-4">
          {/* Quick Add Form */}
          <form
            onSubmit={handleAddProspect}
            className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center gap-2.5"
          >
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 mr-1">
              <PlusCircle size={14} />
              <span>Auditar Nuevo Prospecto:</span>
            </span>
            <input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Empresa o comercio local..."
              className="flex-1 min-w-[180px] rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={newContact}
              onChange={(e) => setNewContact(e.target.value)}
              placeholder="WhatsApp o Email decisor..."
              className="w-48 rounded-lg bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="number"
              value={newPriceUsd}
              onChange={(e) => setNewPriceUsd(Number(e.target.value))}
              className="w-24 rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-xs font-mono text-emerald-300 focus:outline-none"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 cursor-pointer"
            >
              + Cargar Lead
            </button>
          </form>

          {/* Leads Table */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                    <th className="py-2.5 px-3">Empresa & Decisor</th>
                    <th className="py-2.5 px-3">Debilidades Detectadas</th>
                    <th className="py-2.5 px-3">Activos en /nexora_demos/</th>
                    <th className="py-2.5 px-3">Propuesta USD</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 text-right">Acción Comercial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-950/60">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{lead.companyName}</div>
                        <div className="text-[11px] text-slate-400">{lead.contact}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {lead.weaknesses.map((w) => (
                            <span
                              key={w}
                              className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/15 text-rose-300 border border-rose-500/20"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-emerald-300">
                        {lead.demoJinglePath.split("/").pop()}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-white">
                        USD {lead.estimatedValueUsd}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            lead.status === "PROPOSAL_SENT"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          disabled={activeLeadId === lead.id || isDispatching}
                          onClick={() => handleSendProposalWithDemo(lead)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer disabled:opacity-50"
                        >
                          {activeLeadId === lead.id ? "Despachando..." : "Enviar Propuesta"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
