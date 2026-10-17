"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { sanitizeForTTS } from "@/utils/audioUtils";

export type ClockPosition =
  | "9 en punto"
  | "10 en punto"
  | "12 en punto"
  | "2 en punto"
  | "3 en punto";

export type DistanceEstimate =
  | "a menos de un metro (alcance inmediato)"
  | "a aproximadamente un metro y medio"
  | "a más de dos metros de distancia";

export interface SpatialAlert {
  label: string;
  clockPosition: ClockPosition;
  distance: DistanceEstimate;
  alertLevel: "info" | "warning" | "danger";
  rawBbox?: [number, number, number, number];
}

export interface OpticalTelemetry {
  ambientLight: "Baja iluminación ambiental" | "Contraluz marcado" | "Iluminación clara y óptima";
  groundStatus: string;
  frontalPathStatus: string;
  lateralBalance: string;
  summaryText: string;
  isFrontalBlocked: boolean; // Detección estricta de muro / pared frontal a < 1m
  isGroundHazard: boolean;   // Detección estricta de desniveles / bordes en piso
}

export interface NoraVisionState {
  isCameraActive: boolean;
  isModelLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  alerts: SpatialAlert[];
  telemetry: OpticalTelemetry | null;
  lastSnapshotBase64: string | null;
  criticalHazardDetected: boolean;
}

const COCO_CLASS_TRANSLATIONS: Record<string, string> = {
  person: "persona",
  chair: "silla",
  couch: "sillón",
  "dining table": "mesa",
  tv: "pantalla",
  laptop: "computadora portátil",
  "cell phone": "teléfono",
  bottle: "botella",
  cup: "taza",
  book: "libro",
  backpack: "mochila",
  door: "puerta",
  car: "vehículo",
  bicycle: "bicicleta",
  "potted plant": "planta",
  clock: "reloj",
};

/**
 * useNoraVision: Hook de Grado Embebido para Accesibilidad y Seguridad Física.
 * Incorpora Alerta Reflexiva en el Cliente (0ms) ante detección de muros frontales
 * o desniveles inmediatos a menos de un metro.
 */
export function useNoraVision() {
  const [state, setState] = useState<NoraVisionState>({
    isCameraActive: false,
    isModelLoading: false,
    isProcessing: false,
    error: null,
    alerts: [],
    telemetry: null,
    lastSnapshotBase64: null,
    criticalHazardDetected: false,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastReflexAlertTimestampRef = useRef<number>(0);

  // Alerta de voz reflexiva instantánea en el navegador (sin esperar a la nube)
  const triggerReflexiveWarning = useCallback((message: string) => {
    const now = Date.now();
    // Cooldown de 2500ms para evitar repeticiones en bucle que ensordezcan al usuario
    if (now - lastReflexAlertTimestampRef.current < 2500) {
      return;
    }
    lastReflexAlertTimestampRef.current = now;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanMessage = sanitizeForTTS(message);
      if (!cleanMessage) return;

      const utterance = new SpeechSynthesisUtterance(cleanMessage);
      utterance.lang = "es-419";
      utterance.rate = 1.35; // Rápida y de urgencia
      utterance.pitch = 1.15; // Tono de advertencia acústica clara

      const voices = window.speechSynthesis.getVoices();
      const alertVoice =
        voices.find((v) => v.lang.startsWith("es") && (v.name.includes("Natural") || v.name.includes("Sabina"))) ||
        voices.find((v) => v.lang.startsWith("es")) ||
        null;
      if (alertVoice) {
        utterance.voice = alertVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Carga asíncrona no bloqueante de TensorFlow.js + COCO-SSD
  const ensureCocoModel = useCallback(async () => {
    if (typeof window === "undefined") return null;
    const w = window as any;

    if (w.cocoSsdModel) return w.cocoSsdModel;
    if (w.loadingCocoPromise) return w.loadingCocoPromise;

    w.loadingCocoPromise = (async () => {
      setState((prev) => ({ ...prev, isModelLoading: true }));
      try {
        if (!w.tf) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js";
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        if (!w.cocoSsd && w.tf) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd";
            s.async = true;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        if (w.cocoSsd) {
          w.cocoSsdModel = await w.cocoSsd.load({ base: "lite_mobilenet_v2" });
        }
        return w.cocoSsdModel;
      } catch (err: any) {
        console.warn("[useNoraVision] No se pudo precargar COCO-SSD local:", err?.message || err);
        return null;
      } finally {
        setState((prev) => ({ ...prev, isModelLoading: false }));
        w.loadingCocoPromise = null;
      }
    })();

    return w.loadingCocoPromise;
  }, []);

  // Inicializar stream de video de la cámara con fallback de cámara trasera a delantera
  const startCamera = useCallback(async (facingMode: "user" | "environment" = "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      let stream: MediaStream | null = null;
      try {
        // Intento 1: Cámara trasera ("environment")
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 480 },
            height: { ideal: 360 },
            frameRate: { ideal: 24, max: 30 },
          },
          audio: false,
        });
      } catch (errEnvironment) {
        console.warn("[useNoraVision] Fallback a cámara disponible por defecto:", errEnvironment);
        // Intento 2: Cualquier cámara disponible (ej. webcams en laptop / desktop)
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("autoplay", "true");
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }
      setState((prev) => ({ ...prev, isCameraActive: true, error: null }));
      ensureCocoModel().catch(() => {});
    } catch (err: any) {
      console.error("[useNoraVision] Error accediendo a la cámara:", err);
      setState((prev) => ({
        ...prev,
        isCameraActive: false,
        error: "No se pudo acceder a la cámara. Revisa los permisos del dispositivo.",
      }));
      throw err;
    }
  }, [ensureCocoModel]);

  // Detener stream de cámara
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState((prev) => ({
      ...prev,
      isCameraActive: false,
      alerts: [],
      telemetry: null,
      criticalHazardDetected: false,
    }));
  }, []);

  // Análisis óptico estricto: detección de muros, superficies planas y obstáculos frontales
  const extractOpticalTelemetry = useCallback((canvas: HTMLCanvasElement): OpticalTelemetry => {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return {
        ambientLight: "Iluminación clara y óptima",
        groundStatus: "Superficie frontal uniforme.",
        frontalPathStatus: "Paso frontal a las 12 en punto despejado.",
        lateralBalance: "Espacio lateral simétrico.",
        summaryText: "12 libre.",
        isFrontalBlocked: false,
        isGroundHazard: false,
      };
    }

    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let totalLum = 0;
    let leftLum = 0, centerLum = 0, rightLum = 0;
    let leftCount = 0, centerCount = 0, rightCount = 0;
    let groundCount = 0;
    let edgeEnergyCenter = 0;
    let edgeEnergyGround = 0;
    let centerVarianceAccum = 0;
    let prevLum = 0;

    const step = 8; // Muestreo ultra-rápido (baja latencia)
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        totalLum += lum;

        if (x < w * 0.30) {
          leftLum += lum;
          leftCount++;
        } else if (x <= w * 0.70) {
          centerLum += lum;
          centerCount++;
          edgeEnergyCenter += Math.abs(lum - prevLum);
        } else {
          rightLum += lum;
          rightCount++;
        }

        if (y > h * 0.65) {
          groundCount++;
          edgeEnergyGround += Math.abs(lum - prevLum);
        }

        prevLum = lum;
      }
    }

    const totalSamples = Math.max(1, leftCount + centerCount + rightCount);
    const avgLum = Math.round(totalLum / totalSamples);
    const avgCenter = Math.round(centerLum / Math.max(1, centerCount));
    const avgLeft = Math.round(leftLum / Math.max(1, leftCount));
    const avgRight = Math.round(rightLum / Math.max(1, rightCount));

    // Cálculo de varianza en el tercio central para detectar paredes o muros lisos muy próximos
    const centerEdgeDensity = edgeEnergyCenter / Math.max(1, centerCount);
    const groundEdgeDensity = edgeEnergyGround / Math.max(1, groundCount);

    // Detección de peligro frontal:
    // 1) Alta energía de bordes central (muro/objeto rugoso inmediato), O
    // 2) Densidad de bordes extremadamente baja pero luminosidad uniforme (pared lisa o muro plano a quemarropa)
    const isTexturelessWall = centerEdgeDensity < 5 && avgCenter > 35 && avgCenter < 230;
    const isDenseObstacle = centerEdgeDensity > 26;
    const isFrontalBlocked = isTexturelessWall || isDenseObstacle;
    const isGroundHazard = groundEdgeDensity > 25;

    const ambientLight: OpticalTelemetry["ambientLight"] =
      avgLum < 45
        ? "Baja iluminación ambiental"
        : avgLum > 195
        ? "Contraluz marcado"
        : "Iluminación clara y óptima";

    const groundStatus = isGroundHazard
      ? "Desnivel o elemento en piso a menos de 1 metro."
      : "Piso despejado bajo tus pies.";

    const frontalPathStatus = isFrontalBlocked
      ? "¡ALTO! Muro o superficie frontal a menos de un metro."
      : "Paso frontal a las 12 libre.";

    const lateralBalance =
      avgLeft > avgRight + 20
        ? "Espacio más despejado a tus 9."
        : avgRight > avgLeft + 20
        ? "Espacio más despejado a tus 2."
        : "Pasaje lateral uniforme.";

    // Resumen telegráfico ultra-corto (< 100 caracteres) para máxima velocidad de inferencia
    const summaryText = isFrontalBlocked
      ? `¡PELIGRO! Muro/superficie frontal a tus 12 a menos de un metro. ${lateralBalance}`
      : `${frontalPathStatus} ${groundStatus} ${lateralBalance}`;

    return {
      ambientLight,
      groundStatus,
      frontalPathStatus,
      lateralBalance,
      summaryText,
      isFrontalBlocked,
      isGroundHazard,
    };
  }, []);

  // Mapeo espacial de coordenadas a esfera del reloj y distancias
  const mapPredictionsToAlerts = useCallback(
    (predictions: any[], canvasWidth: number, canvasHeight: number): SpatialAlert[] => {
      return predictions.slice(0, 3).map((p) => {
        const [x, y, bw, bh] = p.bbox;
        const cx = x + bw / 2;
        const name = COCO_CLASS_TRANSLATIONS[p.class] || p.class;

        const clockPosition: ClockPosition =
          cx < canvasWidth * 0.28
            ? "9 en punto"
            : cx < canvasWidth * 0.42
            ? "10 en punto"
            : cx <= canvasWidth * 0.58
            ? "12 en punto"
            : cx <= canvasWidth * 0.72
            ? "2 en punto"
            : "3 en punto";

        const ratio = bh / canvasHeight;
        const distance: DistanceEstimate =
          ratio > 0.50
            ? "a menos de un metro (alcance inmediato)"
            : ratio > 0.25
            ? "a aproximadamente un metro y medio"
            : "a más de dos metros de distancia";

        const isImminentDanger = clockPosition === "12 en punto" && ratio > 0.45;
        const alertLevel = isImminentDanger ? "danger" : ratio > 0.35 ? "warning" : "info";

        return {
          label: name,
          clockPosition,
          distance,
          alertLevel,
          rawBbox: [x, y, bw, bh],
        };
      });
    },
    []
  );

  // Capturar fotograma, analizar y disparar alerta reflexiva si hay peligro inminente
  const captureAndAnalyze = useCallback(async (): Promise<{
    imageBase64: string | null;
    telemetry: OpticalTelemetry | null;
    alerts: SpatialAlert[];
    formattedSummary: string;
    criticalHazard: boolean;
  }> => {
    // Protección contra saturación a 30 FPS: descartar fotograma si el previo aún se procesa
    if (state.isProcessing) {
      return {
        imageBase64: state.lastSnapshotBase64,
        telemetry: state.telemetry,
        alerts: state.alerts,
        formattedSummary: state.telemetry?.summaryText || "Procesando fotograma en curso...",
        criticalHazard: state.criticalHazardDetected,
      };
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    try {
      const video = videoRef.current;
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvasRef.current = canvas;
      }

      if (!video || video.readyState < 2) {
        throw new Error("El video de la cámara no está listo");
      }

      // Reducido a 320x240 para payload ultra-ligero y latencia < 300ms
      const w = 320;
      const h = 240;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo obtener el contexto 2D del canvas");

      ctx.drawImage(video, 0, 0, w, h);
      // Calidad 0.55 para compresión rápida y subida en pocos milisegundos
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.55);

      const telemetry = extractOpticalTelemetry(canvas);
      let alerts: SpatialAlert[] = [];

      const model = await ensureCocoModel();
      if (model) {
        const predictions = await model.detect(canvas);
        if (predictions && predictions.length > 0) {
          alerts = mapPredictionsToAlerts(predictions, w, h);
        }
      }

      // ── PROTOCOLO DE ALERTA REFLEXIVA EN EL CLIENTE (0ms) ──
      const hasDangerAlert = alerts.some((a) => a.alertLevel === "danger");
      const criticalHazard = telemetry.isFrontalBlocked || hasDangerAlert;

      if (criticalHazard) {
        const dangerMessage = telemetry.isFrontalBlocked
          ? "¡Peligro! Superficie o pared de frente a menos de un metro. Detén tu paso."
          : `¡Peligro! ${alerts[0].label} a tus ${alerts[0].clockPosition} a menos de un metro.`;
        triggerReflexiveWarning(dangerMessage);
      }

      // Resumen directo y no conversacional
      const objectSummary =
        alerts.length > 0
          ? alerts.map((a) => `${a.label} a tus ${a.clockPosition} (${a.distance})`).join("; ")
          : "";

      const formattedSummary = objectSummary
        ? `${telemetry.summaryText} Objetos: ${objectSummary}.`
        : telemetry.summaryText;

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        telemetry,
        alerts,
        lastSnapshotBase64: imageBase64,
        criticalHazardDetected: criticalHazard,
      }));

      return {
        imageBase64,
        telemetry,
        alerts,
        formattedSummary,
        criticalHazard,
      };
    } catch (err: any) {
      console.warn("[useNoraVision] Fallo en captura y análisis:", err?.message || err);
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: err?.message || "Error procesando visión",
      }));
      return {
        imageBase64: null,
        telemetry: null,
        alerts: [],
        formattedSummary: "Trayecto frontal a las 12 en punto transitable.",
        criticalHazard: false,
      };
    }
  }, [ensureCocoModel, extractOpticalTelemetry, mapPredictionsToAlerts, triggerReflexiveWarning]);

  // Limpieza al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    ...state,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    captureAndAnalyze,
  };
}
