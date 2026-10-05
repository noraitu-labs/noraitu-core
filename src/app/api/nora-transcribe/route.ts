import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ══════════════════════════════════════════════════════════════
//  /api/nora-transcribe
//
//  GET ?tts=true  →  TTS (Text-to-Speech) via Groq PlayAI-TTS
//                    Devuelve audio/mpeg binario en español
//
//  POST (formData) →  STT (Speech-to-Text) via Groq Whisper
//                    Devuelve JSON con transcripción
// ══════════════════════════════════════════════════════════════

// ── RAMA TTS ─────────────────────────────────────────────────
export async function POST(req: Request) {
  const url = new URL(req.url);
  const isTTS = url.searchParams.get("tts") === "true";

  // ── TTS: genera audio desde texto ──
  if (isTTS) {
    return handleTTS(req);
  }

  // ── STT: transcribe audio a texto (Groq Whisper) ──
  return handleSTT(req);
}

async function handleTTS(req: Request): Promise<Response> {
  try {
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (!groqKey) {
      return NextResponse.json(
        { ok: false, error: "GROQ_API_KEY no configurada en el servidor" },
        { status: 500 }
      );
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
      .slice(0, 4096); // Límite de seguridad Groq TTS

    if (!cleanText) {
      return NextResponse.json(
        { ok: false, error: "Texto vacío tras limpieza" },
        { status: 400 }
      );
    }

    // Voz española: Celeste-PlayAI (mujer, español neutro latinoamericano)
    // Alternativa masculina: "Chip-PlayAI" si se requiere
    const voiceRequested: string = body.voice || "";
    const voice = resolveSpanishVoice(voiceRequested);

    const groq = new Groq({ apiKey: groqKey });

    // Groq TTS — modelo playai-tts, respuesta audio/mpeg binario
    const ttsResponse = await (groq.audio.speech.create as Function)({
      model: "playai-tts",
      voice,
      input: cleanText,
      response_format: "mp3",
    });

    // Groq devuelve un Response-like con .arrayBuffer()
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
    console.error("[Nora TTS API Error]:", err?.message || err);
    // 500 explícito con JSON para que el cliente detecte el fallo limpiamente
    return NextResponse.json(
      { ok: false, error: err?.message || "Error en síntesis de voz" },
      { status: 500 }
    );
  }
}

/**
 * Resuelve el ID de voz española más adecuado para Groq PlayAI-TTS.
 * Prioriza voces en español; evita que el motor caiga en francés u otro idioma.
 */
function resolveSpanishVoice(requested: string): string {
  // Catálogo de voces en español disponibles en PlayAI-TTS (Groq)
  const SPANISH_VOICES: Record<string, string> = {
    // Femeninas
    "aura-2-diana-es": "Celeste-PlayAI",
    "aura-2-javier-es": "Fritz-PlayAI",
    "diana": "Celeste-PlayAI",
    "celeste": "Celeste-PlayAI",
    // Masculinas
    "fritz": "Fritz-PlayAI",
    "javier": "Fritz-PlayAI",
  };

  const key = requested.toLowerCase();
  if (SPANISH_VOICES[key]) return SPANISH_VOICES[key];

  // Fallback seguro: voz femenina en español neutro latinoamericano
  return "Celeste-PlayAI";
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
