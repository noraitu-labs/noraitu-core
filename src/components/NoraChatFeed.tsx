"use client";

import React from "react";
import { Bot, User, Volume2, Copy, Check, Sparkles } from "lucide-react";
import { ChatMessage } from "@/hooks/useNoraChat";
import { NoraMode } from "@/lib/prompts/types";
import { TeaPictograms } from "@/components/TeaPictograms";

interface NoraChatFeedProps {
  messages: ChatMessage[];
  currentResponseStream?: string;
  isStreaming?: boolean;
  mode: NoraMode;
  userName?: string;
  onSpeakText: (text: string) => void;
  chatBottomRef: React.RefObject<HTMLDivElement | null>;
}

export function NoraChatFeed({
  messages,
  currentResponseStream = "",
  isStreaming = false,
  mode,
  userName = "Javier",
  onSpeakText,
  chatBottomRef,
}: NoraChatFeedProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
      {/* MODO TEA: PICTOGRAMAS EDUCATIVOS INTEGRADOS */}
      {mode === "tea" && (
        <div className="p-3 bg-slate-900/60 border border-sky-500/20 rounded-xl mb-2">
          <div className="text-xs font-bold text-sky-400 mb-2 flex items-center gap-1.5">
            <span>🧩 Pictogramas de Apoyo Cognitivo</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            <TeaPictograms subject="matematicas" />
            <TeaPictograms subject="historia" />
            <TeaPictograms subject="ciencia" />
            <TeaPictograms subject="arte" />
            <TeaPictograms subject="geografia" />
          </div>
        </div>
      )}

      {/* ESTADO VACÍO (BIENVENIDA PERSONALIZADA CON CALIDEZ INSTITUCIONAL) */}
      {messages.length === 0 && !isStreaming && (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto my-auto py-12 text-slate-400">
          <div className="w-20 h-20 mb-4 relative shrink-0">
            <img
              src="/avatar-nora.png"
              alt="Nora"
              className="w-20 h-20 rounded-full border-2 border-indigo-500/50 shadow-lg object-cover"
              style={{ width: "80px", height: "80px", maxWidth: "80px", maxHeight: "80px" }}
            />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Hola {userName}, soy Nora</h2>
          <p className="text-xs leading-relaxed text-slate-400">
            {mode === "lazarillo"
              ? "Asistente de orientación visual con coordenadas horarias y análisis seguro de superficie."
              : mode === "tea"
              ? "Interacción estructurada, lenguaje literal sin metáforas y soporte pedagógico predecible."
              : "Asistente cognitivo multimodal de excelencia académica e institucional. Estoy aquí para acompañarte."}
          </p>
        </div>
      )}

      {/* LISTA DE MENSAJES */}
      {messages.map((msg) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[88%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
          >
            {!isUser && (
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={16} className="text-indigo-400" />
              </div>
            )}

            <div
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                isUser
                  ? "bg-indigo-600 text-white rounded-tr-xs"
                  : "bg-slate-900 border border-white/10 text-slate-100 rounded-tl-xs shadow-md"
              }`}
            >
              {msg.imageBase64 && (
                <img
                  src={msg.imageBase64}
                  alt="Adjunto"
                  className="max-w-xs max-h-48 rounded-lg mb-2 object-cover border border-white/10"
                />
              )}

              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* ACCIONES DE MENSAJE DEL ASISTENTE */}
              {!isUser && (
                <div className="flex items-center gap-2 mt-2 pt-1 border-t border-white/5">
                  <button
                    onClick={() => onSpeakText(msg.content)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                    title="Escuchar respuesta"
                  >
                    <Volume2 size={13} />
                  </button>
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copiar texto"
                  >
                    {copiedId === msg.id ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : (
                      <Copy size={13} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* RESPUESTA EN STREAMING */}
      {isStreaming && currentResponseStream && (
        <div className="flex gap-3 max-w-[88%] mr-auto">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
            <Bot size={16} className="text-indigo-400" />
          </div>
          <div className="rounded-2xl px-4 py-3 text-sm leading-relaxed bg-slate-900 border border-white/10 text-slate-100 rounded-tl-xs shadow-md">
            <div className="whitespace-pre-wrap">{currentResponseStream}</div>
          </div>
        </div>
      )}

      <div ref={chatBottomRef} />
    </div>
  );
}

export default NoraChatFeed;
