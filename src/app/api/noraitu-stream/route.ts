import { NextResponse } from "next/server";
import { logToNeon } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestPayload {
  userMessage?: string;
  imageBase64?: string | null;
  sessionId?: string;
}

export async function POST(req: Request) {
  try {
    const body: RequestPayload = await req.json();
    const { userMessage = "", imageBase64 = null, sessionId = `nora_${Date.now()}` } = body;

    const trimmedMessage = userMessage.trim();
    if (!trimmedMessage && !imageBase64) {
      return NextResponse.json(
        { error: "Se requiere un mensaje de texto o una imagen en base64." },
        { status: 400 }
      );
    }

    const systemPrompt = `Eres Nora Itu, la superinteligencia y asistente ag�ntica de Ituzaing�, Corrientes. Hablas en espa�ol argentino c�lido, directo y emp�tico. Responde en 1 a 3 oraciones concisas y claras preparadas para s�ntesis de voz, sin tablas ni markdown denso.`;

    const messages: Array<{ role: string; content: any }> = [
      { role: "system", content: systemPrompt }
    ];

    if (imageBase64) {
      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: trimmedMessage || "Describe con precisi�n espacial qu� est�s observando en esta toma."
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
        temperature: 0.35
      }),
      signal: AbortSignal.timeout(8000)
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
          controller.close();

          // Guardar as�ncronamente en Neon PostgreSQL
          if (accumulatedResponse.trim() || trimmedMessage) {
            logToNeon({
              sessionId,
              userMessage: trimmedMessage || "[Imagen enviada]",
              assistantResponse: accumulatedResponse.trim(),
              hasImage: Boolean(imageBase64)
            }).catch((err) => console.warn("[Neon Background Log Warn]:", err));
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
