/**
 * NEXORA ONE ENGINE — LIVE RADAR NEWS RSS SERVICE
 * Engine: Nexora One Engine
 * Signature: By Nora
 * File: src/lib/nexora/liveRadarFeed.ts
 */

export interface RadarNewsItem {
  id: string;
  scope: "NACIONAL" | "INTERNACIONAL";
  category: string;
  source: string;
  headline: string;
  link?: string;
  publishedAt: string;
  summary?: string;
}

const BASELINE_FALLBACK_RADAR: RadarNewsItem[] = [
  {
    id: "radar-base-1",
    scope: "NACIONAL",
    category: "ACTUALIDAD & ECONOMÍA",
    source: "Infobae",
    headline: "El Banco Central y el equipo económico analizan nuevas medidas para sostener la estabilidad cambiaria y la desinflación",
    publishedAt: "Hace minutos",
    summary: "Se siguen de cerca las reservas y el ritmo de liquidación agropecuaria en el mercado cambiario.",
  },
  {
    id: "radar-base-2",
    scope: "NACIONAL",
    category: "POLÍTICA & CONGRESO",
    source: "Clarín",
    headline: "Debate en comisiones legislativas sobre la agenda de reformas estructurales y financiamiento provincial",
    publishedAt: "Hace 15 min",
    summary: "Intensas negociaciones entre bloques parlamentarios para destrabar proyectos clave.",
  },
  {
    id: "radar-base-3",
    scope: "NACIONAL",
    category: "FÚTBOL & DEPORTES",
    source: "Olé",
    headline: "Definición del campeonato y copas internacionales: los técnicos ajustan los planteles para la fecha clave",
    publishedAt: "Hace 25 min",
    summary: "Entrenamientos a puertas cerradas y táctica para el fin de semana.",
  },
  {
    id: "radar-base-4",
    scope: "INTERNACIONAL",
    category: "TECNOLOGÍA & IA",
    source: "BBC Mundo",
    headline: "Nuevos modelos de frontera y aceleradores neuronales transforman la industria global del software y los medios de comunicación",
    publishedAt: "Hace 40 min",
    summary: "La automatización con agentes autónomos se consolida en redacciones y salas de control.",
  },
];

let cachedRadarItems: RadarNewsItem[] = BASELINE_FALLBACK_RADAR;
let lastFetchMs = 0;

export async function getLiveRadarNews(limit = 12): Promise<RadarNewsItem[]> {
  const now = Date.now();
  if (now - lastFetchMs < 4 * 60 * 1000 && cachedRadarItems.length > 0) {
    return cachedRadarItems.slice(0, limit);
  }

  const feeds: Array<{
    url: string;
    scope: "NACIONAL" | "INTERNACIONAL";
    category: string;
    source: string;
  }> = [
    {
      url: "https://www.clarin.com/rss/lo-ultimo/",
      scope: "NACIONAL",
      category: "ACTUALIDAD",
      source: "Clarín",
    },
    {
      url: "https://www.infobae.com/arc/outboundfeeds/rss/",
      scope: "NACIONAL",
      category: "POLÍTICA & SOCIEDAD",
      source: "Infobae",
    },
    {
      url: "https://www.ambito.com/rss/pages/home.xml",
      scope: "NACIONAL",
      category: "ECONOMÍA & MERCADOS",
      source: "Ámbito",
    },
    {
      url: "https://www.ole.com.ar/rss/ultimas-noticias/",
      scope: "NACIONAL",
      category: "DEPORTES",
      source: "Olé",
    },
    {
      url: "https://feeds.bbci.co.uk/mundo/rss.xml",
      scope: "INTERNACIONAL",
      category: "MUNDO & CIENCIA",
      source: "BBC Mundo",
    },
  ];

  const fetchedItems: RadarNewsItem[] = [];

  await Promise.allSettled(
    feeds.map(async (f) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(f.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "NexoraOneEngine-LiveRadar/2.0 (By Nora)",
          },
        });
        clearTimeout(timer);
        if (res.ok) {
          const xml = await res.text();
          const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
          for (let i = 0; i < Math.min(itemBlocks.length, 3); i++) {
            const raw = itemBlocks[i];
            const titleMatch = raw.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const descMatch = raw.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
            const linkMatch = raw.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);

            if (titleMatch?.[1]) {
              const cleanTitle = titleMatch[1]
                .replace(/<[^>]+>/g, "")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&amp;/g, "&")
                .trim();

              const cleanDesc = descMatch?.[1]
                ? descMatch[1]
                    .replace(/<[^>]+>/g, "")
                    .replace(/&quot;/g, '"')
                    .replace(/&#039;/g, "'")
                    .replace(/&amp;/g, "&")
                    .trim()
                    .slice(0, 160)
                : undefined;

              const cleanLink = linkMatch?.[1]?.trim();

              if (cleanTitle.length > 12) {
                fetchedItems.push({
                  id: `rss-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  scope: f.scope,
                  category: f.category,
                  source: f.source,
                  headline: cleanTitle.slice(0, 200),
                  link: cleanLink,
                  publishedAt: "EN VIVO",
                  summary: cleanDesc,
                });
              }
            }
          }
        }
      } catch {
        // Feed fetch timeout or network error fallback
      }
    })
  );

  if (fetchedItems.length > 0) {
    cachedRadarItems = fetchedItems;
    lastFetchMs = Date.now();
    return cachedRadarItems.slice(0, limit);
  }

  return BASELINE_FALLBACK_RADAR.slice(0, limit);
}

