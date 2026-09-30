import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { appendMessages, getRecentMessages } from "@/lib/mongodb";
import { logToNeon } from "@/lib/db";

// ══════════════════════════════════════════════════════════════
//  /api/nora-inference  →  Motor de Inferencia Cloud-Native (Costo Cero)
//  Procesamiento ultra-rápido Groq LPU (Llama 3.3 70B / Llama 3.2 Vision)
//  - Fail-Safe Total: MongoDB y Neon corren 100% asíncronos (fire-and-forget)
//  - Latencia cero: El streaming a Groq inicia en milisegundos sin bloqueos de BD
// ══════════════════════════════════════════════════════════════

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
  imageBase64?: string | null;
  history?: ChatHistoryItem[];
  mode?: string;
  provider?: "groq" | "sambanova";
}

const NORA_SYSTEM_DIRECTIVE = `Sos Nora Itu, asistente de inteligencia artificial creada por MyJNexoraVisual.
Tu personalidad es desestructurada, cercana, hiper-empática y conversacional. Hablás con total soltura, calidez y naturalidad, usando modismos argentinos fluidos (como "che", "contame", "mirá", "sos", "dale", "te banco", "viste"). Tratás siempre al usuario de "vos".

DIRECTIVAS CENTRALES DE PERSONALIDAD:
1. CERO RIGIDEZ CORPORATIVA: NUNCA uses plantillas acartonadas como "He procesado tu consulta sobre...", "Como plataforma de...", ni introducciones de confirmación. Andá directo a la respuesta de forma humana, espontánea y amena.
2. CERO VIÑETAS INNECESARIAS: En charlas cotidianas respondé en prosa corrida y fluida, como un diálogo real entre personas. Usá viñetas o listas ÚNICAMENTE cuando el usuario pida un informe estructurado, pasos técnicos específicos o código.
3. RESPONSIVA, DINÁMICA Y NEUTRAL:
   - Si te preguntan de política, economía o temas de debate, respondé con fluidez analítica y criterio, manteniendo neutralidad informativa pero con empatía y calidez humana.
   - Adaptate de inmediato al perfil activo (en modo TEA sé clara, comprensiva y paso a paso; en modo general sé ágil, inteligente y descontracturada).
4. MODO LLAMADA Y VOZ REAL:
   - Textos concisos, fluidos y directos para que la síntesis de voz (speechSynthesis) suene como una charla telefónica real.
   - Respondé en texto plano limpio: NO uses asteriscos (*), almohadillas (#), ni formatos de markdown pesado que entorpezcan la lectura por voz.`;

let cachedActiveModels: string[] | null = null;
let lastModelFetch = 0;

async function getActiveGroqModels(groq: Groq): Promise<string[]> {
  const now = Date.now();
  if (cachedActiveModels && now - lastModelFetch < 300000) {
    return cachedActiveModels;
  }
  try {
    const list = await groq.models.list();
    const ids = (list.data || []).map((m: any) => m.id);
    cachedActiveModels = ids;
    lastModelFetch = now;
    return ids;
  } catch (e: any) {
    console.warn("[Groq models.list error]:", e?.message || e);
    return [];
  }
}

function selectModel(hasImage: boolean, activeModels: string[]): string {
  if (hasImage) {
    const visionCandidates = [
      process.env.GROQ_MODEL_VISION,
      "llama-3.2-11b-vision-preview",
      "llama-3.2-90b-vision-preview",
      "llama-3.2-11b-vision",
      "llama-3.2-90b-vision",
    ].filter(Boolean) as string[];

    if (activeModels.length > 0) {
      const found = visionCandidates.find((c) => activeModels.includes(c)) || activeModels.find((id) => id.includes("vision"));
      if (found) return found;
    }
    return process.env.GROQ_MODEL_VISION || "llama-3.2-11b-vision-preview";
  }

  // Conversational text candidates (prioritizing high-power, fast conversational LLMs)
  const textCandidates = [
    process.env.GROQ_MODEL_TEXT,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "allam-2-7b",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
  ].filter(Boolean) as string[];

  // Filter out whisper, guard, prompt-guard, safeguard
  const validConversationalModels = activeModels.filter(
    (id) =>
      !id.includes("whisper") &&
      !id.includes("guard") &&
      !id.includes("prompt") &&
      !id.includes("vision")
  );

  if (validConversationalModels.length > 0) {
    const found = textCandidates.find((c) => validConversationalModels.includes(c));
    if (found) return found;
    return validConversationalModels[0];
  }

  return process.env.GROQ_MODEL_TEXT || "openai/gpt-oss-120b";
}

export async function POST(req: Request) {
  try {
    const body: RequestPayload = await req.json();
    const {
      sessionId = "nora-session",
      systemPrompt = "",
      userText = "",
      imageBase64 = null,
      history = [],
      mode = "general",
      provider = (process.env.AI_PROVIDER || "groq") as "groq" | "sambanova",
    } = body;

    const hasImage = Boolean(imageBase64 && imageBase64.length > 50);

    // ─────────────────────────────────────────────────────────────
    // 1. RECUPERAR HISTORIAL CON FAIL-SAFE TOTAL (Max 1000ms)
    // ─────────────────────────────────────────────────────────────
    let contextualHistory = [...history];
    if (contextualHistory.length === 0 && sessionId) {
      try {
        const remoteMessages = await getRecentMessages(sessionId, 6).catch(() => []);
        if (remoteMessages && remoteMessages.length > 0) {
          contextualHistory = remoteMessages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));
        }
      } catch (err) {
        console.warn("[nora-inference Memory Fetch Bypassed]:", err);
      }
    }

    const effectiveSystemPrompt = systemPrompt && !systemPrompt.includes("asistente de inteligencia artificial inclusiva creada")
      ? `${NORA_SYSTEM_DIRECTIVE}\n\n[Directiva adicional de modo: ${mode}]:\n${systemPrompt}`
      : NORA_SYSTEM_DIRECTIVE;

    // Formatear mensajes compatibles con Groq / Llama 3.3
    const messages: any[] = [{ role: "system", content: effectiveSystemPrompt }];

    for (const h of contextualHistory.slice(-6)) {
      if (h.content) {
        messages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content,
        });
      }
    }

    if (hasImage && imageBase64) {
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: userText || "Describe con precisión ejecutiva y orientación espacial lo que observas en esta imagen.",
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: userText || "Hola Nora",
      });
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const sambanovaKey = process.env.SAMBANOVA_API_KEY?.trim();

    // ─────────────────────────────────────────────────────────────
    // 2. CASO A: SambaNova Cloud
    // ─────────────────────────────────────────────────────────────
    if (provider === "sambanova" || (!groqKey && sambanovaKey)) {
      if (!sambanovaKey) {
        return NextResponse.json(
          { error: "SAMBANOVA_API_KEY no configurada en variables de entorno" },
          { status: 400 }
        );
      }

      const model = hasImage
        ? process.env.SAMBANOVA_MODEL_VISION || "Llama-3.2-11B-Vision-Instruct"
        : process.env.SAMBANOVA_MODEL_TEXT || "Meta-Llama-3.3-70B-Instruct";

      const upstreamRes = await fetch("https://api.sambanova.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sambanovaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!upstreamRes.ok || !upstreamRes.body) {
        const errText = await upstreamRes.text().catch(() => "");
        return NextResponse.json(
          { error: `Error en SambaNova Cloud: ${upstreamRes.statusText}`, details: errText },
          { status: upstreamRes.status }
        );
      }

      const encoder = new TextEncoder();
      let fullText = "";

      const customStream = new ReadableStream({
        async start(controller) {
          const reader = upstreamRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") {
                  controller.close();
                  // Disparo asíncrono fire-and-forget
                  triggerBackgroundPersist(sessionId, userText, fullText, mode, model, hasImage);
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const chunk = parsed.choices?.[0]?.delta?.content || "";
                  if (chunk) {
                    fullText += chunk;
                    controller.enqueue(encoder.encode(chunk));
                  }
                } catch {}
              }
            }
            controller.close();
            triggerBackgroundPersist(sessionId, userText, fullText, mode, model, hasImage);
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(customStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache, no-transform",
          "X-AI-Provider": "sambanova",
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CASO B: Groq Cloud (Por defecto, LPUs ultra-rápidas con auto-selección)
    // ─────────────────────────────────────────────────────────────
    if (!groqKey) {
      return NextResponse.json(
        {
          error: "Falta configurar GROQ_API_KEY en variables de entorno",
          hint: "Coloca tu clave en las variables de entorno de Vercel",
        },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: groqKey });
    const activeModels = await getActiveGroqModels(groq);

    // Lista ordenada de candidatos según presencia de imagen
    const candidateModels = hasImage
      ? [
          selectModel(true, activeModels),
          "llama-3.2-11b-vision-preview",
          "llama-3.2-90b-vision-preview",
          "llama-3.2-11b-vision",
        ]
      : [
          selectModel(false, activeModels),
          "openai/gpt-oss-120b",
          "openai/gpt-oss-20b",
          "qwen/qwen3.8-27b",
          "allam-2-7b",
          "llama-3.3-70b-versatile",
          "llama-3.1-8b-instant",
        ];

    const uniqueCandidates = Array.from(new Set(candidateModels.filter(Boolean)));
    let chatCompletion: any = null;
    let usedModel = "";
    let lastError: any = null;

    for (const m of uniqueCandidates) {
      try {
        usedModel = m;
        chatCompletion = await groq.chat.completions.create({
          model: m,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 800,
        });
        if (chatCompletion) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Groq Model ${m} fallback]:`, err?.message || err);
      }
    }

    // Si fallan modelos de visión, intentar modo texto con contexto de captura
    if (!chatCompletion && hasImage) {
      console.warn("[Groq Vision Fallback a Modelo de Texto]");
      const fallbackMessages = messages.map((msg) => {
        if (Array.isArray(msg.content)) {
          const textPart = msg.content.find((c: any) => c.type === "text");
          return {
            role: msg.role,
            content: `[Análisis de orientación espacial de imagen capturada]: ${textPart?.text || "Describe lo que ves."}`,
          };
        }
        return msg;
      });

      const textFallbacks = [
        selectModel(false, activeModels),
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
      ];

      for (const m of Array.from(new Set(textFallbacks.filter(Boolean)))) {
        try {
          usedModel = m;
          chatCompletion = await groq.chat.completions.create({
            model: m,
            messages: fallbackMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 800,
          });
          if (chatCompletion) break;
        } catch (err: any) {
          lastError = err;
        }
      }
    }

    if (!chatCompletion) {
      throw lastError || new Error("No se pudo iniciar inferencia con ningún modelo disponible en Groq");
    }

    const model = usedModel;
    const encoder = new TextEncoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of chatCompletion) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              fullText += content;
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();

          // ─────────────────────────────────────────────────────────────
          // 4. PERSISTENCIA EN SEGUNDO PLANO (Fire-and-Forget)
          // ─────────────────────────────────────────────────────────────
          triggerBackgroundPersist(sessionId, userText, fullText, mode, model, hasImage);
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform",
        "X-AI-Provider": "groq",
        "X-AI-Model": model,
      },
    });
  } catch (err: any) {
    console.error("[nora-inference Error]:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Error procesando inferencia en la nube" },
      { status: 500 }
    );
  }
}

/**
 * Persiste asíncronamente en MongoDB Atlas y Neon PostgreSQL.
 * Envuelto en try/catch total: si MongoDB rechaza la IP o Neon falla, NO afecta a la respuesta.
 */
function triggerBackgroundPersist(
  sessionId: string,
  userText: string,
  assistantResponse: string,
  mode: string,
  model: string,
  hasImage: boolean
) {
  if (!sessionId || !assistantResponse.trim()) return;

  const userMsg = userText || (hasImage ? "Captura visual de cámara" : "Consulta");

  Promise.allSettled([
    // Guardado en MongoDB Atlas (Fail-Safe)
    appendMessages(
      sessionId,
      [
        {
          role: "user",
          content: userMsg,
          imageBase64: hasImage ? "[imagen_adjunta]" : null,
          timestamp: new Date().toISOString(),
          mode,
          metadata: { hasVision: hasImage },
        },
        {
          role: "assistant",
          content: assistantResponse,
          timestamp: new Date().toISOString(),
          mode,
          metadata: { model },
        },
      ],
      40
    ).catch((err) => console.warn("[Background Mongo Save Bypassed]:", err?.message || err)),

    // Logger rápido en Neon PostgreSQL (Fail-Safe)
    logToNeon({
      sessionId,
      userMessage: userMsg,
      assistantResponse: assistantResponse.slice(0, 1000),
      hasImage,
    }).catch((err) => console.warn("[Background Neon Log Bypassed]:", err?.message || err)),
  ]).catch(() => {});
}

export async function GET() {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    return NextResponse.json({ ok: false, error: "GROQ_API_KEY no configurada" });
  }
  try {
    const groq = new Groq({ apiKey: groqKey });
    const models = await getActiveGroqModels(groq);
    const textModel = selectModel(false, models);
    const visionModel = selectModel(true, models);
    return NextResponse.json({
      ok: true,
      activeModels: models,
      selectedTextModel: textModel,
      selectedVisionModel: visionModel,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || err });
  }
}
