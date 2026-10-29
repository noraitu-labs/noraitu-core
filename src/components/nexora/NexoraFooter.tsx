"use client";

/**
 * NEXORA ONE ENGINE — OFFICIAL INSTITUTIONAL FOOTER
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Component: src/components/nexora/NexoraFooter.tsx
 */

import React from "react";
import { Mail, Phone, Shield } from "lucide-react";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

export function NexoraFooter() {
  return (
    <footer className="w-full bg-slate-950 border-t border-slate-800/90 px-4 py-2 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
      <div className="flex items-center gap-2">
        <Shield size={13} className="text-cyan-400" />
        <span className="font-bold text-slate-200">
          © 2025 NexoraOne — {NEXORA_ENGINE_NAME} | Signature: {NEXORA_SIGNATURE}
        </span>
        <span className="hidden sm:inline text-slate-600">•</span>
        <span className="hidden sm:inline text-slate-400">
          Todos los derechos reservados.
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-4 font-mono">
        <a
          href="tel:3786414533"
          className="flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200 transition-colors"
        >
          <Phone size={12} />
          <span>Tel: 3786414533</span>
        </a>
        <a
          href="mailto:nexoraone@nexativanews.com.ar"
          className="flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 transition-colors"
        >
          <Mail size={12} />
          <span>nexoraone@nexativanews.com.ar</span>
        </a>
      </div>
    </footer>
  );
}

