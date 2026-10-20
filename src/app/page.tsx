"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useNoraVision } from "@/hooks/useNoraVision";
import { useNoraAudio } from "@/hooks/useNoraAudio";
import { useNoraChat } from "@/hooks/useNoraChat";
import { useNoraDeviceCapabilities } from "@/hooks/useNoraDeviceCapabilities";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useNoraGestures } from "@/hooks/useNoraGestures";
import { NoraMode } from "@/lib/prompts/types";
import { NoraHeader } from "@/components/NoraHeader";
import { NoraVisionViewport } from "@/components/NoraVisionViewport";
import { NoraChatFeed } from "@/components/NoraChatFeed";
import { NoraControlFooter } from "@/components/NoraControlFooter";
import NoraRealtimeCallModal from "@/components/NoraRealtimeCallModal";
import NoraShareModal from "@/components/NoraShareModal";
import NoraInstallBanner from "@/components/NoraInstallBanner";
import NoraTEABoard from "@/components/NoraTEABoard";
import NoraHistorySidebar from "@/components/NoraHistorySidebar";

/**
 * NoraPage: Orquestador visual declarativo (< 250 líneas).
 * Desacoplado de WebRTC, SDKs de visión directa y streaming crudo.
 * Consume estrictamente los custom hooks: useNoraVision, useNoraAudio, useNoraChat, useNoraDeviceCapabilities y usePWAInstall.
 */
export default function NoraPage() {
  const [mode, setMode] = useState<NoraMode>("executive");
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);

  const pwa = usePWAInstall();

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
    async (newMode: NoraMode) => {
      setMode(newMode);
      audio.setCognitiveMode(newMode);
      chat.setMode(newMode === "executive" ? "general" : newMode);

      if (newMode === "lazarillo") {
        // 1. Encendido inmediato del hardware óptico
        try {
          await vision.startCamera("environment");
          // 2. Feedback acústico inmediato para personas no videntes
          audio.speakText("Modo Lazarillo activado, cámara encendida.", undefined, "lazarillo");
        } catch (e) {
          console.warn("[page.tsx] Error al auto-iniciar cámara en modo lazarillo:", e);
        }
      } else {
        // Si salimos de modo Lazarillo y la cámara estaba activa, la apagamos para ahorrar batería
        if (vision.isCameraActive) {
          vision.stopCamera();
        }
      }
    },
    [chat, audio, vision]
  );

  // Desactivar scroll restoration nativo para evitar desfase en PWA standalone
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo(0, 0);

      const resetScroll = () => {
        window.scrollTo(0, 0);
      };

      window.addEventListener("scroll", resetScroll);
      window.addEventListener("orientationchange", resetScroll);
      return () => {
        window.removeEventListener("scroll", resetScroll);
        window.removeEventListener("orientationchange", resetScroll);
      };
    }
  }, []);

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
  }, [inputText, selectedImageBase64, vision, chat, device.userName, device.location]);

  // Selección directa e instantánea de pictogramas TEA (dispara inferencia autónoma sin esperar "Enviar")
  const handleSelectPictogram = useCallback(
    async (label: string, promptText: string) => {
      // Interrupción suave (Barge-in): si Nora está hablando, cancelar antes de iniciar nueva consulta
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      audio.stopSpeaking();

      await chat.sendMessage({
        text: promptText,
        userName: device.userName,
        deviceLocation: device.location,
        imageBase64: null,
        visualTelemetry: null,
      });
    },
    [chat, device.userName, device.location, audio]
  );

  // Auto-TTS Reactivo para Accesibilidad (a11y) Universal (Lazarillo, TEA, y General):
  // Escucha cuando el asistente termina de generar su mensaje (isLoading pasa a false) y lo reproduce en voz alta automáticamente.
  const lastSpokenMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Si aún está generando o en streaming, esperar a que complete
    if (chat.isLoading || chat.isStreaming) return;

    if (chat.messages.length === 0) return;

    const lastMessage = chat.messages[chat.messages.length - 1];

    // Solo reproducir si es del asistente y no ha sido reproducido ya
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      lastMessage.content &&
      lastMessage.id !== lastSpokenMsgIdRef.current
    ) {
      lastSpokenMsgIdRef.current = lastMessage.id;

      // Interrupción suave (Barge-in): cancelar cualquier audio previo para evitar superposición
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      // Reproducir mediante speakText (el cual aplica automáticamente sanitizeForTTS y calibración adaptativa por modo)
      audio.speakText(lastMessage.content, undefined, mode);
    }
  }, [chat.isLoading, chat.isStreaming, chat.messages, mode, audio]);

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

  // Toggle bidireccional de cámara desde el footer
  const handleToggleCamera = useCallback(async () => {
    if (vision.isCameraActive) {
      vision.stopCamera();
    } else {
      try {
        await vision.startCamera("environment");
        if (mode === "lazarillo") {
          audio.speakText("Cámara encendida.", undefined, "lazarillo");
        }
      } catch (err) {
        audio.speakText("No se pudo encender la cámara. Comprueba los permisos.", undefined, "lazarillo");
      }
    }
  }, [vision, mode, audio]);

  // ═════════════════════════════════════════════════════════════════════════════
  // MOTOR DE TRANSMISIÓN Y AUDIODESCRIPCIÓN CONTINUA EN MODO LAZARILLO (2000ms)
  // ═════════════════════════════════════════════════════════════════════════════
  const isContinuousLoopRunningRef = useRef<boolean>(false);
  const lastSpokenTelemetryRef = useRef<string>("");

  useEffect(() => {
    let intervalId: any = null;

    if (mode === "lazarillo" && vision.isCameraActive) {
      intervalId = setInterval(async () => {
        if (isContinuousLoopRunningRef.current || vision.isProcessing || chat.isStreaming || chat.isLoading) {
          return;
        }

        try {
          isContinuousLoopRunningRef.current = true;
          const snap = await vision.captureAndAnalyze();

          // Si el análisis local ya detectó peligro inminente (< 1m), la alerta reflexiva ya sonó.
          // Si no hubo alerta reflexiva y el resumen óptico cambió significativamente, sintetizar audiodescripción:
          if (snap.formattedSummary && snap.formattedSummary !== lastSpokenTelemetryRef.current && !snap.criticalHazard) {
            lastSpokenTelemetryRef.current = snap.formattedSummary;
            audio.speakText(snap.formattedSummary, undefined, "lazarillo");
          }
        } catch (err) {
          console.warn("[page.tsx Lazarillo Loop]:", err);
        } finally {
          isContinuousLoopRunningRef.current = false;
        }
      }, 2000);
    } else {
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [mode, vision.isCameraActive, vision, chat.isStreaming, chat.isLoading, audio]);

  // Hook de Gestos Físicos de Accesibilidad (Shake to Wake 3x o Long Press de 3 segundos):
  // Activa el perfil Lazarillo y enciende el hardware óptico sin requerir interacción visual
  useNoraGestures({
    onTriggerLazarillo: useCallback(() => {
      handleModeChange("lazarillo");
    }, [handleModeChange]),
    enabled: true,
  });

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
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
        messages={chat.messages}
        isStreaming={chat.isStreaming}
        audioEngine={audio.activeEngine}
      />

      {/* Solapa Lateral Solapada a la Izquierda con Historial y Firma de Autor (Estilo Top Mundial) */}
      <NoraHistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        currentSessionId={chat.sessionId}
        onSelectSession={(sid) => {
          chat.switchSession(sid);
          setIsHistoryOpen(false);
        }}
        onNewChat={() => {
          chat.startNewChat();
          setIsHistoryOpen(false);
        }}
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

      {/* 3. Área Central: Feed de Chat Continuo (Siempre presente para ver el historial y lo que dice Nora) */}
      <div className="flex-1 overflow-y-auto w-full min-h-0" style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
        <NoraChatFeed
          messages={chat.messages}
          currentResponseStream={chat.currentResponseStream}
          isStreaming={chat.isStreaming}
          mode={mode}
          userName={device.userName}
          onSpeakText={(text) => audio.speakText(text)}
          onSelectPictogram={handleSelectPictogram}
          chatBottomRef={chatBottomRef}
        />
      </div>

      {/* 3.1. Tablero de Comunicación Aumentativa TEA (Justo por encima del input, tipo teclado de pictogramas) */}
      {mode === "tea" && (
        <NoraTEABoard
          onSelectPictogram={(prompt, label) => handleSelectPictogram(label, prompt)}
          isLoading={chat.isLoading || chat.isStreaming}
        />
      )}

      {/* 4. Footer de Control Único (SIEMPRE VISIBLE en todos los modos para responder por texto o micrófono) */}
      <NoraControlFooter
        inputText={inputText}
        onInputChange={setInputText}
        onSendMessage={handleSendMessage}
        isRecording={audio.isRecording}
        onToggleRecording={handleToggleRecording}
        isCameraActive={vision.isCameraActive}
        onToggleCamera={handleToggleCamera}
        isLoading={chat.isLoading}
        selectedImageBase64={selectedImageBase64}
        onSelectImage={setSelectedImageBase64}
      />

      {/* Banner Flotante de Instalación PWA Nativa */}
      <NoraInstallBanner
        isInstallable={pwa.isInstallable}
        onInstall={pwa.triggerInstall}
      />

      {/* Modal de Distribución y Código QR */}
      {isShareModalOpen && (
        <NoraShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          productionUrl="https://nora-itu-core.vercel.app"
          isInstallable={pwa.isInstallable}
          onInstallClick={pwa.triggerInstall}
        />
      )}

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
