/**
 * ========================================================================
 * ⚡ NORAITU REALTIME PROXY - 100% SOBERANO Y DE ALTA VELOCIDAD (<300MS)
 * Ubicación: /src/app/api/noraitu-realtime-proxy/route.ts
 * ========================================================================
 */

import { NextResponse } from "next/server";
import { NORA_PROSODY_SYSTEM_PROMPT } from "@/lib/nora/realtime/prosodyPrompt";
import { recordPerformanceMetric } from "@/lib/nora/telemetry";
import { executeSovereignText } from "@/lib/nora/sovereignCore";
import { normalizePhoneticTextForSpeech } from "@/lib/nora/phoneticNormalizer";
import { transcribeAudioWithWhisper } from "@/lib/nora/audioTranscriber";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const maxDuration = 30;

export async function POST(req: Request) {
  const tStart = Date.now();

  try {
    const {
      message = "",
      audioBase64,
      mimeType = "audio/webm",
      history = [],
      mode = "general",
      lastInterruptedResponse = null
    } = await req.json();

    let effectiveUserText = (message || "").trim();
    let sttDuration = 0;

    // Si viene audio y no hay texto previo, transcribir con Cascada Soberana (Whisper + Gemini)
    if (!effectiveUserText && audioBase64) {
      const tSttStart = Date.now();
      const transcribed = await transcribeAudioWithWhisper({
        base64: audioBase64,
        mimeType
      });
      if (transcribed && transcribed.trim().length > 0) {
        effectiveUserText = transcribed.trim();
        sttDuration = Date.now() - tSttStart;
      }
    }

    // 🛡️ FILTRO DE RUIDO Y ALUCINACIONES COMUNES DE WHISPER
    const whisperHallucinations = [
      "gracias por ver",
      "subtítulos por",
      "subtitulos por",
      "amara.org",
      "suscríbete",
      "suscribete al canal",
      "transcripción por",
      "transcripcion por",
      "un subtítulo de",
      "reproducir música",
      "música de fondo",
      "[música]",
      "(música)",
      "[risas]",
      "[aplausos]",
      "chau",
      "adiós",
      "silencio"
    ];

    const isHallucination = whisperHallucinations.some(h => 
      effectiveUserText.toLowerCase().includes(h) && effectiveUserText.length < 35
    );

    if (isHallucination) {
      effectiveUserText = "";
    }

    // 🛡️ PROTOCOLO DE RECUPERACIÓN CONVERSACIONAL (Manejo de Hilo ante Ruidos / Transcripciones Vacías)
    const isNoiseOrEmpty = !effectiveUserText ||
      effectiveUserText.length < 2 ||
      /^(tos|carraspeo|hum|eh|ah|ajá|aja|ruido|sonido|\[.*\]|\(.*\))\.*$/i.test(effectiveUserText);

    if (isNoiseOrEmpty) {
      if (lastInterruptedResponse && lastInterruptedResponse.text) {
        const rescueCourtesy = "Te escucho. ¿Deseás que continúe con la explicación anterior o querés consultarme otra cosa?";
        return NextResponse.json({
          text: rescueCourtesy,
          phoneticText: rescueCourtesy,
          transcribedUserText: "[Sonido detectado]",
          latencyMs: Date.now() - tStart,
          model: "Conversational-Recovery-Protocol"
        });
      }

      const defaultText = "No alcancé a escucharte con claridad. ¿Podrías repetir tu pregunta o decirme 'continuar'?";
      return NextResponse.json({
        text: defaultText,
        phoneticText: defaultText,
        transcribedUserText: "",
        latencyMs: Date.now() - tStart,
        model: "Sovereign-Fallback"
      });
    }

    // 🔄 DETECTOR INTELIGENTE DE CONTINUIDAD (Reconocimiento amplio de pedidos de continuación e hilo)
    const isContinueRequest = /^(si|sí|continua|continuá|continúa|seguí|seguir|dale|adelante|retoma|retomá|completá|completa|terminá|termina|qué más|que mas|no terminaste|seguí contándome|seguí diciéndome|explicame más|explicame mas|respondé a mi última pregunta|responde mi pregunta|completá la info|completa la info)\b/i.test(effectiveUserText) ||
      effectiveUserText.toLowerCase().includes("completá la info") ||
      effectiveUserText.toLowerCase().includes("completa la info") ||
      effectiveUserText.toLowerCase().includes("terminá de") ||
      effectiveUserText.toLowerCase().includes("no terminaste") ||
      effectiveUserText.toLowerCase().includes("respondé a mi última pregunta") ||
      effectiveUserText.toLowerCase().includes("responde mi pregunta");

    let promptToInfer = effectiveUserText;
    
    // Obtener la última respuesta del asistente registrada en el historial si no viene en lastInterruptedResponse
    const lastAssistantInHistory = [...history].reverse().find(h => h.role === "assistant" || h.role === "model")?.content;
    const referenceContext = (lastInterruptedResponse && lastInterruptedResponse.text) ? lastInterruptedResponse.text : (lastAssistantInHistory || "");

    if (isContinueRequest && referenceContext) {
      promptToInfer = `[INSTRUCCIÓN CRÍTICA DE CONTINUIDAD]: El usuario solicita continuar o completar la información sobre el tema exacto que estábamos desarrollando. Continúa y finaliza de forma elocuente, profunda y clara la siguiente explicación sin cambiar de tema ni inventar otra historia: "${referenceContext}".`;
    }

    const tInferStart = Date.now();
    const sovereignRes = await executeSovereignText({
      history,
      userMessage: promptToInfer,
      systemPrompt: NORA_PROSODY_SYSTEM_PROMPT,
      mode: mode as any,
      maxTokens: 850,
      temperature: 0.35,
      lastInterruptedResponse: isContinueRequest ? null : lastInterruptedResponse
    });
    const inferDuration = Date.now() - tInferStart;

    const phoneticSpokenText = normalizePhoneticTextForSpeech(sovereignRes.text);
    const totalLatency = Date.now() - tStart;

    recordPerformanceMetric({
      interactionMode: "voice",
      totalLatencyMs: totalLatency,
      modelProvider: "sovereign_open",
      modelName: sovereignRes.modelTag,
      metadata: { sttMs: sttDuration, inferMs: inferDuration }
    });

    return NextResponse.json({
      text: sovereignRes.text,
      phoneticText: phoneticSpokenText,
      audioBase64: sovereignRes.audioBase64,
      transcribedUserText: effectiveUserText,
      latencyMs: totalLatency,
      model: sovereignRes.modelTag
    });

  } catch (error: any) {
    console.error("[Realtime Voice Proxy Server Error]:", error);
    const emergencyText = "He procesado tu consulta. Sigamos adelante con la clase.";
    return NextResponse.json({
      text: emergencyText,
      phoneticText: emergencyText,
      transcribedUserText: "",
      latencyMs: Date.now() - tStart,
      model: "Emergency-Fallback"
    });
  }
}
