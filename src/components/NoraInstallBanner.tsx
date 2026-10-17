"use client";

import React, { useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

interface NoraInstallBannerProps {
  isInstallable: boolean;
  onInstall: () => void;
}

export function NoraInstallBanner({ isInstallable, onInstall }: NoraInstallBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-slate-900/95 border border-indigo-500/40 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-slideUp"
      style={{ zIndex: 990 }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0">
          <Smartphone size={20} className="text-indigo-400" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate">¿Deseas instalar Nora?</div>
          <div className="text-[11px] text-slate-400 leading-tight">
            Acceso rápido e integración nativa con tu dispositivo.
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onInstall}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <Download size={13} />
          <span>Instalar</span>
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          title="Descartar por ahora"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

export default NoraInstallBanner;
