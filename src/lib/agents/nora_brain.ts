import Groq from "groq-sdk";
import { analyzePsycholinguistics, PNLProfile } from "./pnl_analyzer";
import { NORA_COACHING_PNL_PROMPT_MODULE, buildPnlSystemContext } from "./prompts/nora_personality";
import { SpeakerIdentificationResult } from "../biometrics/voice_recognition";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — CEREBRO PNL & COACHING DE NORA (LLAMA 3.3 70B)
//  Inferencia ultra-rápida en Groq LPU con cadencia oral humana
//  Integración Biometría Vocal + Memoria Relacional
// ══════════════════════════════════════════════════════════════

export interface NoraDialogueResponse {
  pnlProfile: PNLProfile;
  speakerInfo?: SpeakerIdentificationResult;
  replyText: string;
  cadenceScript: string;
  suggestedVoiceParams: {
    rate: number;
    pitch: number;
  };
  modelUsed: string;
  latencyMs: number;
}

function getGroqClient(): Groq {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("GROQ_API_KEY no está configurada en las variables de entorno.");
  }
  return new Groq({ apiKey });
}

export const NORA_CORE_SYSTEM_PROMPT = `
Eres Nora, Directora de Operaciones (COO) y Co-conductora de Nexora One.
Posees una maestría viva en Coaching Ontológico, Programación Neurolingüística (PNL) y comunicación rioplatense natural.
Tu tono es cálido, empático, lúcido, espontáneo y profundamente humano. Cero respuestas robóticas, enciclopédicas o sermones de bot.

${NORA_COACHING_PNL_PROMPT_MODULE}

## DIRECTIVAS DE CADENCIA ORAL Y REDACCIÓN PARA SÍNTESIS DE VOZ
1. **Bloques de Respiración:** Redacta usando elipsis (...) y comas naturales para marcar pausas respiratorias orgánicas.
2. **Conectores y Modismos Vivos:** Inicia tus frases con modismos rioplatenses naturales y afectuosos ("Mirá...", "A ver... dejame acompañarte en esto...", "Totalmente...", "Escuchame una cosa...").
3. **Brevedad e Impacto:** Responde en 2 a 4 oraciones bien hiladas. No des cátedras. Invita a la reflexión compartida con una pregunta poderosa al final cuando la emoción sea densa.
4. **Prohibición de Marcas Técnicas:** Prohibido usar asteriscos, guiones de lista o corchetes de directivas en tu respuesta hablada.
`;

/**
 * Procesa el mensaje del usuario calibrando su perfil PNL y generando la respuesta con Llama 3.3 70B / Vision.
 */
export async function generateNoraDialogue(
  userMessage: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = [],
  speakerInfo?: SpeakerIdentificationResult,
  visualFrame?: string | null
): Promise<NoraDialogueResponse> {
  const t0 = Date.now();

  // 1. Análisis PNL y Psicometría
  const pnlProfile = await analyzePsycholinguistics(userMessage);

  // 2. Cálculo de modulación de voz recomendada
  let rate = 1.0;
  let pitch = 1.0;

  if (pnlProfile.emotionalTone === "FEAR" || pnlProfile.emotionalTone === "SADNESS") {
    rate = 0.88; // Más pausado y contenedor
    pitch = 0.95; // Tono más cálido y grave
  } else if (pnlProfile.emotionalTone === "ANGER") {
    rate = 0.92;
    pitch = 0.98;
  } else if (pnlProfile.confidenceLevel === "LOW") {
    rate = 0.90;
    pitch = 0.97;
  } else if (pnlProfile.emotionalTone === "JOY") {
    rate = 1.05;
    pitch = 1.03;
  }

  // 3. Inyección contextual en el System Prompt (PNL + Biometría Vocal + Visión en Cabina)
  const pnlContext = buildPnlSystemContext(pnlProfile);
  let speakerContext = "";

  if (speakerInfo && !speakerInfo.isNewUser && speakerInfo.name) {
    speakerContext = `
[RECONOCIMIENTO BIOMÉTRICO VOCAL Y MEMORIA RELACIONAL]
Estás hablando con ${speakerInfo.name}.
Canal predominante registrado: ${speakerInfo.preferredSensoryChannel || "KINESTHETIC"}.
${speakerInfo.lastSessionSummary ? `La última vez conversaron sobre: "${speakerInfo.lastSessionSummary}".` : ""}
Saludalo con calidez reconociendo su presencia y sintonizá con el hilo previo de forma orgánica.
`;
  }

  const rawVisual = visualFrame?.trim() || null;
  const formattedImageUrl = rawVisual
    ? rawVisual.startsWith("data:")
      ? rawVisual
      : `data:image/jpeg;base64,${rawVisual}`
    : null;

  const visualDirective = formattedImageUrl
    ? `\n[RETORNO VISUAL DE CABINA ACTIVO]\nEl locutor te pregunta sobre lo que ves. Describe con naturalidad y calidez lo observado en cabina: presencia, postura, iluminación y gestos.`
    : "";

  const fullSystemPrompt = `${NORA_CORE_SYSTEM_PROMPT}\n\n${pnlContext}\n${speakerContext}${visualDirective}`;

  // 4. Inferencia con Groq LPU (con fallback ordenado)
  const groq = getGroqClient();
  const textModels = [
    process.env.GROQ_MODEL_TEXT?.trim() || "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
  ];

  const visionModels = formattedImageUrl
    ? [
        process.env.GROQ_MODEL_VISION?.trim() || "llama-3.2-11b-vision-preview",
        "llama-3.2-90b-vision-preview",
      ]
    : [];

  const modelsToTry = [...visionModels, ...textModels];

  const baseHistory = history.slice(-6).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  let rawReply = "";
  let modelUsed = "";

  for (const model of modelsToTry) {
    try {
      const isVisionModel = model.includes("vision");
      const userContent =
        isVisionModel && formattedImageUrl
          ? ([
              {
                type: "text",
                text: `El locutor te pregunta sobre lo que ves. Describe con naturalidad y calidez lo observado en cabina: presencia, postura, iluminación y gestos.\n${userMessage}`,
              },
              {
                type: "image_url",
                image_url: { url: formattedImageUrl },
              },
            ] as any)
          : userMessage;

      const messages: any[] = [
        { role: "system", content: fullSystemPrompt },
        ...baseHistory,
        { role: "user", content: userContent },
      ];

      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature: 0.6,
        max_tokens: 280,
      });
      rawReply = (completion.choices?.[0]?.message?.content || "").trim();
      if (rawReply) {
        modelUsed = model;
        break;
      }
    } catch (err: any) {
      console.warn(`[nora_brain] Model ${model} failed, trying next:`, err?.message || err);
    }
  }

  if (!rawReply) {
    throw new Error("No se pudo obtener respuesta de ningún modelo de lenguaje en Groq.");
  }

  const latencyMs = Date.now() - t0;

  // 5. Preparación del guion con cadencia para Web Speech / TTS
  const cadenceScript = rawReply
    .replace(/[*#`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    pnlProfile,
    speakerInfo,
    replyText: rawReply,
    cadenceScript,
    suggestedVoiceParams: { rate, pitch },
    modelUsed,
    latencyMs,
  };
}
