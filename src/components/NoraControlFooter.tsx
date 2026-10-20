"use client";

import React, { useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Camera,
  Image as ImageIcon,
  Send,
  Loader2,
  X,
} from "lucide-react";

interface NoraControlFooterProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  isLoading: boolean;
  selectedImageBase64: string | null;
  onSelectImage: (base64: string | null) => void;
  placeholder?: string;
}

export function NoraControlFooter({
  inputText,
  onInputChange,
  onSendMessage,
  isRecording,
  onToggleRecording,
  isCameraActive,
  onToggleCamera,
  isLoading,
  selectedImageBase64,
  onSelectImage,
  placeholder = "Escribe tu consulta o pide orientación espacial...",
}: NoraControlFooterProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onSelectImage(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Resetea para permitir subir la misma imagen si se desea
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  const canSend = !isLoading && (inputText.trim().length > 0 || selectedImageBase64 !== null || isCameraActive);

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 w-full z-50 border-t border-white/10 bg-slate-950/95 backdrop-blur-md p-2.5 sm:p-3 sm:px-6 box-border"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        zIndex: 50,
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      {/* PREVIEW DE IMAGEN ADJUNTA SI EXISTE */}
      {selectedImageBase64 && (
        <div className="mb-2 inline-flex items-center gap-2 bg-slate-800 border border-white/10 px-2.5 py-1 rounded-lg max-w-full truncate">
          <img
            src={selectedImageBase64}
            alt="Preview"
            className="w-6 h-6 object-cover rounded shrink-0"
          />
          <span className="text-xs text-slate-300 truncate">Imagen adjunta</span>
          <button
            onClick={() => onSelectImage(null)}
            className="text-slate-400 hover:text-rose-400 p-0.5 shrink-0"
            title="Quitar imagen"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* FOOTER FLEXBOX ÚNICO, FLUIDO Y SIN DESBORDAMIENTO */}
      <div
        className="w-full max-w-full box-border flex items-center gap-1.5 sm:gap-2 bg-slate-950 border border-white/15 rounded-xl px-2 sm:px-3 py-1.5 shadow-inner overflow-hidden"
        style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflow: "hidden", display: "flex", alignItems: "center" }}
      >
        {/* BOTÓN CÁMARA / VISIÓN */}
        <button
          type="button"
          onClick={onToggleCamera}
          className={`p-2 rounded-lg transition-colors shrink-0 flex-shrink-0 ${
            isCameraActive
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
          style={{ flexShrink: 0 }}
          title={isCameraActive ? "Apagar cámara" : "Activar telemetría óptica"}
        >
          <Camera size={18} />
        </button>

        {/* BOTÓN ADJUNTAR IMAGEN */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0 flex-shrink-0"
          style={{ flexShrink: 0 }}
          title="Adjuntar imagen para análisis"
        >
          <ImageIcon size={18} />
        </button>
        {/* INPUT DE ARCHIVO TOTALMENTE OCULTO FUERA DEL FLUJO VISUAL */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* BOTÓN MICRÓFONO / VOZ */}
        <button
          type="button"
          onClick={onToggleRecording}
          className={`p-2 rounded-lg transition-colors shrink-0 flex-shrink-0 ${
            isRecording
              ? "bg-rose-500/20 text-rose-400 animate-pulse"
              : "text-slate-400 hover:text-slate-200"
          }`}
          style={{ flexShrink: 0 }}
          title={isRecording ? "Detener grabación" : "Hablar con Nora"}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* CAMPO DE ENTRADA DE TEXTO ADAPTATIVO */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Escuchando tu voz..." : placeholder}
          className="flex-1 w-full min-w-0 truncate bg-transparent border-none text-white text-sm outline-none px-1.5 sm:px-2 placeholder:text-slate-500 placeholder:truncate"
          style={{ flex: "1 1 0%", width: "100%", minWidth: 0, textOverflow: "ellipsis" }}
        />

        {/* BOTÓN ENVIAR */}
        <button
          type="button"
          onClick={onSendMessage}
          disabled={!canSend}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 flex-shrink-0 ${
            canSend
              ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm"
              : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
          }`}
          style={{ flexShrink: 0, width: "32px", height: "32px" }}
          title="Enviar consulta"
        >
          {isLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
        </button>
      </div>
    </footer>
  );
}

export default NoraControlFooter;
