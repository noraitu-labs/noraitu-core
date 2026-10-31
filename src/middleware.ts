import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { custodyCheck } from "@/lib/security/network_police";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — CENTINELA ZERO-TRUST (NEURONAS DE POLICÍA)
//  Custodia estricta de /api/media/*, /api/agents/*, /api/storage/* y /api/nexora/*
//  DLP (50MB), Rate-limiting y Bloqueo de IPs no autorizadas
// ══════════════════════════════════════════════════════════════

export const PUBLIC_ROUTES = [
  "/api/nexora/vision-grounding",
  "/api/nexora/radio-tts",
  "/api/nexora/radio-chat",
  "/api/nexora/dispatch",
  "/api/nexora/desk-briefing",
  "/api/noraitu-stream",
];

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 0. Whitelist perimetral explícita: Excluir endpoints de cabina interna y streaming visual
  // Permite peticiones POST directas del cliente de cabina sin interceptación 403 ni 401
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Comprobación adicional de rutas de cabina interna
  const isInternalCabinRoute =
    pathname === "/api/nexora/vision-grounding" ||
    pathname.startsWith("/api/nexora/vision-grounding") ||
    pathname === "/api/nexora/radio-tts" ||
    pathname.startsWith("/api/nexora/radio-tts") ||
    pathname === "/api/nexora/radio-chat" ||
    pathname.startsWith("/api/nexora/radio-chat") ||
    pathname === "/api/nexora/dispatch" ||
    pathname.startsWith("/api/nexora/dispatch") ||
    pathname === "/api/noraitu-stream" ||
    pathname.startsWith("/api/noraitu-stream");

  if (isInternalCabinRoute) {
    return NextResponse.next();
  }

  // 1. Custodia Zero-Trust en endpoints sensibles
  const isSensitiveEndpoint =
    pathname.startsWith("/api/media") ||
    pathname.startsWith("/api/agents") ||
    pathname.startsWith("/api/storage") ||
    pathname.startsWith("/api/nexora");

  if (isSensitiveEndpoint) {
    const contentLength = parseInt(request.headers.get("content-length") || "0", 10);
    const check = await custodyCheck({
      headers: request.headers,
      pathname,
      method: request.method,
      contentLength,
    });

    if (!check.allowed) {
      return NextResponse.json(
        {
          error: check.reason || "Acceso bloqueado por Centinela Zero-Trust (Neuronas de Policía).",
          threatType: check.threatType,
          status: check.status,
        },
        {
          status: check.status,
          headers: {
            "Content-Type": "application/json",
            "X-Police-Defense": "ACTIVE_ZERO_TRUST",
          },
        }
      );
    }
  }

  // 2. Validación de Clave Maestra en /api/nexora/*
  if (pathname.startsWith("/api/nexora")) {
    const masterKey = (process.env.NEXORA_MASTER_SECRET_KEY || "").trim();

    if (masterKey) {
      const isOperatorCabin =
        request.headers.get("x-nexora-cabin") === "true" ||
        Boolean(request.headers.get("x-nexora-operator-session")) ||
        request.headers.get("x-nexora-tenant") === "NEXORA_ONE_ENGINE";

      if (!isOperatorCabin) {
        const headerKey = request.headers.get("x-nexora-key")?.trim();
        let bearerKey: string | null = null;
        const authHeader = request.headers.get("authorization")?.trim();
        if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
          bearerKey = authHeader.slice(7).trim();
        }
        const queryKey =
          request.nextUrl.searchParams.get("key")?.trim() ||
          request.nextUrl.searchParams.get("token")?.trim();

        const providedKey = headerKey || bearerKey || queryKey;

        if (!providedKey || providedKey !== masterKey) {
          return NextResponse.json(
            {
              error: "Acceso denegado: Clave de autenticación maestra inválida o ausente.",
            },
            {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                "WWW-Authenticate": 'Bearer realm="Nexora One API"',
              },
            }
          );
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/nexora/:path*",
    "/api/media/:path*",
    "/api/agents/:path*",
    "/api/storage/:path*",
  ],
};
