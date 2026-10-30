// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Endpoint de Telemetría Policial y Centinela Zero-Trust
//  Ruta: /api/security/police
//  Auditoría de amenazas, IPs bloqueadas y auto-test de infraestructura
// ══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  getPoliceTelemetry,
  verifyNetworkIdentity,
  extractClientIp,
} from "@/lib/security/network_police";
import { getNeonSql } from "@/lib/db/neon";
import { getDriveClient } from "@/lib/storage/drive";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET: Retorna el estado consolidado del Centinela de Seguridad (Neuronas de Policía)
 */
export async function GET(request: NextRequest) {
  try {
    const telemetry = await getPoliceTelemetry();
    const clientIp = extractClientIp(request.headers);
    const { trusted, identity } = await verifyNetworkIdentity(clientIp);

    return NextResponse.json({
      success: true,
      telemetry,
      clientContext: {
        ip: clientIp,
        isTrusted: trusted,
        deviceLabel: identity?.deviceLabel || "No registrado",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[Police Telemetry API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Error al obtener telemetría policial" },
      { status: 500 }
    );
  }
}

/**
 * POST: Ejecuta acciones administrativas o diagnóstico en tiempo real (Auto-test Copilot)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || "diagnostics";

    // ── ACCIÓN: AUTO-TEST DE INFRAESTRUCTURA (REDIS, NEON, GOOGLE DRIVE) ──
    if (action === "diagnostics" || action === "auto_test") {
      const results: Record<string, any> = {};

      // 1. Diagnóstico de Neon PostgreSQL
      const startNeon = Date.now();
      try {
        const sql = getNeonSql();
        if (sql) {
          const dbRes = await sql`SELECT NOW() as current_time, current_database() as db_name;`;
          results.neon = {
            status: "ONLINE",
            latencyMs: Date.now() - startNeon,
            database: dbRes[0]?.db_name || "nexora_one_db",
            timestamp: dbRes[0]?.current_time,
          };
        } else {
          results.neon = {
            status: "OFFLINE",
            error: "DATABASE_URL no configurada",
          };
        }
      } catch (neonErr: any) {
        results.neon = {
          status: "ERROR",
          latencyMs: Date.now() - startNeon,
          error: neonErr?.message || "Fallo de conexión a Neon PostgreSQL",
        };
      }

      // 2. Diagnóstico de Google Drive (5 TB Data Lake)
      const startDrive = Date.now();
      try {
        const drive = getDriveClient();
        if (drive) {
          // Prueba ligera de conexión
          const rootFolderId =
            (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim() ||
            "1zJIsPi3KgeA6Az8qNHXLoqLgOvgyj6UG";

          const driveRes = await drive.files.get({
            fileId: rootFolderId,
            fields: "id, name, mimeType",
            supportsAllDrives: true,
          });

          results.googleDrive = {
            status: "ONLINE",
            latencyMs: Date.now() - startDrive,
            folderName: driveRes.data.name || "NEXORA_ENTERPRISE_DATA_LAKE",
            quotaMode: process.env.GOOGLE_REFRESH_TOKEN ? "OAUTH2_PERSONAL_5TB" : "SERVICE_ACCOUNT",
          };
        } else {
          results.googleDrive = {
            status: "OFFLINE",
            error: "Credenciales de Google Drive no disponibles",
          };
        }
      } catch (driveErr: any) {
        results.googleDrive = {
          status: "DEGRADED",
          latencyMs: Date.now() - startDrive,
          error: driveErr?.message || "Acceso restringido o cuota en verificación",
          quotaMode: process.env.GOOGLE_REFRESH_TOKEN ? "OAUTH2_PERSONAL_5TB" : "SERVICE_ACCOUNT",
        };
      }

      // 3. Diagnóstico de Redis / Bus de Eventos
      const startRedis = Date.now();
      try {
        const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
        if (redisUrl && redisUrl.startsWith("http")) {
          const token = process.env.UPSTASH_REDIS_REST_TOKEN || "";
          const pingRes = await fetch(`${redisUrl}/ping`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const pingText = await pingRes.text();
          results.redis = {
            status: pingRes.ok ? "ONLINE" : "DEGRADED",
            latencyMs: Date.now() - startRedis,
            response: pingText.slice(0, 50),
          };
        } else {
          results.redis = {
            status: "EMULATED",
            latencyMs: 1,
            note: "Bus de eventos en memoria activo (Zero-Latency Local Dispatch)",
          };
        }
      } catch (redisErr: any) {
        results.redis = {
          status: "EMULATED",
          latencyMs: Date.now() - startRedis,
          note: "Fallback en memoria activo para eventos de cabina",
        };
      }

      return NextResponse.json({
        success: true,
        action: "diagnostics",
        results,
        overallStatus:
          results.neon?.status === "ONLINE" && results.googleDrive?.status !== "OFFLINE"
            ? "HEALTHY"
            : "DEGRADED",
        checkedAt: new Date().toISOString(),
      });
    }

    // ── ACCIÓN: REGISTRAR IDENTIDAD CONFIABLE ──
    if (action === "register_identity") {
      const { deviceLabel, ipAddress, fingerprint, imei } = body;
      if (!deviceLabel || !ipAddress) {
        return NextResponse.json(
          { success: false, error: "deviceLabel e ipAddress requeridos." },
          { status: 400 }
        );
      }

      const sql = getNeonSql();
      if (!sql) {
        return NextResponse.json(
          { success: false, error: "Conexión a Neon PostgreSQL no disponible." },
          { status: 503 }
        );
      }

      const res = await sql`
        INSERT INTO trusted_network_identities (
          device_label,
          ip_address,
          device_fingerprint,
          imei_or_serial,
          status
        ) VALUES (
          ${deviceLabel},
          ${ipAddress},
          ${fingerprint || null},
          ${imei || null},
          'ACTIVE'
        )
        RETURNING id;
      `;

      return NextResponse.json({
        success: true,
        registeredId: res[0]?.id,
        message: `Identidad '${deviceLabel}' registrada exitosamente.`,
      });
    }

    return NextResponse.json(
      { success: false, error: `Acción '${action}' no reconocida.` },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("[Police Action API Error]:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Error procesando acción policial" },
      { status: 500 }
    );
  }
}

