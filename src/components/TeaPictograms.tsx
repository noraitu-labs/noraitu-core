import React from 'react';
import { Calculator, BookOpen, FlaskConical, Palette, Compass } from 'lucide-react';

const pictogramMap: Record<string, { icon: any; label: string }> = {
  matematicas: { icon: Calculator, label: "Número / Calcular" },
  historia: { icon: BookOpen, label: "Libro / Pasado" },
  ciencia: { icon: FlaskConical, label: "Experimento / Descubrir" },
  arte: { icon: Palette, label: "Dibujo / Color" },
  geografia: { icon: Compass, label: "Mapa / Viaje" }
};

export function TeaPictograms({ subject }: { subject: string }) {
  const cleanKey = subject.toLowerCase().trim();
  const match = pictogramMap[cleanKey] || { icon: BookOpen, label: "Estudiar" };
  const Icon = match.icon;
  return (
    <div
      className="flex flex-col items-center justify-center p-4 bg-zinc-800 rounded-xl border-2 border-dashed border-zinc-600 w-32 h-32 text-center"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backgroundColor: "#27272a",
        borderRadius: "12px",
        border: "2px dashed #52525b",
        width: "128px",
        height: "128px",
        textAlign: "center"
      }}
    >
      <Icon
        className="w-12 h-12 text-blue-400 mb-2 animate-pulse"
        style={{ width: "48px", height: "48px", color: "#60a5fa", marginBottom: "8px" }}
      />
      <span
        className="text-xs font-bold text-white uppercase tracking-wider"
        style={{ fontSize: "12px", fontWeight: "bold", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        {match.label}
      </span>
    </div>
  );
}

export default TeaPictograms;
