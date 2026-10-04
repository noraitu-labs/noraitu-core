import { getSql } from "@/lib/db";
import { scrapeNews } from "@/lib/scraper";

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

export interface WebCacheRecord {
  id: number;
  key_source: string;
  content: string;
  updated_at: string | Date;
}

let tableEnsured = false;

/**
 * Garantiza que la tabla 'web_cache' y sus índices existan en Neon PostgreSQL
 */
export async function ensureWebCacheTable(): Promise<void> {
  if (tableEnsured) return;
  const sql = getSql();
  if (!sql) return;

  try {
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
    tableEnsured = true;
  } catch (err: any) {
    console.warn("[WebCache Table Ensure Warning]:", err?.message || err);
  }
}

// Fallback en memoria en caso de falla transitoria de red con Neon
const memoryCache = new Map<string, { content: string; timestamp: number }>();

/**
 * Obtiene el contenido de la caché.
 * Si tiene menos de 30 minutos de antigüedad, lo usa.
 * Si expiró o no existe, ejecuta el scraper nativo, actualiza Neon con ON CONFLICT DO UPDATE y retorna el nuevo texto.
 */
export async function getOrUpdateWebCache(keySource: string = "noticias_general"): Promise<string> {
  const sql = getSql();
  const now = Date.now();

  // 1. Si no hay conexión Neon disponible, usar fallback en memoria
  if (!sql) {
    const mem = memoryCache.get(keySource);
    if (mem && now - mem.timestamp < CACHE_TTL_MS) {
      return mem.content;
    }
    const fresh = await scrapeNews(keySource);
    memoryCache.set(keySource, { content: fresh, timestamp: now });
    return fresh;
  }

  try {
    await ensureWebCacheTable();

    // 2. Buscar en Neon web_cache
    const rows = (await sql`
      SELECT id, key_source, content, updated_at
      FROM web_cache
      WHERE key_source = ${keySource}
      LIMIT 1;
    `) as WebCacheRecord[];

    if (rows && rows.length > 0) {
      const record = rows[0];
      const updatedAt = new Date(record.updated_at).getTime();
      const ageMs = now - updatedAt;

      // Si los datos tienen menos de 30 minutos de antigüedad, utilizarlos directamente
      if (ageMs < CACHE_TTL_MS && record.content && record.content.trim().length > 0) {
        return record.content;
      }
    }

    // 3. Expiraron o no existen: ejecutar scraper nativo
    const freshContent = await scrapeNews(keySource);

    // 4. Actualizar la tabla con Neon SDK (ON CONFLICT (key_source) DO UPDATE)
    try {
      const updatedRows = (await sql`
        INSERT INTO web_cache (key_source, content, updated_at)
        VALUES (${keySource}, ${freshContent}, CURRENT_TIMESTAMP)
        ON CONFLICT (key_source)
        DO UPDATE SET
          content = EXCLUDED.content,
          updated_at = CURRENT_TIMESTAMP
        RETURNING content;
      `) as { content: string }[];

      if (updatedRows && updatedRows.length > 0) {
        return updatedRows[0].content;
      }
    } catch (upsertErr: any) {
      console.error("[WebCache Upsert Error]:", upsertErr?.message || upsertErr);
    }

    return freshContent;
  } catch (err: any) {
    console.error("[WebCache Retrieval Error]:", err?.message || err);
    // En caso de error inesperado, salvaguardar con scraper directo o memoria
    const mem = memoryCache.get(keySource);
    if (mem && now - mem.timestamp < CACHE_TTL_MS) {
      return mem.content;
    }
    const fallbackFresh = await scrapeNews(keySource);
    memoryCache.set(keySource, { content: fallbackFresh, timestamp: now });
    return fallbackFresh;
  }
}
