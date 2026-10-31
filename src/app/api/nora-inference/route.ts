import { NextResponse } from "next/server";
import {
  appendMessages,
  getRecentMessages,
  getGlobalLearningSummary,
  recordLearnedInsight,
  NoraLearnedInsight,
} from "@/lib/mongodb";
import { logToNeon } from "@/lib/db";
import { buildSystemPrompt, NoraMode, NoraContext } from "@/lib/prompts";
import { NoraLLMRouter } from "@/lib/llm/router";
import { GroqAdapter } from "@/lib/llm/adapters/groqAdapter";
import { OllamaAdapter } from "@/lib/llm/adapters/ollamaAdapter";

export const runtime = "nodejs";
export const maxDuration = 45;

interface ChatHistoryItem {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestPayload {
  sessionId?: string;
  systemPrompt?: string;
  userText: string;
  userName?: string;
  imageBase64?: string | null;
  visual_frame?: string | null;
  history?: ChatHistoryItem[];
  mode?: "general" | "tea" | "lazarillo" | "docente" | "executive" | string;
  visualTelemetry?: string | null;
  deviceLocation?: any;
  clientDateTime?: string | null;
}

import { validateOrigin } from "@/lib/security";

// Instanciación del Router con cascada de proveedores (Groq -> Ollama Local)
const llmRouter = new NoraLLMRouter([
  new GroqAdapter(),
  new OllamaAdapter(),
]);

export async function POST(req: Request) {
  // Blindaje Antirrobo: Bloqueo de orígenes no autorizados, Postman, cURL o clones
  const originBlock = validateOrigin(req);
  if (originBlock) return originBlock;

  try {
    const body: RequestPayload = await req.json();
    const {
      sessionId = "nora-session",
      userText = "",
      userName = "",
      imageBase64: rawImage = null,
      visual_frame = null,
      history = [],
      mode = "general",
      visualTelemetry = null,
      deviceLocation = null,
      clientDateTime = null,
    } = body;

    const imageBase64 = visual_frame || rawImage;

    // 1. Mapeo del modo al contrato oficial de NoraMode
    let mappedMode: NoraMode = "executive";
    if (mode === "lazarillo" || mode === "no_videntes") {
      mappedMode = "lazarillo";
    } else if (mode === "tea") {
      mappedMode = "tea";
    }

    // 2. Formato de hora y geolocalización
    const nowServer = new Date();
    const timeOfDay = clientDateTime || nowServer.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Argentina/Buenos_Aires",
    });

    let location = "Ituzaingó, Corrientes, Argentina";
    if (deviceLocation) {
      if (typeof deviceLocation === "string") {
        location = deviceLocation;
      } else if (deviceLocation.city || deviceLocation.province) {
        location = `${deviceLocation.city || "Ituzaingó"}, ${deviceLocation.province || "Corrientes"}`;
      }
    }

    // 3. Preparación de alertas visuales desde la telemetría recibida
    const visionAlerts: NoraContext["visionAlerts"] = [];
    if (visualTelemetry) {
      visionAlerts.push({
        clockPosition: visualTelemetry.includes("12 en punto") ? "12 en punto" : "frontal",
        distance: "estimada",
        alertLevel: visualTelemetry.includes("Precaución") || visualTelemetry.includes("desniveles") ? "warning" : "info",
        description: visualTelemetry,
      });
    }

    const noraContext: NoraContext = {
      timeOfDay,
      location,
      userName,
      visionAlerts,
      isDark: Boolean(visualTelemetry?.includes("Baja iluminación ambiental")),
    };

    // 4. Construcción centralizada del System Prompt (Fase 2)
    const systemPrompt = buildSystemPrompt(mappedMode, noraContext);

    // 5. Inferencia con Router Resiliente en Cascada (Fase 3: Groq -> Ollama -> Emergency)
    const isLazarillo = mappedMode === "lazarillo";
    const temperature = isLazarillo ? 0.1 : mappedMode === "tea" ? 0.3 : 0.7;
    const maxTokens = isLazarillo ? 60 : 500; // 60 tokens garantiza tiempos de streaming < 350ms en Groq

    const routerResponse = await llmRouter.routeInference({
      systemPrompt,
      userMessage: userText || (visualTelemetry ? "¿Obstáculos frente a mí?" : "Adelante"),
      history: isLazarillo
        ? [] // En modo lazarillo descartamos historial previo para evitar lag de contexto y priorizar la escena actual
        : history.slice(-6).map((h) => ({
            role: h.role === "assistant" ? "assistant" : "user",
            content: h.content,
          })),
      temperature,
      maxTokens,
      mode: mappedMode,
      imageBase64,
      visualTelemetry,
    });

    const finalAnswer = routerResponse.text;

    // 6. Persistencia asíncrona dual (fire-and-forget) sin bloquear
    logToNeon({
      sessionId,
      userMessage: userText,
      assistantResponse: finalAnswer,
      hasImage: Boolean(imageBase64),
    }).catch(() => {});

    appendMessages(sessionId, [
      {
        role: "user",
        content: userText,
        timestamp: new Date().toISOString(),
        mode,
      },
      {
        role: "assistant",
        content: finalAnswer,
        timestamp: new Date().toISOString(),
        mode,
      },
    ], 40, "nora-itu").catch(() => {});

    // Retornar stream de texto para compatibilidad con useNoraChat
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(finalAnswer));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Nora-Provider": routerResponse.providerUsed,
        "X-Nora-Latency": `${routerResponse.latencyMs}ms`,
      },
    });
  } catch (err: any) {
    console.error("[/api/nora-inference Error]:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Error interno en el router de inferencia",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "nora-inference-router",
    status: "healthy",
    adapters: ["groq", "ollama-local"],
  });
}
