"use client";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — MODAL DE COMPARTIR CON CÓDIGO QR Y PWA
//  Generación de código QR dinámico + Copiar Enlace + Instalar App
// ══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  Smartphone,
  ExternalLink,
  Sparkles,
} from "lucide-react";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
}

export function ShareModal({
  isOpen,
  onClose,
  url = "https://nexora-one-engine.vercel.app",
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installStatus, setInstallStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Error al copiar enlace:", err);
    }
  };

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstallStatus("¡Nexora OS instalado correctamente!");
      }
      setDeferredPrompt(null);
    } else {
      // Instrucciones universales para PWA si el navegador ya la tiene o en iOS/Safari
      const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
      if (isIos) {
        setInstallStatus("En Safari: Tocá el botón Compartir y seleccioná 'Agregar a Inicio'.");
      } else {
        setInstallStatus(
          "PWA lista: Hacé clic en el ícono de instalar en la barra del navegador o abrilo desde Chrome/Edge."
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900/95 border border-cyan-500/40 rounded-2xl shadow-2xl p-6 text-slate-100 flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header con insignia By Nora */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] font-mono font-semibold text-cyan-300">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>NEXORA OS • BY NORA</span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Conectar Móvil o Compartir
          </h3>
          <p className="text-xs text-slate-400">
            Escaneá el código para abrir la estación industrial en tu smartphone o PWA.
          </p>
        </div>

        {/* Contenedor del Código QR de alto contraste */}
        <div className="p-4 bg-white rounded-2xl shadow-xl shadow-cyan-950/50 flex items-center justify-center border-4 border-slate-950">
          <QRCode
            value={url}
            size={180}
            bgColor="#FFFFFF"
            fgColor="#050B14"
            level="M"
          />
        </div>

        {/* Display de URL con botón de copiar integrado */}
        <div className="w-full flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
          <span className="flex-1 truncate text-slate-300 pl-1">{url}</span>
          <button
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold text-xs transition-all ${
              copied
                ? "bg-emerald-500 text-slate-950 font-bold"
                : "bg-cyan-600 hover:bg-cyan-500 text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>

        {/* Botones de acción inferior */}
        <div className="w-full grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
          >
            <Share2 className="w-4 h-4 text-cyan-400" />
            <span>Copiar Enlace</span>
          </button>

          <button
            onClick={handleInstallApp}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
          >
            <Download className="w-4 h-4 text-slate-950" />
            <span>Instalar App</span>
          </button>
        </div>

        {/* Mensaje de estado PWA si aplica */}
        {installStatus && (
          <div className="w-full p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-[11px] text-cyan-200 text-center leading-snug animate-in fade-in">
            {installStatus}
          </div>
        )}
      </div>
    </div>
  );
}

