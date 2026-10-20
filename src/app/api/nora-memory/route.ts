import { NextResponse } from "next/server";
import {
  appendMessages,
  getRecentMessages,
  getConversationSessions,
  deleteConversationSession,
  NoraMessage,
} from "@/lib/mongodb";
import { validateOrigin } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 15;

// ══════════════════════════════════════════════════════════════
//  GET /api/nora-memory
//  Recupera historial o lista de sesiones de forma tolerante a fallos
// ══════════════════════════════════════════════════════════════
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode") || "";
    const agentId = searchParams.get("agentId") || "nora-itu";

    // Si pide listado de sesiones para el panel lateral de historial
    if (mode === "sessions") {
      const limit = parseInt(searchParams.get("limit") || "30", 10);
      const sessions = await getConversationSessions(agentId, limit);
      return NextResponse.json({ agentId, sessions });
    }

    const sessionId = searchParams.get("sessionId") || "";
    const limit = parseInt(searchParams.get("limit") || "40", 10);

    if (!sessionId) {
      return NextResponse.json({ sessionId: "", agentId, messages: [] });
    }

    const messages = await getRecentMessages(sessionId, limit, agentId);
    return NextResponse.json({ sessionId, agentId, messages });
  } catch (err: any) {
    console.warn("[nora-memory GET Fail-Safe]:", err?.message || err);
    return NextResponse.json({ sessionId: "", agentId: "nora-itu", messages: [], sessions: [] });
  }
}

// ══════════════════════════════════════════════════════════════
//  DELETE /api/nora-memory
//  Eliminar una sesión específica
// ══════════════════════════════════════════════════════════════
export async function DELETE(req: Request) {
  const originBlock = validateOrigin(req);
  if (originBlock) return originBlock;

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const agentId = searchParams.get("agentId") || "nora-itu";

    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "sessionId requerido" }, { status: 400 });
    }

    const success = await deleteConversationSession(sessionId, agentId);
    return NextResponse.json({ ok: success, sessionId });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message }, { status: 500 });
  }
}

// ══════════════════════════════════════════════════════════════
//  POST /api/nora-memory
//  Persistencia fire-and-forget: Responde 200 INMEDIATO sin bloquear
// ══════════════════════════════════════════════════════════════
export async function POST(req: Request) {
  const originBlock = validateOrigin(req);
  if (originBlock) return originBlock;

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
