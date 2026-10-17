"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNoraVision } from "@/hooks/useNoraVision";
import { useNoraAudio } from "@/hooks/useNoraAudio";
import { useNoraChat } from "@/hooks/useNoraChat";
import { useNoraDeviceCapabilities } from "@/hooks/useNoraDeviceCapabilities";
import { NoraMode } from "@/lib/prompts/types";
import { NoraHeader } from "@/components/NoraHeader";
import { NoraVisionViewport } from "@/components/NoraVisionViewport";
import { NoraChatFeed } from "@/components/NoraChatFeed";
import { NoraControlFooter } from "@/components/NoraControlFooter";
import NoraRealtimeCallModal from "@/components/NoraRealtimeCallModal";

/**
 * NoraPage: Orquestador visual declarativo (< 250 líneas).
 * Desacoplado de WebRTC, SDKs de visión directa y streaming crudo.
 * Consume estrictamente los custom hooks: useNoraVision, useNoraAudio, useNoraChat y useNoraDeviceCapabilities.
 */
export default function NoraPage() {
  const [mode, setMode] = useState<NoraMode>("executive");
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // 1. Hook Óptico: Telemetría de Píxeles + COCO-SSD local
  const vision = useNoraVision();

  // 2. Hook de Audio: Micrófono + STT Whisper + Fallback TTS WebSpeech
  const audio = useNoraAudio();

  // 3. Hook de Capacidades Nativas del Dispositivo: Screen Wake Lock, Identidad ("Javier") y GPS
  const device = useNoraDeviceCapabilities({
    userName: "Javier",
    autoRequestWakeLock: vision.isCameraActive || audio.isRecording || isCallModalOpen,
    enableGeolocation: true,
  });

  // 4. Hook de Chat: Orquestador de streaming y memoria persistente
  const chat = useNoraChat({
    initialMode: mode === "executive" ? "general" : mode,
  });

  // Sincronizar el modo de chat y calibración acústica de voz al cambiar en el Header
  const handleModeChange = useCallback(
    (newMode: NoraMode) => {
      setMode(newMode);
      audio.setCognitiveMode(newMode);
      chat.setMode(newMode === "executive" ? "general" : newMode);
    },
    [chat, audio]
  );

  // Autoscroll del feed de chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages, chat.currentResponseStream]);

  // Manejo de envío de mensajes con inyección automática de telemetría visual, ubicación y nombre del usuario
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() && !selectedImageBase64 && !vision.isCameraActive) return;

    let visualTelemetryPayload: string | null = null;
    let imagePayload = selectedImageBase64;

    // Si la cámara está activa, capturar y analizar fotograma con telemetría horaria
    if (vision.isCameraActive) {
      const snap = await vision.captureAndAnalyze();
      imagePayload = snap.imageBase64;
      visualTelemetryPayload = snap.formattedSummary;
    }

    const currentText = inputText;
    setInputText("");
    setSelectedImageBase64(null);

    const reply = await chat.sendMessage({
      text: currentText || (vision.isCameraActive ? "¿Qué observas frente a mí?" : "Describe la imagen adjunta"),
      userName: device.userName,
      deviceLocation: device.location,
      imageBase64: imagePayload,
      visualTelemetry: visualTelemetryPayload,
    });

    // Si está en modo lazarillo, reproducir respuesta automáticamente por voz
    if (reply && mode === "lazarillo") {
      audio.speakText(reply, undefined, "lazarillo");
    }
  }, [inputText, selectedImageBase64, vision, chat, mode, audio, device.userName, device.location]);

  // Manejo de grabación por voz (transcripción automática al input)
  const handleToggleRecording = useCallback(async () => {
    if (audio.isRecording) {
      const recognizedText = await audio.stopRecordingAndTranscribe();
      if (recognizedText) {
        setInputText(recognizedText);
      }
    } else {
      audio.startRecording();
    }
  }, [audio]);

  return (
    <main
      className="flex flex-col h-dvh w-full overflow-hidden bg-slate-950 text-slate-100 relative"
      style={{ height: "100dvh", maxHeight: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      {/* 1. Header Modular con selector de modos y exportaciones */}
      <NoraHeader
        currentMode={mode}
        onModeChange={handleModeChange}
        onOpenCallModal={() => setIsCallModalOpen(true)}
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        audioEngine={audio.activeEngine}
      />

      {/* 2. HUD y Viewport Óptico Flotante */}
      <NoraVisionViewport
        isCameraActive={vision.isCameraActive}
        onCloseCamera={vision.stopCamera}
        videoRef={vision.videoRef}
        canvasRef={vision.canvasRef}
        alerts={vision.alerts}
        telemetry={vision.telemetry}
        isProcessing={vision.isProcessing}
      />

      {/* 3. Feed de Chat y Pictogramas TEA (Desplazable en el centro) */}
      <div className="flex-1 overflow-y-auto w-full min-h-0" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
        <NoraChatFeed
          messages={chat.messages}
          currentResponseStream={chat.currentResponseStream}
          isStreaming={chat.isStreaming}
          mode={mode}
          userName={device.userName}
          onSpeakText={(text) => audio.speakText(text)}
          chatBottomRef={chatBottomRef}
        />
      </div>

      {/* 4. Footer de Control Único Limpio (Siempre anclado al fondo) */}
      <NoraControlFooter
        inputText={inputText}
        onInputChange={setInputText}
        onSendMessage={handleSendMessage}
        isRecording={audio.isRecording}
        onToggleRecording={handleToggleRecording}
        isCameraActive={vision.isCameraActive}
        onToggleCamera={() => (vision.isCameraActive ? vision.stopCamera() : vision.startCamera())}
        isLoading={chat.isLoading}
        selectedImageBase64={selectedImageBase64}
        onSelectImage={setSelectedImageBase64}
      />

      {/* Modal de Llamada en Tiempo Real */}
      {isCallModalOpen && (
        <NoraRealtimeCallModal
          isOpen={isCallModalOpen}
          onClose={() => setIsCallModalOpen(false)}
        />
      )}
    </main>
  );
}
