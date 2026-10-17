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
let tableEnsurePromise: Promise<void> | null = null;

export async function ensureWebCacheTable(): Promise<void> {
  if (tableEnsured) return;
  if (tableEnsurePromise) return tableEnsurePromise;

  const sql = getSql();
  if (!sql) return;

  tableEnsurePromise = (async () => {
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
    } finally {
      tableEnsurePromise = null;
    }
  })();

  return tableEnsurePromise;
}

// Fallback en memoria en caso de falla transitoria de red con Neon
const memoryCache = new Map<string, { content: string; timestamp: number }>();

// Single-Flight deduplication: Evita disparar múltiples scrapings simultáneos para la misma clave
const inFlightScrapes = new Map<string, Promise<string>>();

/**
 * Obtiene el contenido de la caché de forma ultra-rápida.
 * - Single-Flight deduplication para llamadas concurrentes
 * - Fallback instantáneo en memoria si Neon o el scraper externo demoran
 */
export async function getOrUpdateWebCache(keySource: string = "noticias_general"): Promise<string> {
  const existingInFlight = inFlightScrapes.get(keySource);
  if (existingInFlight) {
    return existingInFlight;
  }

  const promise = (async () => {
    const sql = getSql();
    const now = Date.now();

    // 1. Si no hay conexión Neon disponible, usar memoria
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
          memoryCache.set(keySource, { content: record.content, timestamp: now });
          return record.content;
        }
      }

      // 3. Expiraron o no existen: ejecutar scraper con timeout de 3000ms
      const scrapePromise = scrapeNews(keySource);
      const timeoutPromise = new Promise<string>((resolve) =>
        setTimeout(() => {
          const mem = memoryCache.get(keySource);
          resolve(mem?.content || "Información de actualidad en actualización continua.");
        }, 3000)
      );

      const freshContent = await Promise.race([scrapePromise, timeoutPromise]);
      memoryCache.set(keySource, { content: freshContent, timestamp: now });

      // 4. Actualizar tabla de Neon en segundo plano de forma no-bloqueante
      (async () => {
        try {
          await sql`
            INSERT INTO web_cache (key_source, content, updated_at)
            VALUES (${keySource}, ${freshContent}, CURRENT_TIMESTAMP)
            ON CONFLICT (key_source)
            DO UPDATE SET
              content = EXCLUDED.content,
              updated_at = CURRENT_TIMESTAMP;
          `;
        } catch {}
      })();

      return freshContent;
    } catch (err: any) {
      const mem = memoryCache.get(keySource);
      return mem?.content || "Información de actualidad operativa.";
    }
  })();

  inFlightScrapes.set(keySource, promise);
  try {
    return await promise;
  } finally {
    inFlightScrapes.delete(keySource);
  }
}
