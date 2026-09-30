import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
