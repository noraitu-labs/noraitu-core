import { NextResponse } from "next/server";
import { logToNeon } from "@/lib/db";

// ══════════════════════════════════════════════════════════════
//  /api/noraitu-stream  →  Logger de Neon PostgreSQL
//
//  La inferencia multimodal corre vía Groq / SambaNova en /api/nora-inference.
//  Este endpoint persiste logs críticos en Neon PostgreSQL (fire-and-forget).
// ══════════════════════════════════════════════════════════════
export const runtime = "nodejs";
export const maxDuration = 15;

interface LogPayload {
  sessionId?: string;
  userMessage?: string;
  assistantResponse?: string;
  hasImage?: boolean;
}

export async function POST(req: Request) {
  try {
    const body: LogPayload = await req.json();
    const {
      sessionId = "anonymous",
      userMessage = "",
      assistantResponse = "",
      hasImage = false,
    } = body;

    // Log asíncrono a Neon — no bloquea la UI
    logToNeon({ sessionId, userMessage, assistantResponse, hasImage }).catch((err) =>
      console.error("[Neon Log Background Error]:", err)
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    // Silencioso — el log fallido no debe interrumpir la experiencia
    console.error("[noraitu-stream logger Error]:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
