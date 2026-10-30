/**
 * NEXORA ONE ENGINE — HIGH-DEFINITION NEURAL CLOUD TTS STREAMING API
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Route: src/app/api/nexora/radio-tts/route.ts
 *
 * CASCADING CLOUD ARCHITECTURE:
 * 1. Primary Layer: ElevenLabs HD Streaming (eleven_multilingual_v2) when ELEVENLABS_API_KEY is present.
 * 2. Secondary Layer (Automatic Fallback): Free Serverless Neural Edge-TTS (es-AR-ElenaNeural / es-AR-TomasNeural).
 * 3. Tertiary Safety Net: Cloud Acoustic Engine chunked streaming fallback.
 */

import { NextRequest, NextResponse } from "next/server";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OFFICIAL_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
  "X-TTS-Mode": "Voz Cloud Neuronal (HD Broadcast)",
};

/**
 * Strips tool calls, markdown, URLs and artifacts to prepare natural broadcast speech.
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\[TOOL_CALL:.*?\]/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[*_#`~>]/g, "")
    .replace(/https?:\/\/\S+/g, "enlace")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits longer text into acoustic phrases (~140 chars) preserving natural radio pauses.
 */
function splitTextIntoAcousticChunks(text: string, maxLen = 140): string[] {
  const clean = cleanTextForSpeech(text);
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const sentences = clean.split(/(?<=[.?!;:\n])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).trim().length <= maxLen) {
      current = (current + " " + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length > maxLen) {
        const subParts = sentence.split(/(?<=[,])\s+/);
        let subCurrent = "";
        for (const part of subParts) {
          if ((subCurrent + " " + part).trim().length <= maxLen) {
            subCurrent = (subCurrent + " " + part).trim();
          } else {
            if (subCurrent) chunks.push(subCurrent);
            subCurrent = part;
          }
        }
        if (subCurrent) current = subCurrent;
        else current = "";
      } else {
        current = sentence;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Capa 1: ElevenLabs Multilingual V2 (Voz Nora en Español Rioplatense).
 */
async function synthesizeWithElevenLabs(
  text: string,
  apiKey: string,
  voiceId?: string
): Promise<Uint8Array | null> {
  const chosenVoice =
    voiceId?.trim() ||
    process.env.ELEVENLABS_VOICE_ID?.trim() ||
    "21m00Tcm4TlvDq8ikWAM"; // Default Rachel/Nora voice ID

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout guard

  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${chosenVoice}/stream`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.52,
            similarity_boost: 0.82,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(
        `[radio-tts] ElevenLabs failed with HTTP ${res.status} (${res.statusText}). Conmutando a Edge-TTS fallback...`
      );
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength === 0) return null;
    return new Uint8Array(arrayBuf);
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(
      `[radio-tts] ElevenLabs error (${err?.message || err}). Conmutando a Edge-TTS fallback...`
    );
    return null;
  }
}

/**
 * Capa 2: Microsoft Edge-TTS Neuronal Serverless (es-AR-ElenaNeural / es-AR-TomasNeural).
 */
async function synthesizeWithEdgeTTS(
  text: string,
  voiceName: string = "es-AR-ElenaNeural"
): Promise<Uint8Array | null> {
  const timeoutMs = 14000;

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      voiceName,
      OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3
    );

    const { audioStream } = tts.toStream(text, {
      rate: "+0%",
      pitch: "+0Hz",
      volume: "+0%",
    });

    const chunks: Buffer[] = [];

    const buffer = await new Promise<Buffer | null>((resolve, reject) => {
      const timer = setTimeout(() => {
        try {
          tts.close();
        } catch {
          // Ignore close errors
        }
        reject(new Error(`Edge-TTS stream timeout (${timeoutMs}ms)`));
      }, timeoutMs);

      audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      audioStream.on("end", () => {
        clearTimeout(timer);
        try {
          tts.close();
        } catch {
          // Ignore
        }
        resolve(Buffer.concat(chunks));
      });

      audioStream.on("error", (err: any) => {
        clearTimeout(timer);
        try {
          tts.close();
        } catch {
          // Ignore
        }
        reject(err);
      });
    });

    if (!buffer || buffer.length === 0) return null;
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.length);
  } catch (err: any) {
    console.warn(
      `[radio-tts] Edge-TTS error con voz ${voiceName}:`,
      err?.message || err
    );

    // Si la voz principal falla, intentar con la secundaria es-AR-TomasNeural
    if (voiceName !== "es-AR-TomasNeural") {
      try {
        return await synthesizeWithEdgeTTS(text, "es-AR-TomasNeural");
      } catch {
        // Fall through
      }
    }
    return null;
  }
}

/**
 * Capa 3: Fallback de seguridad acústico por chunks.
 */
async function synthesizeWithSafetyNet(text: string): Promise<Uint8Array | null> {
  const chunks = splitTextIntoAcousticChunks(text, 140);
  if (chunks.length === 0) return null;

  const audioBuffers: Uint8Array[] = [];
  for (const chunk of chunks) {
    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=es-AR&q=${encodeURIComponent(
        chunk
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
          Accept: "audio/mpeg, audio/*",
        },
      });
      if (res.ok) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength > 0) {
          audioBuffers.push(new Uint8Array(buf));
        }
      }
    } catch {
      // Continue next chunk
    }
  }

  if (audioBuffers.length === 0) return null;

  const totalLength = audioBuffers.reduce((sum, b) => sum + b.byteLength, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of audioBuffers) {
    combined.set(b, offset);
    offset += b.byteLength;
  }

  return combined;
}

/**
 * Orquestador en cascada:
 * ElevenLabs -> Edge-TTS (ElenaNeural / TomasNeural) -> SafetyNet
 */
async function executeCascadingTTS(
  rawText: string
): Promise<{ audioBytes: Uint8Array; provider: "elevenlabs" | "edge-tts" | "fallback-tts" } | null> {
  const clean = cleanTextForSpeech(rawText);
  if (!clean) return null;

  // 1. Capa Primaria: ElevenLabs
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (elevenKey) {
    const elevenAudio = await synthesizeWithElevenLabs(clean, elevenKey);
    if (elevenAudio && elevenAudio.byteLength > 0) {
      return { audioBytes: elevenAudio, provider: "elevenlabs" };
    }
  }

  // 2. Capa Secundaria: Edge-TTS Serverless (es-AR-ElenaNeural)
  const edgeAudio = await synthesizeWithEdgeTTS(clean, "es-AR-ElenaNeural");
  if (edgeAudio && edgeAudio.byteLength > 0) {
    return { audioBytes: edgeAudio, provider: "edge-tts" };
  }

  // 3. Capa Terciaria: Fallback de seguridad
  const safetyAudio = await synthesizeWithSafetyNet(clean);
  if (safetyAudio && safetyAudio.byteLength > 0) {
    return { audioBytes: safetyAudio, provider: "fallback-tts" };
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const text = (url.searchParams.get("text") || url.searchParams.get("q") || "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "Parámetro 'text' requerido." },
        { status: 400, headers: OFFICIAL_HEADERS }
      );
    }

    const result = await executeCascadingTTS(text);
    if (!result || result.audioBytes.byteLength === 0) {
      return NextResponse.json(
        { error: "No se pudo sintetizar el audio con ningún proveedor en cascada." },
        { status: 502, headers: OFFICIAL_HEADERS }
      );
    }

    return new Response(Buffer.from(result.audioBytes), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(result.audioBytes.byteLength),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
        "X-TTS-Provider": result.provider,
        ...OFFICIAL_HEADERS,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error interno en radio-tts" },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const text = (body.text || body.message || "").trim();

    if (!text) {
      return NextResponse.json(
        { error: "El campo 'text' es obligatorio en el cuerpo de la petición." },
        { status: 400, headers: OFFICIAL_HEADERS }
      );
    }

    const result = await executeCascadingTTS(text);
    if (!result || result.audioBytes.byteLength === 0) {
      return NextResponse.json(
        { error: "No se pudo sintetizar el audio con ningún proveedor en cascada." },
        { status: 502, headers: OFFICIAL_HEADERS }
      );
    }

    return new Response(Buffer.from(result.audioBytes), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(result.audioBytes.byteLength),
        "Cache-Control": "no-store",
        "X-TTS-Provider": result.provider,
        ...OFFICIAL_HEADERS,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error procesando TTS cloud en cascada" },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}
