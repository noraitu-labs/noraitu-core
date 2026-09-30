import { NextResponse } from "next/server";
import { appendMessages, getRecentMessages, NoraMessage } from "@/lib/mongodb";

export const runtime = "nodejs";
export const maxDuration = 15;

// ══════════════════════════════════════════════════════════════
//  GET /api/nora-memory
//  Recupera historial de forma tolerante a fallos
// ══════════════════════════════════════════════════════════════
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const agentId = searchParams.get("agentId") || "nora-itu";

    if (!sessionId) {
      return NextResponse.json({ sessionId: "", agentId, messages: [] });
    }

    const messages = await getRecentMessages(sessionId, limit, agentId);
    return NextResponse.json({ sessionId, agentId, messages });
  } catch (err: any) {
    console.warn("[nora-memory GET Fail-Safe]:", err?.message || err);
    return NextResponse.json({ sessionId: "", agentId: "nora-itu", messages: [] });
  }
}

// ══════════════════════════════════════════════════════════════
//  POST /api/nora-memory
//  Persistencia fire-and-forget: Responde 200 INMEDIATO sin bloquear
// ══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionId,
      agentId = "nora-itu",
      userMessage,
      assistantResponse,
      imageBase64 = null,
      mode = "general",
      model = "llama-3.3-70b-versatile",
      latencyMs,
    } = body;

    if (!sessionId || !userMessage || !assistantResponse) {
      return NextResponse.json({ ok: false, warning: "Datos incompletos" });
    }

    const newMessages: NoraMessage[] = [
      {
        role: "user",
        content: userMessage,
        imageBase64: imageBase64 ? "[imagen_adjunta]" : null,
        timestamp: new Date().toISOString(),
        mode,
        metadata: { hasVision: Boolean(imageBase64) },
      },
      {
        role: "assistant",
        content: assistantResponse,
        timestamp: new Date().toISOString(),
        mode,
        metadata: { model, latencyMs },
      },
    ];

    // Fire-and-forget: No esperamos a que termine para liberar la respuesta HTTP
    appendMessages(sessionId, newMessages, 40, agentId).catch((err) =>
      console.warn("[nora-memory Background Save Warning]:", err?.message || err)
    );

    return NextResponse.json({ ok: true, queued: true, sessionId });
  } catch (err: any) {
    console.warn("[nora-memory POST Fail-Safe]:", err?.message || err);
    return NextResponse.json({ ok: true, bypassed: true });
  }
}
