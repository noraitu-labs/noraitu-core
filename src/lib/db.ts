import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL || "";

export const sql = databaseUrl ? neon(databaseUrl) : null;

export async function ensureTablesExist() {
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
  if (!sql) return;
  try {
    await ensureTablesExist();
    await sql`
      INSERT INTO noraitu_logs (session_id, user_message, assistant_response, has_image, created_at)
      VALUES (${data.sessionId}, ${data.userMessage}, ${data.assistantResponse}, ${data.hasImage || false}, NOW());
    `;
  } catch (err) {
    console.warn("[Neon Log Error]:", err);
  }
}
