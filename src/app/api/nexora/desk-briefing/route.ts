/**
 * NEXORA ONE ENGINE — SHARED DESK BOARD & EDITORIAL BRIEFING API
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Route: src/app/api/nexora/desk-briefing/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

const OFFICIAL_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
};

export interface DeskBriefingItem {
  id: string;
  title: string;
  lead: string;
  body: string;
  coverImageUrl?: string;
  category: string;
  publishedAt: string;
  sourceType: "PORTAL_CMS" | "MANUAL_UPLOAD" | "PRESS_RELEASE";
  attachedFilename?: string;
}

// In-memory active desk board synchronized with the host and Nora
let activeDeskItems: DeskBriefingItem[] = [
  {
    id: "briefing-1",
    title: "El Banco Central avanza con la flexibilización cambiaria y monitorea el sendero de reservas",
    lead: "El equipo económico ratificó la pauta de desinflación mientras negocia esquemas de financiamiento externo para apuntalar la transición.",
    body: "En los despachos de Hacienda destacan que la acumulación de reservas y la liquidación del complejo agropecuario marcan un sendero positivo, aunque analistas advierten sobre la estacionalidad del flujo hacia fin de año.",
    category: "ECONOMÍA",
    publishedAt: "Hace 10 min",
    sourceType: "PORTAL_CMS",
  },
  {
    id: "briefing-2",
    title: "Cruces en el Congreso por el presupuesto nacional y fondos de coparticipación provincial",
    lead: "Bloques dialoguistas y gobernadores reclaman partidas para obras de infraestructura y reactivación federal.",
    body: "La tensión parlamentaria creció en las últimas horas previo a la sesión de comisión. Desde la mesa directiva señalan que habrá negociaciones hasta último minuto para destrabar el dictamen.",
    category: "POLÍTICA",
    publishedAt: "Hace 25 min",
    sourceType: "PORTAL_CMS",
  },
  {
    id: "briefing-3",
    title: "Comunicado Oficial: Presentación de nuevos proyectos de IA y biotecnología en universidades",
    lead: "El consorcio académico regional anunció fondos para laboratorios de software abierto y procesamiento distribuido.",
    body: "Iniciativa conjunta para dotar a facultades de ingeniería de nodos de cómputo y formación en agentes autónomos aplicados a la producción industrial y medios.",
    category: "CIENCIA & EDUCACIÓN",
    publishedAt: "Hace 40 min",
    sourceType: "PRESS_RELEASE",
  },
];

export async function GET() {
  return NextResponse.json(
    {
      engine: NEXORA_ENGINE_NAME,
      signature: NEXORA_SIGNATURE,
      status: "SUCCESS",
      count: activeDeskItems.length,
      items: activeDeskItems,
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: OFFICIAL_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const title = (body.title || "").trim();
    if (!title) {
      return NextResponse.json(
        {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          error: "El título del material en mesa es obligatorio.",
        },
        { status: 400, headers: OFFICIAL_HEADERS }
      );
    }

    const newItem: DeskBriefingItem = {
      id: `briefing-${Date.now()}`,
      title,
      lead: (body.lead || body.bajada || "").trim() || "Material agregado a la mesa de transmisión.",
      body: (body.body || body.cuerpo || "").trim() || title,
      category: (body.category || "ACTUALIDAD").toUpperCase(),
      coverImageUrl: body.coverImageUrl || "",
      publishedAt: new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sourceType: body.sourceType || "MANUAL_UPLOAD",
      attachedFilename: body.attachedFilename || "",
    };

    activeDeskItems = [newItem, ...activeDeskItems.slice(0, 9)];

    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        status: "SUCCESS",
        item: newItem,
        totalItems: activeDeskItems.length,
        timestamp: new Date().toISOString(),
      },
      { status: 201, headers: OFFICIAL_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: err?.message || "Error agregando material al pliego editorial",
      },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}

