"use client";

import React from "react";

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
    prompt: "El usuario ha seleccionado el pictograma: Baño. Necesito ir al baño. Responde de forma muy breve, empática y visual.",
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
];

interface NoraTEABoardProps {
  onSelectPictogram: (prompt: string, label: string) => void;
  isLoading?: boolean;
}

export function NoraTEABoard({ onSelectPictogram, isLoading = false }: NoraTEABoardProps) {
  return (
    <div className="w-full h-full flex flex-col p-4 overflow-y-auto">
      {/* CABECERA INFORMATIVA CON ALTA ACCESIBILIDAD COGNITIVA */}
      <div className="mb-4 text-center shrink-0">
        <h2 className="text-base sm:text-lg font-bold text-sky-300 flex items-center justify-center gap-2">
          <span>🧩</span> Tablero de Comunicación Aumentativa
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
          Toca una tarjeta grande para expresar lo que necesitas o cómo te sientes. Nora responderá de inmediato.
        </p>
      </div>

      {/* CUADRÍCULA DE PICTOGRAMAS (ADAPTATIVA: 2 COLUMNAS EN MÓVILES PEQUEÑOS, 3 EN TABLET/DESKTOP) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 max-w-2xl mx-auto w-full pb-6">
        {DEFAULT_PICTOGRAMS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={isLoading}
            onClick={() => onSelectPictogram(item.prompt, item.label)}
            role="button"
            tabIndex={0}
            aria-label={`Pictograma: ${item.label}. Toca para comunicar a Nora.`}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95 cursor-pointer shadow-lg select-none min-h-[110px] sm:min-h-[130px] ${item.bgColor} ${item.borderColor} ${
              isLoading ? "opacity-50 pointer-events-none" : "hover:bg-opacity-25"
            }`}
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span
              className="text-4xl sm:text-5xl mb-2 filter drop-shadow-md select-none transform transition-transform group-hover:scale-110"
              aria-hidden="true"
            >
              {item.emoji}
            </span>
            <span className="text-xs sm:text-sm font-bold text-white text-center leading-tight tracking-wide drop-shadow">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default NoraTEABoard;
