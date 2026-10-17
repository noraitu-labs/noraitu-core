import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let cachedSql: NeonQueryFunction<false, false> | null = null;
let lastDatabaseUrl = "";

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL || "";
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

let tableChecked = false;
let tableCheckPromise: Promise<void> | null = null;

export async function ensureTablesExist(): Promise<void> {
  if (tableChecked) return;
  if (tableCheckPromise) {
    return tableCheckPromise;
  }

  const sql = getSql();
  if (!sql) return;

  tableCheckPromise = (async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS noraitu_logs (
          id SERIAL PRIMARY KEY,
          session_id TEXT NOT NULL,
          user_message TEXT,
          assistant_response TEXT,
          has_image BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS web_cache (
          id SERIAL PRIMARY KEY,
          key_source VARCHAR(255) UNIQUE NOT NULL,
          content TEXT NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_web_cache_key ON web_cache(key_source);
      `;
      tableChecked = true;
    } catch (err) {
      console.warn("[Neon DB Init Warning]:", err);
    } finally {
      tableCheckPromise = null;
    }
  })();

  return tableCheckPromise;
}

export async function logToNeon(data: {
  sessionId: string;
  userMessage: string;
  assistantResponse: string;
  hasImage?: boolean;
}) {
  const sql = getSql();
  if (!sql) return;

  try {
    await ensureTablesExist();
    await sql`
      INSERT INTO noraitu_logs (session_id, user_message, assistant_response, has_image, created_at)
      VALUES (${data.sessionId}, ${data.userMessage}, ${data.assistantResponse}, ${data.hasImage || false}, NOW());
    `;
  } catch (err) {
    console.warn("[Neon Log Non-Blocking Warning]:", (err as Error)?.message || err);
  }
}
