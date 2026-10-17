"use client";

import React, { useState } from "react";
import QRCode from "react-qr-code";
import { X, Share2, Copy, Check, MessageCircle, ExternalLink, Download } from "lucide-react";

interface NoraShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionUrl?: string;
  onInstallClick?: () => void;
  isInstallable?: boolean;
}

export function NoraShareModal({
  isOpen,
  onClose,
  productionUrl = "https://nora-itu-core.vercel.app",
  onInstallClick,
  isInstallable = false,
}: NoraShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareText = "¡Hola! Te invito a probar Nora Itu Core, la asistente de IA multimodal con orientación para no videntes (Lazarillo 360°), inclusión TEA y soporte académico. Pruébala aquí:";
  const shareMessageFull = `${shareText} ${productionUrl}`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessageFull)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(productionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Nora Itu Core - Asistente Multimodal",
          text: shareText,
          url: productionUrl,
        });
      } catch (err) {
        // Ignorar si el usuario cancela
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      style={{ zIndex: 9999 }}
    >
      <div
        className="relative w-full max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden"
        style={{ boxSizing: "border-box" }}
      >
        {/* BOTÓN CERRAR */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Cerrar ventana"
        >
          <X size={18} />
        </button>

        {/* TÍTULO & DESCRIPCIÓN */}
        <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-3">
          <Share2 size={20} className="text-indigo-400" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">Compartir & Instalar Nora</h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Escanea el código QR desde tu celular o comparte el acceso institucional por WhatsApp.
        </p>

        {/* CÓDIGO QR DINÁMICO */}
        <div className="p-3 bg-white rounded-xl shadow-md mb-4 flex items-center justify-center">
          <QRCode
            value={productionUrl}
            size={160}
            style={{ height: "auto", maxWidth: "100%", width: "160px" }}
            viewBox={`0 0 160 160`}
          />
        </div>

        <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-white/10 mb-4 max-w-full truncate">
          {productionUrl}
        </div>

        {/* ACCIONES DE DISTRIBUCIÓN */}
        <div className="w-full space-y-2">
          {/* BOTÓN WHATSAPP */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
          >
            <MessageCircle size={16} />
            <span>Compartir por WhatsApp</span>
          </a>

          {/* BOTÓN WEB SHARE NATIVO / COPIAR ENLACE */}
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-colors"
            >
              <Share2 size={14} />
              <span>Compartir</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-white/10 transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? "¡Copiado!" : "Copiar Enlace"}</span>
            </button>
          </div>

          {/* BOTÓN INSTALAR PWA SI ESTÁ DISPONIBLE */}
          {isInstallable && onInstallClick && (
            <button
              type="button"
              onClick={() => {
                onInstallClick();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition-all mt-1 cursor-pointer"
            >
              <Download size={15} />
              <span>Instalar como App Nativa</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default NoraShareModal;
