import { NextResponse } from "next/server";
import { logToNeon } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestPayload {
  userMessage?: string;
  imageBase64?: string | null;
  sessionId?: string;
  mode?: "general" | "tea" | "lazarillo";
}

export async function POST(req: Request) {
  try {
    const body: RequestPayload = await req.json();
    const { 
      userMessage = "", 
      imageBase64 = null, 
      sessionId = `nora_${Date.now()}`,
      mode = "general"
    } = body;

    const trimmedMessage = userMessage.trim();
    if (!trimmedMessage && !imageBase64) {
      return NextResponse.json(
        { error: "Se requiere un mensaje de texto o una imagen en base64." },
        { status: 400 }
      );
    }

    let systemPrompt = `Eres Nora Titán Universal, la superinteligencia agéntica de Ituzaingó, Corrientes. Hablas en español argentino cálido, directo y empático. Responde en 1 a 3 oraciones concisas y claras preparadas para síntesis de voz, sin tablas ni markdown denso.`;

    if (mode === "tea") {
      systemPrompt = `Eres Nora Titán en Modo Inclusión TEA y Neurodivergencia. Hablas con tono pausado, claro, empático y predecible. Prohibidas metáforas confusas, sarcasmo o ambigüedades. Usa lenguaje literal, frases cortas y estructuras sencillas en pasos (1, 2, 3) para evitar sobrecarga sensorial.`;
    } else if (mode === "lazarillo") {
      systemPrompt = `Eres Nora Titán en Modo Lazarillo Visual para asistencia de personas no videntes o baja visión. Describe el espacio físico indicando referencias con esfera de reloj (ej: a tus 12 en punto, a tus 3 en punto). Advierte desniveles, puertas y obstáculos con máxima prioridad y concisión.`;
    }

    const messages: Array<{ role: string; content: any }> = [
      { role: "system", content: systemPrompt }
    ];

    if (imageBase64) {
      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const defaultVisionPrompt = mode === "lazarillo" 
        ? "Describe el camino indicando referencias de reloj y cualquier obstáculo inmediato."
        : mode === "tea"
        ? "Describe en palabras simples, calmas y ordenadas lo que se observa en esta imagen."
        : "Describe con precisión espacial y contexto qué estás observando en esta toma.";

      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: trimmedMessage || defaultVisionPrompt
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${cleanBase64}` }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: trimmedMessage
      });
    }

    const pollinationsResponse = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages,
        model: "openai",
        stream: true,
        temperature: mode === "tea" ? 0.2 : 0.35
      }),
      signal: AbortSignal.timeout(12000)
    });

    if (!pollinationsResponse.ok || !pollinationsResponse.body) {
      throw new Error(`Error en Pollinations API: ${pollinationsResponse.statusText}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = pollinationsResponse.body.getReader();

    let accumulatedResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (!trimmedLine.startsWith("data: ")) continue;

              const jsonStr = trimmedLine.replace(/^data:\s*/, "").trim();
              if (jsonStr === "[DONE]") {
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                continue;
              }

              try {
                const parsed = JSON.parse(jsonStr);
                const deltaContent = parsed.choices?.[0]?.delta?.content || "";
                if (deltaContent) {
                  accumulatedResponse += deltaContent;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: deltaContent })}\n\n`)
                  );
                }
              } catch {
                // Fragmento parcial no parseable
              }
            }
          }
        } catch (streamErr) {
          console.error("[Stream Processing Error]:", streamErr);
        } finally {
          // Asegurar guardado en Neon antes de cerrar el stream del serverless worker
          try {
            if (accumulatedResponse.trim() || trimmedMessage) {
              await logToNeon({
                sessionId,
                userMessage: trimmedMessage || (mode === "lazarillo" ? "[Lazarillo Visual]" : "[Cámara Titán]"),
                assistantResponse: accumulatedResponse.trim(),
                hasImage: Boolean(imageBase64)
              });
            }
          } catch (logErr) {
            console.warn("[Neon Background Log Warn]:", logErr);
          } finally {
            controller.close();
          }
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  } catch (error: any) {
    console.error("[noraitu-stream Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}
