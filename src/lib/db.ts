import { neon } from "@neondatabase/serverless";

export function getSql() {
  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    console.warn("[Neon DB Warning]: DATABASE_URL is not set.");
    return null;
  }
  return neon(databaseUrl);
}

let tableChecked = false;

export async function ensureTablesExist() {
  if (tableChecked) return;
  const sql = getSql();
  if (!sql) return;
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
    tableChecked = true;
  } catch (err) {
    console.warn("[Neon DB Init Warning]:", err);
  }
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
    console.log("[Neon Log Success]: Saved log for session", data.sessionId);
  } catch (err) {
    console.error("[Neon Log Error]:", err);
  }
}
