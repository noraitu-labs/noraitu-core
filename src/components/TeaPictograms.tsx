import React from 'react';
import { Calculator, BookOpen, FlaskConical, Palette, Compass } from 'lucide-react';

const pictogramMap: Record<string, { icon: any; label: string }> = {
  matematicas: { icon: Calculator, label: "Número / Calcular" },
  historia: { icon: BookOpen, label: "Libro / Pasado" },
  ciencia: { icon: FlaskConical, label: "Experimento / Descubrir" },
  arte: { icon: Palette, label: "Dibujo / Color" },
  geografia: { icon: Compass, label: "Mapa / Viaje" }
};

export function TeaPictograms({
  subject,
  onClick,
}: {
  subject: string;
  onClick?: (label: string, promptText: string) => void;
}) {
  const cleanKey = subject.toLowerCase().trim();
  const match = pictogramMap[cleanKey] || { icon: BookOpen, label: "Estudiar" };
  const Icon = match.icon;

  const promptTextMap: Record<string, string> = {
    matematicas: "Quiero resolver ejercicios de matemáticas paso a paso.",
    historia: "Explícame un acontecimiento histórico de forma clara y cronológica.",
    ciencia: "Hablemos de ciencia y experimentos del mundo natural.",
    arte: "Quiero crear o hablar sobre dibujos, técnicas y colores.",
    geografia: "Exploremos lugares, países y mapas del mundo.",
  };

  const promptText = promptTextMap[cleanKey] || `Quiero aprender sobre ${match.label}.`;

  const handleClick = () => {
    if (onClick) {
      onClick(match.label, promptText);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex flex-col items-center justify-center p-3 bg-zinc-800/90 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl border-2 border-dashed border-sky-500/40 hover:border-sky-400 w-28 h-28 shrink-0 text-center cursor-pointer shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "12px",
        backgroundColor: "#27272a",
        borderRadius: "12px",
        border: "2px dashed #38bdf8",
        width: "112px",
        height: "112px",
        textAlign: "center",
        flexShrink: 0,
        cursor: "pointer",
      }}
      title={`Seleccionar ${match.label}`}
    >
      <Icon
        className="w-10 h-10 text-sky-400 mb-2 transition-transform group-hover:scale-110"
        style={{ width: "40px", height: "40px", color: "#38bdf8", marginBottom: "6px" }}
      />
      <span
        className="text-[11px] font-bold text-white uppercase tracking-wider leading-tight"
        style={{ fontSize: "11px", fontWeight: "bold", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.03em" }}
      >
        {match.label}
      </span>
    </button>
  );
}

export default TeaPictograms;
