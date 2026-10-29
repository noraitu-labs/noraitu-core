/**
 * NEXORA ONE ENGINE — VISUAL FORGE (PRO NEWS PLACAS & CLOUD PROMOS)
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Route: src/app/api/nexora/visual-forge/route.ts
 */

import { NextRequest, NextResponse } from "next/server";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

const OFFICIAL_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
};

export interface GeneratePlacaRequest {
  action: "GENERATE_PLACA" | "GENERATE_PROMO_SCRIPT" | "RENDER_CLOUD_VISUAL";
  headline: string;
  subheadline?: string;
  category?: string;
  format: "1080x1920" | "1920x1080" | "1080x1080";
  programName?: string;
  stationDial?: string;
  accentColor?: string;
  targetSocialNetwork?: "INSTAGRAM_REELS" | "TWITTER_X" | "YOUTUBE_BROADCAST";
}

function generateNewsPlacaSvg(params: {
  headline: string;
  subheadline: string;
  category: string;
  format: "1080x1920" | "1920x1080" | "1080x1080";
  programName: string;
  stationDial: string;
  accentColor: string;
}): string {
  const isVertical = params.format === "1080x1920";
  const isSquare = params.format === "1080x1080";
  const width = isVertical ? 1080 : isSquare ? 1080 : 1920;
  const height = isVertical ? 1920 : isSquare ? 1080 : 1080;

  const accent = params.accentColor || "#06b6d4"; // Cyan default
  const dateStr = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  // Escape xml entities
  const safeHeadline = (params.headline || "ÚLTIMO MOMENTO")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const safeSubheadline = (params.subheadline || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const safeCategory = (params.category || "PRIMICIA EXCLUSIVA")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const safeProgram = (params.programName || "PANORAMA CENTRAL")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const safeDial = (params.stationDial || "FM DEL ESTE 98.7")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (isVertical) {
    // 1080x1920 Story / Reel / TikTok Placa
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811" />
      <stop offset="45%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#020408" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <!-- Cybernetic Grid Overlay -->
  <g opacity="0.08" stroke="#38bdf8" stroke-width="1.5">
    <line x1="0" y1="380" x2="${width}" y2="380" />
    <line x1="0" y1="760" x2="${width}" y2="760" />
    <line x1="0" y1="1140" x2="${width}" y2="1140" />
    <line x1="0" y1="1520" x2="${width}" y2="1520" />
    <line x1="270" y1="0" x2="270" y2="${height}" />
    <line x1="540" y1="0" x2="540" y2="${height}" />
    <line x1="810" y1="0" x2="810" y2="${height}" />
  </g>

  <!-- Ambient Glow Orbs -->
  <circle cx="200" cy="300" r="280" fill="${accent}" opacity="0.12" filter="url(#glow)" />
  <circle cx="900" cy="1400" r="340" fill="#3b82f6" opacity="0.10" filter="url(#glow)" />

  <!-- Top Studio Header -->
  <g transform="translate(80, 140)">
    <!-- Live Pill -->
    <rect width="180" height="48" rx="24" fill="#dc2626" />
    <circle cx="34" cy="24" r="8" fill="#ffffff" />
    <text x="56" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="2">EN VIVO</text>

    <!-- Category Tag -->
    <rect x="200" y="0" width="340" height="48" rx="12" fill="rgba(6,182,212,0.15)" stroke="${accent}" stroke-width="2" />
    <text x="220" y="31" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="${accent}" letter-spacing="1">${safeCategory}</text>

    <!-- Program & Dial -->
    <text x="0" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" fill="#94a3b8">${safeProgram} | ${safeDial}</text>
    <text x="0" y="145" font-family="monospace" font-size="18" font-weight="600" fill="#64748b">${dateStr}</text>
  </g>

  <!-- Central News Card Frame -->
  <rect x="70" y="380" width="940" height="1160" rx="36" fill="rgba(15,23,42,0.75)" stroke="rgba(56,189,248,0.25)" stroke-width="2" />

  <!-- Accent Divider Line -->
  <rect x="120" y="440" width="160" height="8" rx="4" fill="url(#accentGrad)" />

  <!-- Main Headline (ForeignObject for automatic word wrap) -->
  <foreignObject x="120" y="480" width="840" height="680">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 64px; font-weight: 900; line-height: 1.15; color: #ffffff; text-transform: uppercase; text-shadow: 0 4px 24px rgba(0,0,0,0.8);">
      ${safeHeadline}
    </div>
  </foreignObject>

  <!-- Subheadline / Bajada -->
  ${
    safeSubheadline
      ? `<foreignObject x="120" y="1180" width="840" height="300">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 32px; font-weight: 500; line-height: 1.4; color: #cbd5e1; border-left: 6px solid ${accent}; padding-left: 24px;">
      ${safeSubheadline}
    </div>
  </foreignObject>`
      : ""
  }

  <!-- Footer Branding -->
  <g transform="translate(80, 1680)">
    <rect width="920" height="120" rx="24" fill="rgba(2,6,23,0.85)" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
    <text x="40" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="800" fill="#ffffff">NEXORA ONE BROADCAST STUDIO</text>
    <text x="40" y="90" font-family="monospace" font-size="18" font-weight="600" fill="${accent}">Co-Conducido por Nora // Motor de Prensa &amp; Inteligencia 24/7</text>
    <text x="860" y="70" font-family="system-ui, sans-serif" font-size="28" text-anchor="end" font-weight="900" fill="#38bdf8">HD 4K</text>
  </g>
</svg>`;
  } else {
    // 1920x1080 Horizontal Broadcast / TV / Twitter X Placa
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#050811" />
      <stop offset="50%" stop-color="#0b1329" />
      <stop offset="100%" stop-color="#020408" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${accent}" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bgGrad)" />

  <g opacity="0.08" stroke="#38bdf8" stroke-width="1.5">
    <line x1="0" y1="270" x2="${width}" y2="270" />
    <line x1="0" y1="540" x2="${width}" y2="540" />
    <line x1="0" y1="810" x2="${width}" y2="810" />
    <line x1="480" y1="0" x2="480" y2="${height}" />
    <line x1="960" y1="0" x2="960" y2="${height}" />
    <line x1="1440" y1="0" x2="1440" y2="${height}" />
  </g>

  <circle cx="300" cy="200" r="280" fill="${accent}" opacity="0.14" filter="url(#glow)" />
  <circle cx="1650" cy="850" r="320" fill="#3b82f6" opacity="0.10" filter="url(#glow)" />

  <!-- Top Studio Header -->
  <g transform="translate(100, 90)">
    <rect width="180" height="48" rx="24" fill="#dc2626" />
    <circle cx="34" cy="24" r="8" fill="#ffffff" />
    <text x="56" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="2">EN VIVO</text>

    <rect x="200" y="0" width="360" height="48" rx="12" fill="rgba(6,182,212,0.15)" stroke="${accent}" stroke-width="2" />
    <text x="220" y="31" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="800" fill="${accent}" letter-spacing="1">${safeCategory}</text>

    <text x="600" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="26" font-weight="800" fill="#94a3b8">${safeProgram} | ${safeDial}</text>
    <text x="1720" y="32" font-family="monospace" font-size="20" font-weight="700" fill="#64748b" text-anchor="end">${dateStr}</text>
  </g>

  <!-- Central Card -->
  <rect x="100" y="180" width="1720" height="740" rx="36" fill="rgba(15,23,42,0.75)" stroke="rgba(56,189,248,0.25)" stroke-width="2" />

  <rect x="160" y="240" width="160" height="8" rx="4" fill="url(#accentGrad)" />

  <!-- Headline -->
  <foreignObject x="160" y="270" width="1600" height="380">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 68px; font-weight: 900; line-height: 1.15; color: #ffffff; text-transform: uppercase; text-shadow: 0 4px 24px rgba(0,0,0,0.8);">
      ${safeHeadline}
    </div>
  </foreignObject>

  <!-- Subheadline -->
  ${
    safeSubheadline
      ? `<foreignObject x="160" y="660" width="1600" height="200">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, -apple-system, sans-serif; font-size: 32px; font-weight: 500; line-height: 1.35; color: #cbd5e1; border-left: 6px solid ${accent}; padding-left: 24px;">
      ${safeSubheadline}
    </div>
  </foreignObject>`
      : ""
  }

  <!-- Footer Banner -->
  <g transform="translate(100, 960)">
    <text x="0" y="40" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="800" fill="#ffffff">NEXORA ONE ENGINE // VISUAL FORGE</text>
    <text x="440" y="40" font-family="monospace" font-size="18" font-weight="600" fill="${accent}">By Nora • Co-Conducción de Mesa</text>
    <text x="1720" y="40" font-family="monospace" font-size="18" font-weight="700" fill="#94a3b8" text-anchor="end">BROADCAST MASTER 4K</text>
  </g>
</svg>`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: GeneratePlacaRequest = await req.json();
    const action = body.action || "GENERATE_PLACA";

    if (action === "GENERATE_PLACA") {
      const format = body.format || "1080x1920";
      const svg = generateNewsPlacaSvg({
        headline: body.headline || "PRIMICIA DE TRANSMISIÓN",
        subheadline: body.subheadline || "Información en desarrollo en la mesa de noticias",
        category: body.category || "ACTUALIDAD & POLÍTICA",
        format,
        programName: body.programName || "PANORAMA CENTRAL",
        stationDial: body.stationDial || "FM DEL ESTE 98.7",
        accentColor: body.accentColor || "#06b6d4",
      });

      const svgBase64 = Buffer.from(svg).toString("base64");
      const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

      return NextResponse.json(
        {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          status: "SUCCESS",
          format,
          dataUrl,
          svg,
          filename: `NORA_PLACA_${format}_${Date.now()}.svg`,
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: OFFICIAL_HEADERS }
      );
    }

    if (action === "GENERATE_PROMO_SCRIPT") {
      // Cloud LLM quick promo generation
      const apiKey = process.env.GROQ_API_KEY;
      const headline = body.headline || "Noticia destacada del día";
      const program = body.programName || "Panorama Central";
      const dial = body.stationDial || "FM del Este 98.7";

      let promoScript = `¡Atención! En ${program} por ${dial}: ${headline}. No te quedes afuera del debate. Sumate a la mesa en vivo con Nora y todo el equipo.`;
      let visualDirection = `Placa impactante en 1080x1920 con fondo azul medianoche, tipografía blanca condensada en altas y acento cian brillante. Transición de zoom in lento hacia el titular.`;

      if (apiKey) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "openai/gpt-oss-120b",
              messages: [
                {
                  role: "system",
                  content:
                    "Eres el director de promociones y branding audiovisual de una importante emisora de radio. Devuelve un JSON estrictamente estructurado con: 'spoken_script' (texto de 15 segundos con gancho radial impactante) y 'visual_direction' (instrucción estética para la placa o reel de Instagram/TikTok).",
                },
                {
                  role: "user",
                  content: `Programa: ${program} (${dial}). Titular del día: "${headline}". Genera el guion promocional de 15s y la dirección visual.`,
                },
              ],
              temperature: 0.65,
              max_tokens: 300,
              response_format: { type: "json_object" },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
            if (parsed.spoken_script) promoScript = parsed.spoken_script;
            if (parsed.visual_direction) visualDirection = parsed.visual_direction;
          }
        } catch {
          // Fallback to default high-impact promo
        }
      }

      return NextResponse.json(
        {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          status: "SUCCESS",
          spoken_script: promoScript,
          visual_direction: visualDirection,
          targetSocialNetwork: body.targetSocialNetwork || "INSTAGRAM_REELS",
          timestamp: new Date().toISOString(),
        },
        { status: 200, headers: OFFICIAL_HEADERS }
      );
    }

    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: `Acción '${action}' no reconocida`,
      },
      { status: 400, headers: OFFICIAL_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: err?.message || "Error procesando orden en Visual Forge",
      },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}

