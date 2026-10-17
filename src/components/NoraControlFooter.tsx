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
    <footer className="border-t border-white/10 bg-slate-900/90 backdrop-blur-md p-3 sm:px-6 z-30 shrink-0">
      {/* PREVIEW DE IMAGEN ADJUNTA SI EXISTE */}
      {selectedImageBase64 && (
        <div className="mb-2 inline-flex items-center gap-2 bg-slate-800 border border-white/10 px-2.5 py-1 rounded-lg">
          <img
            src={selectedImageBase64}
            alt="Preview"
            className="w-6 h-6 object-cover rounded"
          />
          <span className="text-xs text-slate-300">Imagen adjunta</span>
          <button
            onClick={() => onSelectImage(null)}
            className="text-slate-400 hover:text-rose-400 p-0.5"
            title="Quitar imagen"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* FOOTER FLEXBOX ÚNICO Y LIMPIO */}
      <div className="flex items-center gap-2 bg-slate-950 border border-white/15 rounded-xl px-3 py-1.5 shadow-inner">
        {/* BOTÓN CÁMARA / VISIÓN */}
        <button
          type="button"
          onClick={onToggleCamera}
          className={`p-2 rounded-lg transition-colors ${
            isCameraActive
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title={isCameraActive ? "Apagar cámara" : "Activar telemetría óptica"}
        >
          <Camera size={18} />
        </button>

        {/* BOTÓN ADJUNTAR IMAGEN */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
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
          className={`p-2 rounded-lg transition-colors ${
            isRecording
              ? "bg-rose-500/20 text-rose-400 animate-pulse"
              : "text-slate-400 hover:text-slate-200"
          }`}
          title={isRecording ? "Detener grabación" : "Hablar con Nora"}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {/* CAMPO DE ENTRADA DE TEXTO */}
        <input
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? "Escuchando tu voz..." : placeholder}
          className="flex-1 bg-transparent border-none text-white text-sm outline-none px-2 placeholder:text-slate-500"
        />

        {/* BOTÓN ENVIAR */}
        <button
          type="button"
          onClick={onSendMessage}
          disabled={!canSend}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            canSend
              ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm"
              : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50"
          }`}
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
