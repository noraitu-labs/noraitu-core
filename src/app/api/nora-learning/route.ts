import { NextResponse } from "next/server";
import {
  getGlobalLearningSummary,
  getGlobalLearningCollection,
  recordLearnedInsight,
  updateLearningSummary,
  NoraLearnedInsight,
} from "@/lib/mongodb";

export const runtime = "nodejs";

/**
 * GET /api/nora-learning
 * Consulta la memoria cognitiva acumulada día a día de Nora Itu
 */
export async function GET() {
  try {
    const summary = await getGlobalLearningSummary("nora-itu");
    const col = await getGlobalLearningCollection();
    const doc = col ? await col.findOne({ agentId: "nora-itu" }) : null;

    return NextResponse.json({
      ok: true,
      agentId: "nora-itu",
      totalInteractions: doc?.totalInteractions || 0,
      updatedAt: doc?.updatedAt || null,
      summaryPrompt: summary,
      insightsCount: doc?.insights?.length || 0,
      recentInsights: doc?.insights?.slice(-15) || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Error al obtener memoria de aprendizaje" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nora-learning
 * Permite registrar un aprendizaje nuevo explícito o actualizar la memoria sintética
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, insight, category = "general", summaryPrompt } = body;

    if (summaryPrompt && typeof summaryPrompt === "string") {
      await updateLearningSummary(summaryPrompt, "nora-itu");
      return NextResponse.json({ ok: true, message: "Resumen de memoria actualizado exitosamente" });
    }

    if (!topic || !insight) {
      return NextResponse.json(
        { ok: false, error: "Se requieren 'topic' e 'insight'" },
        { status: 400 }
      );
    }

    const newInsight: NoraLearnedInsight = {
      topic: String(topic).slice(0, 100),
      insight: String(insight).slice(0, 300),
      category: category as any,
      learnedAt: new Date().toISOString(),
      relevanceScore: 1,
    };

    const saved = await recordLearnedInsight(newInsight, "nora-itu");

    return NextResponse.json({
      ok: saved,
      message: saved ? "Aprendizaje registrado exitosamente en MongoDB" : "No se pudo guardar",
      insight: newInsight,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Error procesando aprendizaje" },
      { status: 500 }
    );
  }
}
