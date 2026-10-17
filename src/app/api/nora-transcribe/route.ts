import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ══════════════════════════════════════════════════════════════
//  /api/nora-transcribe
//
//  GET/POST ?tts=true  →  TTS (Text-to-Speech) con Fail-Safe inteligente
//  POST (formData)     →  STT (Speech-to-Text) via Groq Whisper
// ══════════════════════════════════════════════════════════════

// Bandera en memoria de estado del motor de voz del servidor
let serverTtsSupported = true;
let serverTtsCheckCooldown = 0;

export async function POST(req: Request) {
  const url = new URL(req.url);
  const isTTS = url.searchParams.get("tts") === "true";

  if (isTTS) {
    return handleTTS(req);
  }

  return handleSTT(req);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const isTTS = url.searchParams.get("tts") === "true";

  if (isTTS) {
    return handleTTS(req);
  }

  return NextResponse.json({ ok: true, service: "nora-transcribe" });
}

async function handleTTS(req: Request): Promise<Response> {
  const now = Date.now();

  // Si el motor en la nube falló por modelo dado de baja (decommissioned),
  // responder en 0ms ordenando al cliente usar WebSpeech nativo sin saturar la red.
  if (!serverTtsSupported && now < serverTtsCheckCooldown) {
    return NextResponse.json({
      ok: false,
      fallback: "webspeech",
      reason: "server_tts_decommissioned",
      message: "Motor PlayAI-TTS en Groq no disponible. Conmutando a síntesis de voz nativa del dispositivo.",
    });
  }

  try {
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (!groqKey) {
      return NextResponse.json({
        ok: false,
        fallback: "webspeech",
        reason: "no_api_key",
      });
    }

    const body = await req.json().catch(() => ({}));
    const text: string = (body.text || "").trim();
    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Campo 'text' vacío o ausente" },
        { status: 400 }
      );
    }

    // Limpieza anti-corrupción: eliminar markdown y símbolos que rompen TTS
    const cleanText = text
      .replace(/\*\*|__|\*|_|~~|`|#+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[<>{}]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 4096);

    if (!cleanText) {
      return NextResponse.json(
        { ok: false, error: "Texto vacío tras limpieza" },
        { status: 400 }
      );
    }

    const voiceRequested: string = body.voice || "";
    const voice = resolveSpanishVoice(voiceRequested);
    const groq = new Groq({ apiKey: groqKey });

    if (!groq.audio?.speech?.create) {
      serverTtsSupported = false;
      serverTtsCheckCooldown = now + 120_000;
      return NextResponse.json({
        ok: false,
        fallback: "webspeech",
        reason: "groq_speech_not_implemented",
      });
    }

    const ttsResponse = await (groq.audio.speech.create as Function)({
      model: "playai-tts",
      voice,
      input: cleanText,
      response_format: "mp3",
    });

    const audioBuffer = await ttsResponse.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-TTS-Voice": voice,
        "X-TTS-Lang": "es",
      },
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    // Si el modelo fue dado de baja o no existe, activar fallback silencioso permanente
    if (errMsg.includes("decommissioned") || errMsg.includes("not found") || errMsg.includes("400") || errMsg.includes("is no longer supported")) {
      serverTtsSupported = false;
      serverTtsCheckCooldown = now + 300_000; // 5 minutos de silencio de red
      return NextResponse.json({
        ok: false,
        fallback: "webspeech",
        reason: "server_tts_decommissioned",
        message: "Motor PlayAI-TTS en Groq no disponible. Conmutando a síntesis de voz nativa del dispositivo.",
      });
    }

    console.warn("[Nora TTS Non-Blocking Bypass]:", errMsg);
    return NextResponse.json({
      ok: false,
      fallback: "webspeech",
      error: errMsg,
    });
  }
}

function resolveSpanishVoice(requested: string): string {
  const SPANISH_VOICES: Record<string, string> = {
    "aura-2-diana-es": "Celeste-PlayAI",
    "aura-2-javier-es": "Fritz-PlayAI",
    "diana": "Celeste-PlayAI",
    "celeste": "Celeste-PlayAI",
    "fritz": "Fritz-PlayAI",
    "javier": "Fritz-PlayAI",
  };

  const key = requested.toLowerCase();
  return SPANISH_VOICES[key] || "Celeste-PlayAI";
}

// ── STT: Groq Whisper ─────────────────────────────────────────
async function handleSTT(req: Request): Promise<Response> {
  try {
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (!groqKey) {
      return NextResponse.json(
        { ok: false, error: "GROQ_API_KEY no configurada en el servidor" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const model = (formData.get("model") as string) || "whisper-large-v3-turbo";
    const language = (formData.get("language") as string) || undefined;

    if (!audioFile) {
      return NextResponse.json(
        { ok: false, error: "No se proporcionó ningún archivo de audio para transcribir." },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: groqKey });

    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: model,
      language: language,
      temperature: 0.0,
      response_format: "verbose_json",
    });

    return NextResponse.json({
      ok: true,
      text: transcription.text,
      language: (transcription as any).language || "es",
      duration: (transcription as any).duration || null,
      modelUsed: model,
    });
  } catch (err: any) {
    console.error("[Nora Transcribe API Error]:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error al transcribir el archivo de audio" },
      { status: 500 }
    );
  }
}
