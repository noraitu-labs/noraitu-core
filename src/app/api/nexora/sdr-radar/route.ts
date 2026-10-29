/**
 * NEXORA ONE ENGINE — SDR RADAR & REAL-TIME INTELLIGENCE API
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Route: src/app/api/nexora/sdr-radar/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";
import { getLiveRadarNews, RadarNewsItem } from "@/lib/nexora/liveRadarFeed";

const OFFICIAL_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limitParam = parseInt(url.searchParams.get("limit") || "12", 10);
    const news = await getLiveRadarNews(limitParam);

    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        status: "OK",
        count: news.length,
        timestamp: new Date().toISOString(),
        radar_news: news,
      },
      { status: 200, headers: OFFICIAL_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        status: "ERROR",
        error: err?.message || "Failed to fetch live radar news",
      },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action || "QUOTE_IN_MESA";

    if (action === "QUOTE_IN_MESA") {
      const headline = body?.headline || "";
      const source = body?.source || "Radar Informativo";
      const promptToNora = `Nora, acaba de salir esta noticia en ${source}: "${headline}". ¿Cómo lo ves para la mesa? Danos tu lectura.`;

      return NextResponse.json(
        {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          action: "QUOTE_IN_MESA",
          headline,
          source,
          suggested_prompt: promptToNora,
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: OFFICIAL_HEADERS }
      );
    }

    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        action,
        status: "ACK",
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: OFFICIAL_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: err?.message || "Error processing SDR Radar action",
      },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}

