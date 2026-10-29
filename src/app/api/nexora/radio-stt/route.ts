/**
 * NEXORA ONE ENGINE — HARDWARE MICROPHONE STT FALLBACK ENDPOINT
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Route: src/app/api/nexora/radio-stt/route.ts
 *
 * Accepts recorded microphone audio blobs (WebM / WAV / Ogg from MediaRecorder)
 * and transcribes them via Groq Whisper (`whisper-large-v3-turbo`) or local
 * SenseVoice (`http://127.0.0.1:8004/v1/audio/transcriptions`) when the browser's
 * native `webkitSpeechRecognition` is blocked or fails to emit results.
 */

import { NextRequest, NextResponse } from "next/server";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OFFICIAL_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
};

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const formData = await req.formData();
    const audioFile = formData.get("file");

    if (!audioFile || !(audioFile instanceof Blob)) {
      return NextResponse.json(
        {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          transcript: "",
          error: "No audio blob provided",
        },
        { status: 400, headers: OFFICIAL_HEADERS }
      );
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const groqForm = new FormData();
        groqForm.append("file", audioFile, "studio_mic.webm");
        groqForm.append("model", "whisper-large-v3-turbo");
        groqForm.append("language", "es");
        groqForm.append("response_format", "json");

        const groqRes = await fetch(
          "https://api.groq.com/openai/v1/audio/transcriptions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
            },
            body: groqForm,
          }
        );

        if (groqRes.ok) {
          const data = (await groqRes.json()) as { text?: string };
          return NextResponse.json(
            {
              engine: NEXORA_ENGINE_NAME,
              signature: NEXORA_SIGNATURE,
              transcript: (data.text || "").trim(),
              provider: "Groq Whisper (whisper-large-v3-turbo)",
              latency_ms: Date.now() - t0,
            },
            { status: 200, headers: OFFICIAL_HEADERS }
          );
        }
      } catch {
        // Fall through to local SenseVoice server
      }
    }

    // Try local SenseVoice STT microservice only if explicitly configured or enabled in local dev
    try {
      const localForm = new FormData();
      localForm.append("file", audioFile, "studio_mic.webm");
      localForm.append("language", "es");

      const localRes = await fetch(
        (process.env.SENSEVOICE_URL || (process.env.NODE_ENV === "development" && process.env.ENABLE_LOCAL_STT === "true" ? "http://127.0.0.1:8004/v1/audio/transcriptions" : "http://0.0.0.0")),
        {
          method: "POST",
          body: localForm,
          signal: AbortSignal.timeout(2000),
        }
      );
      if (localRes.ok) {
        const data = (await localRes.json()) as { text?: string };
        return NextResponse.json(
          {
            engine: NEXORA_ENGINE_NAME,
            signature: NEXORA_SIGNATURE,
            transcript: (data.text || "").trim(),
            provider: "SenseVoice Local STT",
            latency_ms: Date.now() - t0,
          },
          { status: 200, headers: OFFICIAL_HEADERS }
        );
      }
    } catch {
      // Ignore if local SenseVoice container is offline
    }

    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        transcript: "",
        provider: "WebSpeech_Primary",
        latency_ms: Date.now() - t0,
      },
      { status: 200, headers: OFFICIAL_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        transcript: "",
        error: err instanceof Error ? err.message : "STT Error",
      },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}

