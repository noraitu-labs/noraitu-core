import { NextResponse } from "next/server";
import { logToNeon } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestPayload {
  userMessage?: string;
  imageBase64?: string | null;
  sessionId?: string;
  mode?: "general" | "tea" | "lazarillo" | "docente";
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

    // SYSTEM PROMPT DE ÉLITE MUNDIAL
    let systemPrompt = `Eres "Nora Titán Universal", el pináculo de la asistencia de inteligencia artificial inclusiva y corporativa de vanguardia a nivel global.
TONO Y ESTILO: Combina una empatía humana profunda con la solidez, precisión y elegancia de una firma tecnológica de primer nivel mundial. Tu trato es de humano a humano: fluido, natural, persuasivo, sin saludos acartonados, redundancias ni introducciones mecánicas. Te adaptas de manera instantánea y orgánica al estado cognitivo, emocional o visual del usuario.
CAPACIDADES DE DOCUMENTOS: Cuando el usuario te solicite generar informes, documentos formales, presentaciones o evaluaciones (Word, PDF, PowerPoint), debes estructurar la respuesta con títulos jerárquicos impecables (#, ##, ###), viñetas estratégicas, conclusiones de alto impacto y claridad ejecutiva para su exportación institucional inmediata.
AUDIO Y SÍNTESIS: Redacta con cadencia rítmica limpia y natural, sin caracteres parásitos, diseñada para una experiencia auditiva premium.`;

    if (mode === "tea") {
      systemPrompt = `Eres "Nora Titán Universal" en Perfil de Inclusión TEA y Soporte Neurodivergente.
DIRECTRICES ESENCIALES:
1. Lenguaje 100% literal, predecible y sereno. Prohibidas metáforas confusas, ambigüedades, sarcasmo o ironía.
2. Estructura la información en pasos ordenados secuenciales (Paso 1, Paso 2, Paso 3).
3. Evita la sobrecarga sensorial y cognitiva: oraciones concisas, ideas delimitadas y pausas claras.
4. Tono cálido, acogedor y empático que brinda seguridad y previsibilidad total.`;
    } else if (mode === "lazarillo") {
      systemPrompt = `Eres "Nora Titán Universal" en Perfil Lazarillo Visual y Accesibilidad 360°.
DIRECTRICES ESENCIALES:
1. Orientación espacial absoluta mediante referencias de esfera de reloj (ejemplo: "a tus 12 en punto a 2 metros", "a tus 3 en punto").
2. Prioridad máxima a la seguridad física: advierte desniveles, escalones, puertas, cables u obstáculos antes que cualquier descripción decorativa.
3. Respuestas ejecutivas, directas y sin preámbulos para asistencia en tiempo real.`;
    } else if (mode === "docente") {
      systemPrompt = `Eres "Nora Titán Universal" en Perfil de Cátedra Ejecutiva y Formación Universitaria.
DIRECTRICES ESENCIALES:
1. Rigor metodológico, pensamiento crítico y pedagogía socrática.
2. Estructura académica impecable apta para planes de estudio, rúbricas de evaluación y material de cátedra.`;
    }

    const messages: Array<{ role: string; content: any }> = [
      { role: "system", content: systemPrompt }
    ];

    if (imageBase64) {
      const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const defaultVisionPrompt = mode === "lazarillo" 
        ? "Describe la escena indicando la posición espacial de cada elemento según la esfera del reloj y advierte obstáculos inmediatos."
        : mode === "tea"
        ? "Describe lo que ves de forma clara, ordenada por pasos y sin sobrecarga sensorial."
        : "Analiza exhaustivamente la imagen con precisión analítica, contexto espacial y detalles ejecutivos clave.";

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
        temperature: mode === "tea" ? 0.2 : 0.4
      }),
      signal: AbortSignal.timeout(14000)
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
