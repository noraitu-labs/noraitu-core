/**
 * NEXORA ONE ENGINE — HIGH-DEFINITION NEURAL CLOUD TTS STREAMING API
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Route: src/app/api/nexora/radio-tts/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const OFFICIAL_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
  "X-TTS-Mode": "Voz Cloud Neuronal (HD Broadcast)",
};

/**
 * Splits longer text into acoustic phrases (~140 chars) preserving natural radio pauses.
 */
function splitTextIntoAcousticChunks(text: string, maxLen = 140): string[] {
  const clean = text
    .replace(/\[TOOL_CALL:.*?\]/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/[*_#`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

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
        // Split further by commas
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

async function synthesizeCloudAudio(text: string): Promise<Uint8Array | null> {
  // 1. ElevenLabs Provider (if API key present)
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (elevenKey) {
    try {
      const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || "21m00Tcm4TlvDq8ikWAM";
      const elevenRes = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.55,
              similarity_boost: 0.85,
            },
          }),
        }
      );
      if (elevenRes.ok) {
        const buf = await elevenRes.arrayBuffer();
        return new Uint8Array(buf);
      }
    } catch {
      // Fall through to CosyVoice / Cloud Neural
    }
  }

  // 2. CosyVoice Cloud Microservice (if configured)
  const cosyUrl = process.env.COSYVOICE_URL?.trim() || process.env.NEXORA_TTS_ENDPOINT?.trim();
  if (cosyUrl && !cosyUrl.includes("localhost")) {
    try {
      const cosyRes = await fetch(cosyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: "nora_broadcast_latam",
          speed: 0.95,
        }),
      });
      if (cosyRes.ok) {
        const buf = await cosyRes.arrayBuffer();
        return new Uint8Array(buf);
      }
    } catch {
      // Fall through to Cloud Neural
    }
  }

  // 3. OpenAI TTS (if API key present)
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    try {
      const oaRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: "nova",
          response_format: "mp3",
        }),
      });
      if (oaRes.ok) {
        const buf = await oaRes.arrayBuffer();
        return new Uint8Array(buf);
      }
    } catch {
      // Fall through
    }
  }

  // 4. Cloud Neural Latin American (es-AR) Broadcast Engine
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
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
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

    const audioBytes = await synthesizeCloudAudio(text);
    if (!audioBytes || audioBytes.byteLength === 0) {
      return NextResponse.json(
        { error: "No se pudo sintetizar el audio en la nube." },
        { status: 502, headers: OFFICIAL_HEADERS }
      );
    }

    return new Response(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBytes.byteLength),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
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

    const audioBytes = await synthesizeCloudAudio(text);
    if (!audioBytes || audioBytes.byteLength === 0) {
      return NextResponse.json(
        { error: "No se pudo sintetizar el audio en la nube." },
        { status: 502, headers: OFFICIAL_HEADERS }
      );
    }

    return new Response(audioBytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBytes.byteLength),
        "Cache-Control": "no-store",
        ...OFFICIAL_HEADERS,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error procesando TTS cloud" },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}
