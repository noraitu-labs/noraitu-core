import { NextResponse } from "next/server";
import {
  searchSystemManual,
  SYSTEM_MANUAL_ENTRIES,
  SYSTEM_OPERATIONAL_MANUAL_PROMPT,
} from "@/lib/copilot/system_manual";
import { GroqAdapter } from "@/lib/llm/adapters/groqAdapter";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Consulta inválida o ausente" },
        { status: 400 }
      );
    }

    // 1. Coincidencia ultra-rápida en el manual del sistema
    const quickMatch = searchSystemManual(query);
    if (quickMatch) {
      return NextResponse.json({
        success: true,
        source: "KNOWLEDGE_BASE",
        entry: quickMatch,
        reply: `[${quickMatch.panel}] > ${quickMatch.controlName}\n\n${quickMatch.summary}\n\nProcedimiento paso a paso:\n${quickMatch.procedure.join("\n")}`,
      });
    }

    // 2. Si es una consulta abierta, resolverla con LLM inyectando el manual como contexto maestro
    try {
      const groq = new GroqAdapter();
      if (groq.isAvailable()) {
        const llmResult = await groq.generate({
          systemPrompt: SYSTEM_OPERATIONAL_MANUAL_PROMPT,
          userMessage: query,
          mode: "executive",
          maxTokens: 280,
          temperature: 0.3,
        });

        if (llmResult && llmResult.text) {
          return NextResponse.json({
            success: true,
            source: "LLM_GUIDE",
            reply: llmResult.text.trim(),
          });
        }
      }
    } catch (llmErr) {
      console.warn("[Copilot Query LLM Warning]:", llmErr);
    }

    // 3. Fallback contextual guiado
    const defaultEntry =
      SYSTEM_MANUAL_ENTRIES.find((e) => e.id === "control-open-mic") ||
      SYSTEM_MANUAL_ENTRIES[0];

    return NextResponse.json({
      success: true,
      source: "MANUAL_FALLBACK",
      entry: defaultEntry,
      reply: `[${defaultEntry.panel}] > ${defaultEntry.controlName}\n\n${defaultEntry.summary}\n\nProcedimiento:\n${defaultEntry.procedure.join("\n")}`,
    });
  } catch (err) {
    console.error("[Copilot Query Error]:", err);
    return NextResponse.json(
      { error: "Error interno al procesar consulta en Copilot" },
      { status: 500 }
    );
  }
}
