"use client";

import React, { useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export interface TEAPictogramItem {
  id: string;
  emoji: string;
  label: string;
  prompt: string;
  category: "necesidades" | "emociones" | "actividades";
  bgColor: string;
  borderColor: string;
}

const DEFAULT_PICTOGRAMS: TEAPictogramItem[] = [
  {
    id: "comer",
    emoji: "🍎",
    label: "Comer",
    prompt: "El usuario ha seleccionado el pictograma: Comer. Tengo hambre. Responde de forma muy breve, empática y visual.",
    category: "necesidades",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30 hover:border-amber-400",
  },
  {
    id: "agua",
    emoji: "💧",
    label: "Agua / Beber",
    prompt: "El usuario ha seleccionado el pictograma: Agua o Beber. Tengo sed. Responde de forma muy breve, empática y visual.",
    category: "necesidades",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30 hover:border-blue-400",
  },
  {
    id: "bano",
    emoji: "🚽",
    label: "Baño",
    prompt: "El usuario ha seleccionado el pictograma: Baño. Necesito ir al baño. Responde de forma muy breve, empática y visual con opciones numéricas muy sencillas.",
    category: "necesidades",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30 hover:border-cyan-400",
  },
  {
    id: "ayuda",
    emoji: "🫂",
    label: "Ayuda",
    prompt: "El usuario ha seleccionado el pictograma: Ayuda. Responde de forma muy breve, empática y visual.",
    category: "necesidades",
    bgColor: "bg-rose-500/10",
    borderColor: "border-rose-500/30 hover:border-rose-400",
  },
  {
    id: "jugar",
    emoji: "🧩",
    label: "Jugar",
    prompt: "El usuario ha seleccionado el pictograma: Jugar. Quiero hacer una actividad divertida o lúdica. Responde de forma muy breve, empática y visual.",
    category: "actividades",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30 hover:border-purple-400",
  },
  {
    id: "descansar",
    emoji: "🛋️",
    label: "Descansar / Pausa",
    prompt: "El usuario ha seleccionado el pictograma: Descansar. Necesito una pausa tranquila sin ruidos. Responde de forma muy breve, empática y visual.",
    category: "necesidades",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30 hover:border-emerald-400",
  },
  {
    id: "feliz",
    emoji: "😊",
    label: "Feliz / Bien",
    prompt: "El usuario ha seleccionado el pictograma: Feliz o Contento. Me siento bien. Responde de forma muy breve, empática y visual.",
    category: "emociones",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30 hover:border-yellow-400",
  },
  {
    id: "enojado",
    emoji: "😡",
    label: "Enojado / Frustrado",
    prompt: "El usuario ha seleccionado el pictograma: Enojado. Me siento molesto o sobrecargado. Responde con calma, de forma muy breve, empática y con lenguaje literal.",
    category: "emociones",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30 hover:border-red-400",
  },
  {
    id: "triste",
    emoji: "😢",
    label: "Triste",
    prompt: "El usuario ha seleccionado el pictograma: Triste. Necesito contención y calma. Responde de forma muy breve, empática y visual.",
    category: "emociones",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30 hover:border-indigo-400",
  },
  {
    id: "opcion_1",
    emoji: "1️⃣",
    label: "Opción 1",
    prompt: "Elijo la opción 1.",
    category: "actividades",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30 hover:border-emerald-400",
  },
  {
    id: "opcion_2",
    emoji: "2️⃣",
    label: "Opción 2",
    prompt: "Elijo la opción 2.",
    category: "actividades",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30 hover:border-blue-400",
  },
  {
    id: "si",
    emoji: "✅",
    label: "Sí",
    prompt: "Sí, de acuerdo.",
    category: "necesidades",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30 hover:border-emerald-400",
  },
  {
    id: "no",
    emoji: "❌",
    label: "No",
    prompt: "No, gracias.",
    category: "necesidades",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30 hover:border-red-400",
  },
];

interface NoraTEABoardProps {
  onSelectPictogram: (prompt: string, label: string) => void;
  isLoading?: boolean;
}

export function NoraTEABoard({ onSelectPictogram, isLoading = false }: NoraTEABoardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="fixed left-0 right-0 w-full border-t border-sky-500/20 bg-slate-900/95 backdrop-blur-md px-3 py-2 z-40"
      style={{
        bottom: "calc(3.5rem + env(safe-area-inset-bottom))",
      }}
    >
      {/* HEADER COMPACTO CON CONTROL PARA EXPANDIR / COLAPSAR TIPO TECLADO */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
          <span>🧩</span>
          <span>Pictogramas TEA (Toca para responder)</span>
        </span>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-white/5 transition-colors"
        >
          <span>{isExpanded ? "Ver menos" : "Ver todos"}</span>
          {isExpanded ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
      </div>

      {/* MODO EXPANDIDO (GRID MULTI-COLUMNA) O MODO COLAPSADO (TIRA HORIZONTAL COMPACTA) */}
      {isExpanded ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto pb-1">
          {DEFAULT_PICTOGRAMS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectPictogram(item.prompt, item.label)}
              aria-label={`Pictograma: ${item.label}`}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all active:scale-95 cursor-pointer select-none ${item.bgColor} ${item.borderColor} ${
                isLoading ? "opacity-50 pointer-events-none" : "hover:bg-opacity-25"
              }`}
            >
              <span className="text-2xl mb-1 filter drop-shadow select-none">{item.emoji}</span>
              <span className="text-[10px] font-semibold text-white text-center leading-none truncate max-w-full">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-sky-500/20">
          {DEFAULT_PICTOGRAMS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={isLoading}
              onClick={() => onSelectPictogram(item.prompt, item.label)}
              aria-label={`Pictograma: ${item.label}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shrink-0 transition-all active:scale-95 cursor-pointer select-none ${item.bgColor} ${item.borderColor} ${
                isLoading ? "opacity-50 pointer-events-none" : "hover:bg-opacity-25"
              }`}
            >
              <span className="text-xl filter drop-shadow select-none">{item.emoji}</span>
              <span className="text-xs font-semibold text-white whitespace-nowrap">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default NoraTEABoard;
