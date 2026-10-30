import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — RBAC MASTER SECRET KEY MIDDLEWARE GUARD
//  Protects all `/api/nexora/:path*` endpoints from unauthorized access
// ══════════════════════════════════════════════════════════════

export function middleware(request: NextRequest) {
  const masterKey = (process.env.NEXORA_MASTER_SECRET_KEY || "").trim();

  // If no master key is configured, allow requests in degraded mode
  if (!masterKey) {
    return NextResponse.next();
  }

  // 1. Check custom header x-nexora-key
  const headerKey = request.headers.get("x-nexora-key")?.trim();

  // 2. Check Authorization Bearer header
  let bearerKey: string | null = null;
  const authHeader = request.headers.get("authorization")?.trim();
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    bearerKey = authHeader.slice(7).trim();
  }

  // 3. Check query param fallback (?key=... or ?token=...)
  const queryKey = request.nextUrl.searchParams.get("key")?.trim() ||
                   request.nextUrl.searchParams.get("token")?.trim();

  const providedKey = headerKey || bearerKey || queryKey;

  // 4. Validate key match
  if (!providedKey || providedKey !== masterKey) {
    return NextResponse.json(
      {
        error: "Acceso denegado: Clave de autenticación inválida o ausente.",
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/nexora/:path*"],
};

