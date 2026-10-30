import { neon, Pool, NeonQueryFunction } from "@neondatabase/serverless";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Neon PostgreSQL Database Client (Serverless)
//  Pooling & Direct SQL execution with auto-migration
// ══════════════════════════════════════════════════════════════

declare global {
  // eslint-disable-next-line no-var
  var __neonPool: Pool | undefined;
}

let cachedSql: NeonQueryFunction<false, false> | null = null;
let lastDatabaseUrl = "";

/**
 * Returns a tagged template SQL client for serverless queries.
 */
export function getNeonSql() {
  const databaseUrl = (process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    return null;
  }
  if (cachedSql && databaseUrl === lastDatabaseUrl) {
    return cachedSql;
  }
  cachedSql = neon(databaseUrl);
  lastDatabaseUrl = databaseUrl;
  return cachedSql;
}

/**
 * Returns a connection Pool instance for transactional workloads.
 */
export function getNeonPool(): Pool | null {
  const databaseUrl = (process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    return null;
  }
  if (!global.__neonPool) {
    global.__neonPool = new Pool({ connectionString: databaseUrl, max: 10 });
  }
  return global.__neonPool;
}

/**
 * Generic query executor for Neon PostgreSQL.
 */
export async function query<T = any>(
  queryText: string,
  params: any[] = []
): Promise<T[]> {
  const sql = getNeonSql();
  if (!sql) {
    return [];
  }
  try {
    const result = await (sql as any)(queryText, params);
    return result as T[];
  } catch (error) {
    console.error("[Neon DB Query Error]:", error);
    return [];
  }
}

let tablesChecked = false;
let migrationPromise: Promise<void> | null = null;

/**
 * Ensures required Nexora control room & telemetry tables exist.
 * - nexora_sessions: Tracks live on-air broadcasting sessions.
 * - nexora_audit_logs: Tracks individual intervention events and telemetry.
 */
export async function ensureNeonTablesExist(): Promise<void> {
  if (tablesChecked) return;
  if (migrationPromise) return migrationPromise;

  const sql = getNeonSql();
  if (!sql) return;

  migrationPromise = (async () => {
    try {
      // 0. Enable pgvector extension if available
      try {
        await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
      } catch (extErr) {
        console.warn("[Neon pgvector warning]:", extErr);
      }

      // 1. Sessions table
      await sql`
        CREATE TABLE IF NOT EXISTS nexora_sessions (
          id VARCHAR(64) PRIMARY KEY,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE,
          status VARCHAR(32) DEFAULT 'ACTIVE',
          total_interventions INTEGER DEFAULT 0,
          metadata JSONB DEFAULT '{}'::jsonb
        );
      `;

      // 2. Audit logs table
      await sql`
        CREATE TABLE IF NOT EXISTS nexora_audit_logs (
          id SERIAL PRIMARY KEY,
          session_id VARCHAR(64) NOT NULL,
          event_type VARCHAR(64) NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // 3. User identities table for voice biometrics & PNL
      await sql`
        CREATE TABLE IF NOT EXISTS user_identities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          voice_fingerprint vector(512),
          preferred_sensory_channel VARCHAR(20) DEFAULT 'KINESTHETIC',
          psychological_notes JSONB DEFAULT '{}'::jsonb,
          first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // 4. Coaching sessions table for relational memory & Data Lake links
      await sql`
        CREATE TABLE IF NOT EXISTS coaching_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES user_identities(id) ON DELETE CASCADE,
          raw_audio_drive_id VARCHAR(255),
          emotional_state_detected VARCHAR(50) DEFAULT 'CALM',
          session_summary TEXT NOT NULL,
          pending_commitments JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // 5. Commercial spots table for multimedia pipeline productions
      await sql`
        CREATE TABLE IF NOT EXISTS commercial_spots (
          id VARCHAR(64) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          script TEXT NOT NULL,
          visual_prompts JSONB DEFAULT '[]'::jsonb,
          music_genre VARCHAR(64),
          voice_profile VARCHAR(64),
          aspect_ratio VARCHAR(10) DEFAULT '16:9',
          duration_seconds NUMERIC(6,2),
          video_path VARCHAR(512),
          web_url VARCHAR(512),
          status VARCHAR(32) DEFAULT 'COMPLETED',
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // 6. Performance indices
      await sql`
        CREATE INDEX IF NOT EXISTS idx_nexora_audit_session ON nexora_audit_logs(session_id);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_nexora_sessions_status ON nexora_sessions(status);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON coaching_sessions(user_id);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_coaching_sessions_created_at ON coaching_sessions(created_at);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_commercial_spots_created_at ON commercial_spots(created_at);
      `;

      tablesChecked = true;
    } catch (err) {
      console.warn("[Neon DB Schema Init Warning]:", err);
    } finally {
      migrationPromise = null;
    }
  })();

  return migrationPromise;
}

/**
 * Logs an intervention or system event into Neon DB.
 */
export async function recordNeonAuditEvent(params: {
  sessionId: string;
  eventType: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const sql = getNeonSql();
    if (!sql) return;

    await ensureNeonTablesExist();

    // Upsert session
    await sql`
      INSERT INTO nexora_sessions (id, started_at, status, total_interventions)
      VALUES (${params.sessionId}, NOW(), 'ACTIVE', 1)
      ON CONFLICT (id) DO UPDATE SET
        total_interventions = nexora_sessions.total_interventions + 1;
    `;

    // Insert audit log
    await sql`
      INSERT INTO nexora_audit_logs (session_id, event_type, metadata)
      VALUES (
        ${params.sessionId},
        ${params.eventType},
        ${JSON.stringify(params.metadata || {})}::jsonb
      );
    `;
  } catch (err) {
    console.warn("[Neon recordAuditEvent Warning]:", err);
  }
}

