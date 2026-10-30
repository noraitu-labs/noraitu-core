// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Política de Ciclo de Vida y Purga Automática
//  Zero-Cost Storage: Purga de binarios crudos en Google Drive (>180 días)
//  Garantía ontológica: preserva resúmenes, PNL y huellas biométricas
// ══════════════════════════════════════════════════════════════

import { getNeonSql, recordNeonAuditEvent, ensureNeonTablesExist } from "../db/neon";
import { deleteEnterpriseAsset } from "./drive";

export interface LifecycleOptions {
  /**
   * Días de antigüedad para considerar el audio como apto para purga.
   * Por defecto: 180 días.
   */
  retentionDays?: number;

  /**
   * Si es true, simula el proceso sin borrar archivos de Drive ni modificar Neon.
   */
  dryRun?: boolean;
}

export interface SessionPurgeDetail {
  sessionId: string;
  userId: string;
  fileId: string;
  action: "PURGED" | "SKIPPED" | "FAILED" | "DRY_RUN_ELIGIBLE";
  reason?: string;
  bytesFreed?: number;
}

export interface StorageLifecycleReport {
  success: boolean;
  retentionDays: number;
  scannedSessions: number;
  eligibleSessions: number;
  purgedSessions: number;
  skippedSessions: number;
  failedSessions: number;
  totalBytesFreed: number;
  purgedFileIds: string[];
  details: SessionPurgeDetail[];
  error?: string;
}

/**
 * Ejecuta la política de ciclo de vida del Data Lake en Neon PostgreSQL y Google Drive:
 * 1. Identifica sesiones de coaching con antigüedad superior a retentionDays (180 días por defecto).
 * 2. Verifica integridad: corrobora que el resumen reflexivo (session_summary),
 *    el perfil PNL del usuario y el vector biométrico continúen presentes en Neon.
 * 3. Elimina de Drive el archivo de audio crudo pesado.
 * 4. Actualiza en Neon raw_audio_drive_id = 'ARCHIVED_PURGED'.
 * 5. Emite telemetría a nexora_audit_logs y retorna balance de bytes liberados.
 */
export async function enforceStorageLifecycle(
  options: LifecycleOptions = {}
): Promise<StorageLifecycleReport> {
  const retentionDays = options.retentionDays ?? 180;
  const isDryRun = options.dryRun ?? false;

  const sql = getNeonSql();
  if (!sql) {
    return {
      success: false,
      retentionDays,
      scannedSessions: 0,
      eligibleSessions: 0,
      purgedSessions: 0,
      skippedSessions: 0,
      failedSessions: 0,
      totalBytesFreed: 0,
      purgedFileIds: [],
      details: [],
      error: "Cliente Neon PostgreSQL no disponible (DATABASE_URL no configurada).",
    };
  }

  try {
    await ensureNeonTablesExist();

    // Consultar sesiones que superen el período de retención y que aún posean un audio en Drive
    const rows = await sql`
      SELECT 
        cs.id,
        cs.user_id,
        cs.raw_audio_drive_id,
        cs.session_summary,
        cs.emotional_state_detected,
        cs.created_at,
        u.preferred_sensory_channel,
        (u.voice_fingerprint IS NOT NULL) AS has_biometric_embedding
      FROM coaching_sessions cs
      LEFT JOIN user_identities u ON cs.user_id = u.id
      WHERE cs.created_at < NOW() - (${retentionDays} || ' days')::interval
        AND cs.raw_audio_drive_id IS NOT NULL
        AND cs.raw_audio_drive_id != ''
        AND cs.raw_audio_drive_id != 'ARCHIVED_PURGED'
      ORDER BY cs.created_at ASC;
    `;

    const details: SessionPurgeDetail[] = [];
    const purgedFileIds: string[] = [];
    let totalBytesFreed = 0;
    let eligibleCount = 0;
    let purgedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      const sessionId = String(row.id);
      const userId = String(row.user_id || "");
      const fileId = String(row.raw_audio_drive_id);

      // ── VERIFICACIÓN DE INTEGRIDAD COGNITIVA Y BIOMÉTRICA ──
      const hasSummary = Boolean(row.session_summary && String(row.session_summary).trim().length > 10);
      const hasPnl = Boolean(row.preferred_sensory_channel);
      const hasBiometrics = Boolean(row.has_biometric_embedding);

      if (!hasSummary || !hasPnl || !hasBiometrics) {
        skippedCount++;
        const missing: string[] = [];
        if (!hasSummary) missing.push("resumen");
        if (!hasPnl) missing.push("perfil PNL");
        if (!hasBiometrics) missing.push("vector biométrico");

        details.push({
          sessionId,
          userId,
          fileId,
          action: "SKIPPED",
          reason: `Integridad incompleta en DB (${missing.join(", ")} ausente). Preservando audio crudo como salvaguarda.`,
        });
        continue;
      }

      eligibleCount++;

      // Si es simulacro (dry run), no ejecutar mutaciones
      if (isDryRun) {
        details.push({
          sessionId,
          userId,
          fileId,
          action: "DRY_RUN_ELIGIBLE",
          reason: "Cumple con todos los requisitos para purga segura.",
        });
        continue;
      }

      // ── EJECUCIÓN DE PURGA ──
      try {
        const deleteRes = await deleteEnterpriseAsset(fileId);

        if (!deleteRes.ok) {
          failedCount++;
          details.push({
            sessionId,
            userId,
            fileId,
            action: "FAILED",
            reason: deleteRes.error || "Fallo al invocar Google Drive API delete.",
          });
          continue;
        }

        const bytesFreed = deleteRes.bytesFreed || 0;
        totalBytesFreed += bytesFreed;
        purgedFileIds.push(fileId);
        purgedCount++;

        // Actualizar registro en Neon PostgreSQL
        await sql`
          UPDATE coaching_sessions
          SET raw_audio_drive_id = 'ARCHIVED_PURGED'
          WHERE id = ${sessionId};
        `;

        // Registrar auditoría del evento
        await recordNeonAuditEvent({
          sessionId,
          eventType: "DATA_LAKE:LIFECYCLE_PURGED",
          metadata: {
            sessionId,
            userId,
            fileId,
            bytesFreed,
            retentionDays,
            timestamp: new Date().toISOString(),
          },
        }).catch(() => {});

        details.push({
          sessionId,
          userId,
          fileId,
          action: "PURGED",
          bytesFreed,
        });
      } catch (opErr: any) {
        failedCount++;
        details.push({
          sessionId,
          userId,
          fileId,
          action: "FAILED",
          reason: opErr?.message || "Error inesperado durante la purga.",
        });
      }
    }

    return {
      success: true,
      retentionDays,
      scannedSessions: rows.length,
      eligibleSessions: eligibleCount,
      purgedSessions: purgedCount,
      skippedSessions: skippedCount,
      failedSessions: failedCount,
      totalBytesFreed,
      purgedFileIds,
      details,
    };
  } catch (err: any) {
    console.error("[StorageLifecycle Error]:", err?.message || err);
    return {
      success: false,
      retentionDays,
      scannedSessions: 0,
      eligibleSessions: 0,
      purgedSessions: 0,
      skippedSessions: 0,
      failedSessions: 0,
      totalBytesFreed: 0,
      purgedFileIds: [],
      details: [],
      error: err?.message || "Error al procesar el ciclo de vida de almacenamiento.",
    };
  }
}

