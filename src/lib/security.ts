import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://nora-itu-core.vercel.app",
];

/**
 * Validador estricto de origen para APIs críticas (CORS & Anti-Abuse Shield)
 * En producción, bloquea peticiones cuyo origin o referer no coincida con el dominio autorizado.
 * En desarrollo permite localhost para pruebas locales.
 */
export function validateOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";

  // En entorno local de desarrollo permitimos localhost
  if (process.env.NODE_ENV !== "production") {
    if (
      !origin && !referer ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      referer.includes("localhost") ||
      referer.includes("127.0.0.1")
    ) {
      return null;
    }
  }

  const isOriginAllowed = ALLOWED_ORIGINS.some((allowed) =>
    origin.startsWith(allowed)
  );

  const isRefererAllowed = ALLOWED_ORIGINS.some((allowed) =>
    referer.startsWith(allowed)
  );

  // Si no cuenta con origin ni referer válidos, o no coincide con los autorizados:
  if (!isOriginAllowed && !isRefererAllowed) {
    return NextResponse.json(
      {
        error: "Forbidden: Unauthorized origin or client domain",
        status: 403,
      },
      {
        status: 403,
        headers: {
          "Access-Control-Allow-Origin": "https://nora-itu-core.vercel.app",
        },
      }
    );
  }

  return null;
}
