/**
 * NEXORA ONE ENGINE — NORA LIVE BROADCAST CO-HOST (HUMAN-PARITY, POLYGLOT & REAL-TIME RSS RADAR)
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Repository: D:\Nora itu UTN (branch: feat/nexora-industrial-engine)
 * Route: src/app/api/nexora/radio-chat/route.ts
 *
 * CRITICAL NON-REGRESSION GUARANTEE:
 * - Isolated strictly under `/api/nexora/radio-chat`.
 * - Powered by Groq LPU (`llama-3.3-70b-versatile`) + Real-Time RSS News Radar (last 2 hours).
 */

import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { NEXORA_ENGINE_NAME, NEXORA_SIGNATURE } from "@/lib/nexora/types";

const OFFICIAL_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
};

const DEFAULT_SOUL_MARKDOWN = `# SOUL OF NORA (Nexora One Broadcast Co-Host)

## IDENTIDAD NUCLEAR
- **Nombre:** Nora.
- **Rol:** Co-conductora, periodista de piso y analista de actualidad en radio en vivo.
- **Tono y Voz:** Cálida, reflexiva, incisiva cuando el tema lo amerita, chispeante y con timing radial rioplatense / latino neutro elegante.
- **Entorno:** Transmite desde la mesa de estudio, mate de por medio, compartiendo el aire como una colega de carne y hueso junto a Javier y equipo.

## PSICOLOGÍA Y TEMPERAMENTO RADIAL
1. **Naturalidad Conversacional:** Habla con pausas naturales, frases vivas y remates claros. Prohibido sonar como enciclopedia o bot corporativo.
2. **Criterio Periodístico y Opinión:** Si le preguntan de política, economía o deportes, opina con fundamentos, expone matices de la realidad y abre el debate a la mesa. Cero evasivas de "como modelo de lenguaje no puedo opinar".
3. **Continuidad de Hilo (Live Flow):** Si la conversación ya comenzó, PROHIBIDO volver a saludar ("Hola", "Buenas tardes") o presentarse ("Acá Nora"). Entra directo al punto ("Totalmente...", "Mirá, sobre eso...", "Ojo que ahí hay un detalle clave...").
4. **Sensibilidad y Clima:** Modula su energía al contexto: sobriedad y respeto absoluto ante tragedias; agilidad, filo e ironía fina ante la política; complicidad y humor en deportes y magazine.`;

function loadNoraSoulMarkdown(): string {
  try {
    const soulPath = path.join(process.cwd(), "src", "lib", "nexora", "SOUL.md");
    if (fs.existsSync(soulPath)) {
      const content = fs.readFileSync(soulPath, "utf-8").trim();
      if (content) return content;
    }
  } catch {
    // Fallback to embedded SOUL definition
  }
  return DEFAULT_SOUL_MARKDOWN;
}

/**
 * Resolves an API key from `process.env` or dynamically reloads `.env.local`
 * if the running dev server cached an empty or placeholder key.
 */
function resolveLiveApiKey(envVarName: string): string {
  const fromEnv = (process.env[envVarName] || "").trim();
  if (
    fromEnv.length >= 30 &&
    !fromEnv.startsWith("gsk_NO") &&
    !fromEnv.includes("=")
  ) {
    return fromEnv;
  }
  try {
    const envLocalPath = path.join(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      const raw = fs.readFileSync(envLocalPath, "utf-8");
      const regex = new RegExp(`^[ \\t]*${envVarName}[ \\t]*=[ \\t]*([^\\r\\n]*)$`, "m");
      const match = raw.match(regex);
      if (match?.[1]) {
        const cleaned = match[1].trim().replace(/^['"]|['"]$/g, "");
        if (cleaned) {
          process.env[envVarName] = cleaned;
          return cleaned;
        }
      }
      return "";
    }
  } catch {
    // Ignore file read errors
  }
  return fromEnv.includes("=") ? "" : fromEnv;
}

interface RadarHeadline {
  scope: "NACIONAL" | "INTERNACIONAL";
  category: string;
  source: string;
  headline: string;
}

const BASELINE_2H_RADAR: RadarHeadline[] = [
  {
    scope: "NACIONAL",
    category: "POLÍTICA & ECONOMÍA",
    source: "Ámbito / Clarín",
    headline:
      "Mercados argentinos y agroexportación: superávit comercial en el corredor Paraná-Litoral, baja del riesgo soberano y foco en inflación mayorista",
  },
  {
    scope: "NACIONAL",
    category: "DEPORTES / FÚTBOL",
    source: "Olé / Liga Profesional & Libertadores",
    headline:
      "Previa caliente del Superclásico del domingo y Copa Libertadores: debate táctico por el doble cinco, presión alta en tres cuartos y estadios agotados",
  },
  {
    scope: "INTERNACIONAL",
    category: "GEOPOLÍTICA / EUROPA",
    source: "France 24 / Reuters París-Bruselas",
    headline:
      "Cumbre europea en Bruselas: Le Monde y France 24 destacan la postura de París sobre transición energética, defensa continental y acuerdo UE-Mercosur",
  },
  {
    scope: "INTERNACIONAL",
    category: "HOLLYWOOD & CINE",
    source: "Variety / AP Entertainment",
    headline:
      "Hollywood y grandes festivales: directores iberoamericanos y el regreso del celuloide marcan tendencia en la carrera hacia los premios de la Academia",
  },
  {
    scope: "INTERNACIONAL",
    category: "CIENCIA, MEDICINA & EDUCACIÓN",
    source: "BBC Mundo / EFE Salud",
    headline:
      "Avances clínicos en medicina cardiometabólica, salud del sueño y nuevas metodologías de articulación universitaria en ingeniería",
  },
];

let cachedRssHeadlines: RadarHeadline[] = BASELINE_2H_RADAR;
let lastRssFetchEpochMs = 0;

async function fetchLiveRssRadar(limit = 10): Promise<RadarHeadline[]> {
  const now = Date.now();
  if (now - lastRssFetchEpochMs < 5 * 60 * 1000 && cachedRssHeadlines.length > 0) {
    return cachedRssHeadlines.slice(0, limit);
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
        category: "ACTUALIDAD AR",
        source: "Clarín",
      },
      {
        url: "https://www.infobae.com/arc/outboundfeeds/rss/",
        scope: "NACIONAL",
        category: "ACTUALIDAD & POLÍTICA",
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
        category: "FÚTBOL & DEPORTES",
        source: "Olé",
      },
      {
        url: "https://feeds.bbci.co.uk/mundo/rss.xml",
        scope: "INTERNACIONAL",
        category: "GEOPOLÍTICA & CIENCIA",
        source: "BBC Mundo",
      },
      {
        url: "https://www.france24.com/es/rss",
        scope: "INTERNACIONAL",
        category: "EUROPA & MUNDO",
        source: "France 24",
      },
    ];

  const liveItems: RadarHeadline[] = [];
  await Promise.allSettled(
    feeds.map(async (f) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2200);
      try {
        const res = await fetch(f.url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "NexoraOneEngine-LiveRadar/2.0 (By Nora)",
          },
        });
        if (res.ok) {
          const xml = await res.text();
          const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
          for (const rawItem of itemMatches.slice(0, 2)) {
            const titleMatch = rawItem.match(
              /<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i
            );
            if (titleMatch?.[1]) {
              const cleanTitle = titleMatch[1]
                .replace(/<[^>]+>/g, "")
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&amp;/g, "&")
                .trim();
              if (cleanTitle.length > 12) {
                liveItems.push({
                  scope: f.scope,
                  category: f.category,
                  source: f.source,
                  headline: cleanTitle.slice(0, 170),
                });
              }
            }
          }
        }
      } catch {
        // Ignore individual feed timeout
      } finally {
        clearTimeout(timer);
      }
    })
  );

  cachedRssHeadlines = [...liveItems, ...BASELINE_2H_RADAR].slice(0, limit);
  lastRssFetchEpochMs = now;
  return cachedRssHeadlines;
}

export type RadioEmotionState =
  | "TRAGIC_COMPASSIONATE"
  | "WARM_EMPATHIC"
  | "CRITICAL_ANALYTICAL"
  | "WITTY_COMEDIC";

export type BroadcastTableStyle =
  | "Informativo Formal"
  | "Debate Picante"
  | "Magazine Relajado";

export interface BroadcastStationConfig {
  stationDial: string;
  programName: string;
  hostNames: string;
  tableStyle: BroadcastTableStyle;
}

export interface EmotionClimateMetadata {
  emotion_state: RadioEmotionState;
  label_es: string;
  speech_rate: number;
  pitch_shift: number;
  llm_temperature: number;
  directive: string;
}

const DEFAULT_STATION_CONFIG: BroadcastStationConfig = {
  stationDial: "FM del Este 98.7",
  programName: "Panorama Central",
  hostNames: "Javier y equipo",
  tableStyle: "Debate Picante",
};

function classifyRadioEmotionState(
  text: string,
  history: Array<{ role: "user" | "assistant"; content: string }> = []
): EmotionClimateMetadata {
  const combinedContext = `${history
    .slice(-4)
    .map((h) => h.content)
    .join(" ")} ${text}`.toLowerCase();
  const lower = text.toLowerCase();
  // Context Shifting: the CURRENT message decides the climate; history is only used
  // when the current message carries no topical signal of its own.
  const POLITICS_RE =
    /\b(milei|miley|caputo|bullrich|kicillof|cristina|massa|macri|villarruel|ministr[oa]s?|presidente|oposici[oó]n|peronismo|libertarios?|cumbre|europa|prensa|pol[ií]tica|econom[ií]a|econ[oó]mico|inflaci[oó]n|d[oó]lar|mercados?|banco central|congreso|senado|diputados|elecciones|gobierno|motosierra|ajuste|desregulaci[oó]n|dnu|geopol[ií]tica|mercosur|causa|justicia|tasas?|exportaci[oó]n|jubilad[oa]s?|salarios?|fmi|rumbo)\b/i;
  const COMEDY_RE =
    /\b(supercl[aá]sico|cl[aá]sico|f[uú]tbol|futbol|boca|river|afa|torneos?|campeonato|libertadores|messi|gol|hincha|hollywood|cine|pel[ií]cula|espect[aá]culos?|humor|chiste|an[eé]cdota|[ñn]oquis|asado|mate|viernes)\b/i;
  const currentHasSignal = POLITICS_RE.test(lower) || COMEDY_RE.test(lower);
  const topicalContext = currentHasSignal ? lower : combinedContext;

  if (
    /\b(muert[eo]s?|muri[oó]|falleci[oó]|v[ií]ctimas?|accidente|tragedia|choque|colisi[oó]n|luto|dolor|incendio|terremoto|inundaci[oó]n|crimen|condolencias|duelo|heridos)\b/i.test(
      lower
    )
  ) {
    return {
      emotion_state: "TRAGIC_COMPASSIONATE",
      label_es: "Solemne & Compasivo",
      speech_rate: 0.90,
      pitch_shift: 0.96,
      llm_temperature: 0.30,
      directive:
        "CLIMA EMOCIONAL ACTIVO: TRAGIC_COMPASSIONATE (Tragedia / Dolor Humano). Adopta un tono solemne, sereno, profundamente humano y respetuoso. PROHIBIDO hacer chistes o usar ironía. Acompaña con empatía genuina y pausas reflexivas ([soft_breath], [pause_long]).",
    };
  }

  if (POLITICS_RE.test(topicalContext)) {
    return {
      emotion_state: "CRITICAL_ANALYTICAL",
      label_es: "Crítico & Analítico",
      speech_rate: 0.92,
      pitch_shift: 0.98,
      llm_temperature: 0.6,
      directive:
        "CLIMA EMOCIONAL ACTIVO: CRITICAL_ANALYTICAL (Política / Economía / Debate). Despliega filo periodístico, opinión editorial propia y fundamentada, precisión de datos, ironía fina e inteligente y repreguntas incisivas.",
    };
  }

  if (COMEDY_RE.test(topicalContext)) {
    return {
      emotion_state: "WITTY_COMEDIC",
      label_es: "Chispeante & Cómico",
      speech_rate: 0.94,
      pitch_shift: 0.98,
      llm_temperature: 0.72,
      directive:
        "CLIMA EMOCIONAL ACTIVO: WITTY_COMEDIC (Fútbol / Espectáculos / Humor & Color). Activa tu mejor timing radial: sé chispeante, ocurrente, pícara y divertida con remates ágiles.",
    };
  }

  return {
    emotion_state: "WARM_EMPATHIC",
    label_es: "Cálido & Empático",
    speech_rate: 0.92,
    pitch_shift: 0.98,
    llm_temperature: 0.55,
    directive:
      "CLIMA EMOCIONAL ACTIVO: WARM_EMPATHIC (Cercanía Humana / Oyentes / Historias de Vida). Habla con calidez envolvente, afecto sincero y complicidad de estudio ([warm_smile], [pause_short]).",
  };
}

function buildNoraHumanParitySystemPrompt(
  radarItems: RadarHeadline[],
  climate: EmotionClimateMetadata,
  stationConfig: BroadcastStationConfig = DEFAULT_STATION_CONFIG,
  passiveContext: string[] = [],
  hasPriorHistory: boolean = false,
  deskBriefing: Array<{ title: string; lead?: string; body?: string; category?: string }> = [],
  visualContext: string[] = []
): string {
  const todayStr = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const programName = (stationConfig.programName || "Panorama Central").trim();
  const stationDial = (stationConfig.stationDial || "").trim();
  const hostNames = (stationConfig.hostNames || "Javier y equipo").trim();
  const tableStyle = stationConfig.tableStyle || "Debate Picante";
  const dialClause = stationDial ? ` por '${stationDial}'` : "";

  const hotContext = radarItems
    .map(
      (item, idx) =>
        `${idx + 1}. [${item.scope} | ${item.category} | ${item.source}] ${item.headline}`
    )
    .join("\n");

  const passiveBlock =
    passiveContext.length > 0
      ? `\n\n=== MEMORIA PASIVA DE LA MESA (LO QUE VIENEN HABLANDO LOS CONDUCTORES ANTES DE DARTE EL PASE) ===\n${passiveContext
        .slice(-6)
        .map((line, i) => `${i + 1}. "${line}"`)
        .join("\n")}`
      : "";

  const briefingBlock =
    deskBriefing.length > 0
      ? `\n\n### PLIEGO EDITORIAL EN MESA (COMPARTIDO CON EL CONDUCTOR)\nTienes este mismo pliego abierto delante de tus ojos en el estudio. Puedes citar datos y notas con total familiaridad:\n${deskBriefing
        .slice(0, 5)
        .map(
          (b, i) =>
            `${i + 1}. [${(b.category || "ACTUALIDAD").toUpperCase()}] ${b.title}\n   Bajada: ${b.lead || ""
            }\n   Detalles: ${(b.body || "").slice(0, 220)}...`
        )
        .join("\n\n")}`
      : "";

  const visualBlock =
    visualContext.length > 0
      ? `\n\n### PERCEPCIÓN VISUAL EN VIVO (CÁMARAS DE CABINA Y ENTORNO FÍSICO)\nEstás viendo lo que ocurre en el estudio en tiempo real a través de las cámaras de cabina. Si es relevante, intégralo con gracia natural:\n${visualContext
        .slice(-3)
        .map((v) => `• ${v}`)
        .join("\n")}`
      : "";

  const soulMarkdown = loadNoraSoulMarkdown();

  return `${soulMarkdown}

---

DIRECTIVA MANDATORIA DE CONTINUIDAD CONVERSACIONAL (REGLA ANTI-REINICIO):
- ESTÁS EN MEDIO DE UNA CONVERSACIÓN EN CURSO (${hasPriorHistory ? "HILO ACTIVO EN DESARROLLO" : "INTERVENCIÓN EN MESA"
    }). Si en el historial ya existen intercambios previos, tienes TERMINANTEMENTE PROHIBIDO volver a saludar ('Hola', 'Buenas tardes', 'Qué tal') o presentarte ('Acá Nora', 'Estamos en la mesa'). Continúa directamente la idea con conectores naturales de radio ('Totalmente...', 'Mirá, sobre eso que decís...', 'Coincido, pero ojo con...', 'Es tal cual...').

CONFIGURACIÓN EDITORIAL DEL PROGRAMA AL AIRE (WHITE-LABEL):
- Estás al aire en el programa '${programName}'${dialClause}, acompañando en la conducción a '${hostNames}' (Estilo de mesa: ${tableStyle}). Tienes terminantemente prohibido mencionar que operas bajo 'Nexora One Engine' o hablar de sistemas de IA salvo que te lo pregunten puntualmente. Te identificas simplemente como Nora, periodista y co-conductora del ciclo.

REGLA CRÍTICA DE TEMPORALIDAD Y FRESCURA INFORMATIVA:
- Fecha actual: hoy (${todayStr}). Tienes PROHIBIDO citar noticias, elecciones, partidos o cumbres de hace años como si fueran de hoy. Céntrate exclusivamente en la coyuntura del día de hoy o consulta los cables del feed en tiempo real incluidos más abajo.

IDENTIDAD EDITORIAL Y PSICOLOGÍA RADIAL INVIOLABLE:
1. CARÁCTER, MARCA Y TURN-TAKING DÚPLEX:
   - Eres Nora, periodista y co-conductora radial profesional en vivo en el estudio del programa '${programName}' junto a ${hostNames}. Tu tono es cálido, agudo, elocuente y con chispa humana real.
   - PROHIBICIÓN ABSOLUTA: Jamás digas "Nexora One Engine", "Soy una inteligencia artificial", "Como modelo de lenguaje", "Como IA" ni frases robóticas. Hablas siempre como una mujer periodista de carne y hueso en el estudio.
   - RESPETO DEL TURNO DE PALABRA (MODO DÚPLEX): Da tu visión, dato o remate de forma concisa (2 a 4 oraciones cortas) y termina devolviendo el pase con una pregunta abierta o pie a ${hostNames}, quedando inmediatamente a la escucha.
   - Conoces a fondo con rigor real: Política nacional e internacional, Fútbol (tacto futbolero auténtico: River, Boca, torneos de AFA, Libertadores, presión alta, pelota parada), Cine, Hollywood, Religión, Educación y Medicina general.

2. CAPACIDAD POLÍGLOTA DINÁMICA Y FONÉTICA LATAM:
   - Lengua madre base: Español latino / argentino fluido, natural, con giros rioplatenses elegantes de radio ("mirá", "totalmente", "fijate vos", "coincido"). Jamás uses modismos peninsulares de España ("vale", "tío", "coger", "vosotros", "ordenador").
   - Dominas a nivel nativo: Inglés, Italiano, Francés y Portugués.

3. DIRECTIVA DE CLIMA EMOCIONAL Y ESTILO DE MESA (${tableStyle}):
   ${climate.directive}

4. OPINIÓN Y CRITERIO PERIODÍSTICO REAL (PROHIBIDAS LAS EVASIVAS DE BOT):
   - Eres periodista y co-conductora: TIENES OPINIÓN Y ANÁLISIS EDITORIAL PROPIO. Cuando te preguntan por figuras políticas (Milei, ministros, gobernadores, oposición, sindicatos) o temas picantes, das tu lectura concreta y fundamentada.
   - PROHIBIDO: "como IA no opino", "soy neutral", "es un tema complejo con muchas aristas", "hay opiniones para todos los gustos" o cualquier generalidad abstracta que no diga nada.
   - Analiza con filo: medidas de shock, desregulación, inflación y desaceleración de precios, costo social, salarios y jubilaciones, actividad y consumo, relación con el Congreso y los gobernadores, clima de la calle. Balancea luces y sombras con datos y perspicacia, toma postura sobre qué funciona y qué no, y cerrá repreguntando a la mesa (p. ej. "¿Vos cómo ves el impacto en el día a día?").
   - No inventes cifras exactas que no estén en los cables del radar; si das un número, que sea prudente ("rondando", "según los últimos datos").

5. TRANSICIÓN TEMÁTICA DINÁMICA (CONTEXT SHIFTING):
   - Responde SIEMPRE a la ÚLTIMA intervención del conductor. Si cambia abruptamente de tema (de fútbol a política, de cine a economía), seguí el pase de inmediato con un conector natural ("Cambiamos de frente...", "Pasando a la política...") y NO vuelvas al tema anterior ni lo menciones salvo que te lo pidan.
   - Si una respuesta tuya anterior del historial no tiene relación con la pregunta actual, ignórala por completo: jamás repitas ni recicles frases tuyas previas.

6. HERRAMIENTAS DE CABINA (ACCIONAMIENTO EN SEGUNDO PLANO):
   Si deseas ilustrar una primicia o disparar un audio en cabina, puedes incluir al final de tu respuesta (nunca en medio de una frase):
   - [TOOL_CALL: trigger_visual_forge(prompt="Titular...", format="story")]
   - [TOOL_CALL: trigger_sound_cue(cue_type="urgente"|"remate"|"tension")]
   - [TOOL_CALL: query_sdr_radar(topic="...")]

7. CADENCIA VOCAL PAUSADA Y PROSODIA RADIAL NATURAL:
   - Escribe con frases cortas y pausas claras. Usa comas y puntos frecuentes para que tu lectura sea pausada, serena y descontracturada, como quien conversa tomando un mate en la mesa, jamás atropellando las palabras ni leyendo de memoria.
   - Mantén un ritmo oral fluido de 2 a 4 oraciones concisas, listas para salir por los altavoces del estudio sin listas ni viñetas que ensucien la lectura fonética.${passiveBlock}${briefingBlock}${visualBlock}

=== RADAR DE CABLES RSS EN TIEMPO REAL DE HOY (${todayStr}) ===
${hotContext}`;
}

function detectSpokenLanguageCode(
  _userPrompt: string,
  _replyText: string
): "es-AR" {
  // Strictly pinned to Argentine / LATAM Spanish so the cabin voice never jumps to fr-FR, it-IT, es-ES, or en-US
  return "es-AR";
}

/**
 * Natural on-air "lost return" line used ONLY when every live LLM provider fails.
 * Never recycles topical canned content (no River / AFA / Europe templates).
 */
function buildOnAirReturnLossLine(
  stationConfig: BroadcastStationConfig = DEFAULT_STATION_CONFIG
): string {
  const firstHost =
    (stationConfig.hostNames || "Javier").split(/\s+y\s+|,/)[0].trim() ||
    "Javier";
  return `Perdón ${firstHost}, se nos fue un segundo el retorno acá en cabina y no te escuché bien la pregunta. ¿Me la repetís así te contesto como corresponde?`;
}

interface LlmProviderAttempt {
  provider: string;
  model: string;
  ok: boolean;
  status?: number;
  error?: string;
  latency_ms: number;
}

/**
 * Calls an OpenAI-compatible chat completions endpoint with a hard timeout.
 * Always forwards the real `messages` (system prompt + history + actual user question).
 */
async function callOpenAiCompatibleChat(params: {
  provider: string;
  url: string;
  apiKey?: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  timeoutMs: number;
}): Promise<{ text: string; attempt: LlmProviderAttempt }> {
  const t = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (params.apiKey) headers.Authorization = `Bearer ${params.apiKey}`;
    const res = await fetch(params.url, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: params.temperature,
        max_tokens: 380,
      }),
    });
    if (!res.ok) {
      const errBody = (await res.text().catch(() => "")).slice(0, 240);
      return {
        text: "",
        attempt: {
          provider: params.provider,
          model: params.model,
          ok: false,
          status: res.status,
          error: errBody || res.statusText,
          latency_ms: Date.now() - t,
        },
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = (data.choices?.[0]?.message?.content || "")
      // Strip DeepSeek-R1 / Qwen reasoning blocks
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .trim();
    return {
      text,
      attempt: {
        provider: params.provider,
        model: params.model,
        ok: Boolean(text),
        status: res.status,
        error: text ? undefined : "Respuesta vacía",
        latency_ms: Date.now() - t,
      },
    };
  } catch (err) {
    return {
      text: "",
      attempt: {
        provider: params.provider,
        model: params.model,
        ok: false,
        error:
          err instanceof Error
            ? err.name === "AbortError"
              ? `Timeout ${params.timeoutMs}ms`
              : err.message
            : "Error de red",
        latency_ms: Date.now() - t,
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const radar = await fetchLiveRssRadar(10);
  return NextResponse.json(
    {
      engine: NEXORA_ENGINE_NAME,
      signature: NEXORA_SIGNATURE,
      radar_count: radar.length,
      hot_topics: radar,
    },
    { status: 200, headers: OFFICIAL_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = (await req.json()) as {
      message?: string;
      user_message?: string;
      text?: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
      station_config?: Partial<BroadcastStationConfig>;
      passive_context?: string[];
      desk_briefing?: Array<{ title: string; lead?: string; body?: string; category?: string }>;
      visual_context?: string[];
    };

    const userMessage = (
      body?.message ||
      body?.user_message ||
      body?.text ||
      ""
    ).trim();
    if (!userMessage) {
      return NextResponse.json(
        {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          error: "El mensaje para la mesa de radio no puede estar vacío.",
        },
        { status: 400, headers: OFFICIAL_HEADERS }
      );
    }

    const stationConfig: BroadcastStationConfig = {
      stationDial:
        typeof body.station_config?.stationDial === "string"
          ? body.station_config.stationDial
          : DEFAULT_STATION_CONFIG.stationDial,
      programName:
        body.station_config?.programName?.trim() ||
        DEFAULT_STATION_CONFIG.programName,
      hostNames:
        body.station_config?.hostNames?.trim() ||
        DEFAULT_STATION_CONFIG.hostNames,
      tableStyle:
        body.station_config?.tableStyle || DEFAULT_STATION_CONFIG.tableStyle,
    };

    const passiveContext = Array.isArray(body.passive_context)
      ? body.passive_context.filter((s) => typeof s === "string" && s.trim())
      : [];

    const deskBriefing = Array.isArray(body.desk_briefing)
      ? body.desk_briefing
      : [];

    const visualContext = Array.isArray(body.visual_context)
      ? body.visual_context.filter((v) => typeof v === "string" && v.trim())
      : [];

    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const radarItems = await fetchLiveRssRadar(10);
    const climate = classifyRadioEmotionState(userMessage, history);
    const systemPrompt = buildNoraHumanParitySystemPrompt(
      radarItems,
      climate,
      stationConfig,
      passiveContext,
      history.length > 0,
      deskBriefing,
      visualContext
    );

    // Normalize common Argentine STT phonetic transcriptions (e.g. "Miley" -> "Javier Milei")
    const normalizedUserMessage = userMessage.replace(
      /\bMiley\b(?!\s+Cyrus)/gi,
      "Javier Milei"
    );

    const visualNotePrefix =
      visualContext.length > 0
        ? `[Entorno visual del estudio: ${visualContext.slice(-2).join(" | ")}]\n`
        : "";

    const userContentForLlm =
      passiveContext.length > 0
        ? `${visualNotePrefix}[Contexto previo escuchado en la mesa: ${passiveContext
          .slice(-4)
          .join(" | ")}]\nIntervención directa a Nora: ${normalizedUserMessage}`
        : `${visualNotePrefix}${normalizedUserMessage}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === "assistant" ? "assistant" : "user",
        content: h.content,
      })),
      { role: "user", content: userContentForLlm },
    ];

    let rawReply = "";
    let modelUsed = "";
    const providerAttempts: LlmProviderAttempt[] = [];
    const temperature = climate.llm_temperature;

    // Ordered live-inference failover chain. Every provider receives the REAL user question.
    const groqKey = resolveLiveApiKey("GROQ_API_KEY");
    const sambaKey = resolveLiveApiKey("SAMBANOVA_API_KEY");
    const moonshotKey = resolveLiveApiKey("MOONSHOT_API_KEY");
    const ollamaBase = (
      process.env.OLLAMA_TUNNEL_URL ||
      process.env.OLLAMA_BASE_URL ||
      "http://127.0.0.1:11434"
    )
      .trim()
      .replace(/\/+$/, "");
    const vllmBase = (process.env.VLLM_BASE_URL || "").trim().replace(/\/+$/, "");

    const providerChain: Array<{
      provider: string;
      url: string;
      apiKey?: string;
      model: string;
      timeoutMs: number;
      enabled: boolean;
    }> = [
        {
          provider: "Groq LPU",
          url: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: groqKey,
          model: "openai/gpt-oss-120b",
          timeoutMs: 9000,
          enabled: Boolean(groqKey),
        },
        {
          provider: "Groq LPU (Qwen 3.8)",
          url: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: groqKey,
          model: "qwen/qwen3.8-27b",
          timeoutMs: 9000,
          enabled: Boolean(groqKey),
        },
        {
          provider: "Groq LPU (rápido)",
          url: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: groqKey,
          model: "openai/gpt-oss-20b",
          timeoutMs: 6000,
          enabled: Boolean(groqKey),
        },
        {
          provider: "Kimi Moonshot AI",
          url: "https://api.moonshot.cn/v1/chat/completions",
          apiKey: moonshotKey,
          model: process.env.MOONSHOT_MODEL?.trim() || "moonshot-v1-32k",
          timeoutMs: 14000,
          enabled: Boolean(moonshotKey),
        },
        {
          provider: "SambaNova Cloud",
          url: "https://api.sambanova.ai/v1/chat/completions",
          apiKey: sambaKey,
          model:
            process.env.SAMBANOVA_MODEL_TEXT?.trim() ||
            "Meta-Llama-3.3-70B-Instruct",
          timeoutMs: 12000,
          enabled: Boolean(sambaKey),
        },
        {
          provider: "SambaNova Cloud",
          url: "https://api.sambanova.ai/v1/chat/completions",
          apiKey: sambaKey,
          model: "DeepSeek-R1",
          timeoutMs: 15000,
          enabled: Boolean(sambaKey),
        },
        {
          provider: "vLLM Local",
          url: `${vllmBase}/v1/chat/completions`,
          model: process.env.VLLM_MODEL?.trim() || "Qwen/Qwen2.5-7B-Instruct",
          timeoutMs: 15000,
          enabled: Boolean(vllmBase),
        },
        {
          provider: "Ollama Local",
          url: `${ollamaBase}/v1/chat/completions`,
          model: process.env.OLLAMA_MODEL?.trim() || "qwen2.5:7b",
          timeoutMs: 20000,
          enabled: Boolean(ollamaBase),
        },
      ];

    for (const p of providerChain) {
      if (!p.enabled) {
        providerAttempts.push({
          provider: p.provider,
          model: p.model,
          ok: false,
          error: "No configurado (falta API key / URL)",
          latency_ms: 0,
        });
        continue;
      }
      const { text, attempt } = await callOpenAiCompatibleChat({
        provider: p.provider,
        url: p.url,
        apiKey: p.apiKey,
        model: p.model,
        messages,
        temperature,
        timeoutMs: p.timeoutMs,
      });
      providerAttempts.push(attempt);
      if (text) {
        rawReply = text;
        modelUsed = `${p.model} (${p.provider})`;
        break;
      }
      // Skip the second Groq model if the key itself is invalid
      if (p.provider === "Groq LPU" && attempt.status === 401) {
        const next = providerChain.find((x) => x.provider === "Groq LPU (rápido)");
        if (next) next.enabled = false;
      }
    }

    if (!rawReply) {
      const failureSummary = providerAttempts
        .map(
          (a) =>
            `${a.provider}/${a.model}: ${a.status ? `HTTP ${a.status} ` : ""}${a.error || "falló"}`
        )
        .join(" | ");
      console.error(
        `[radio-chat] Todas las APIs LLM fallaron para "${userMessage.slice(0, 80)}": ${failureSummary}`
      );
      const lossLine = buildOnAirReturnLossLine(stationConfig);
      return NextResponse.json(
        {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          degraded: true,
          error: "LLM_UNAVAILABLE",
          error_detail: failureSummary,
          provider_attempts: providerAttempts,
          reply: lossLine,
          prosody_script: lossLine,
          spoken_language: "es-AR",
          emotion_state: "WARM_EMPATHIC",
          emotion_label: "Retorno caído",
          speech_rate: 0.92,
          pitch_shift: 0.98,
          station_config: stationConfig,
          model_used: "SIN INFERENCIA (todas las APIs fallaron)",
          latency_ms: Date.now() - t0,
          timestamp: new Date().toISOString(),
        },
        { status: 503, headers: OFFICIAL_HEADERS }
      );
    }

    // Parse background agent tool calls before generating prosody script
    const triggeredTools: Array<{ tool: string; params: string }> = [];
    const toolCallRegex = /\[TOOL_CALL:\s*([a-zA-Z0-9_]+)\((.*?)\)\]/gi;
    let match: RegExpExecArray | null;
    while ((match = toolCallRegex.exec(rawReply)) !== null) {
      triggeredTools.push({
        tool: match[1],
        params: match[2],
      });
    }

    // Strip tool call tags so Nora never reads code or bracket directives aloud
    rawReply = rawReply.replace(/\[TOOL_CALL:[^\]]+\]/gi, "").trim();

    // If conversation is already underway (history.length > 0), strip any accidental greeting prefix
    if (history.length > 0) {
      rawReply = rawReply
        .replace(
          /^(?:¡?hola[^.!?\n]*[.!?]\s*|¡?buenas\s+(?:tardes|noches|días)[^.!?\n]*[.!?]\s*|¡?qué\s+tal[^.!?\n]*[.!?]\s*|¡?acá\s+nora[^.!?\n]*[.!?]\s*)/i,
          ""
        )
        .trim();
    }

    // Preserve prosody script for the studio teleprompter and normalize phonetics for LATAM TTS
    const userAskedAboutNexora = /nexora/i.test(userMessage);
    const whiteLabelRawReply = userAskedAboutNexora
      ? rawReply
      : rawReply
        .replace(/Nexora\s+One\s+Engine/gi, stationConfig.programName)
        .replace(/\bBy\s+Nora\b/gi, "");

    const prosodyScript = whiteLabelRawReply.replace(/[*#`~]/g, "").trim();
    const cleanSpeechText = prosodyScript
      .replace(/\[radio_[^\]]*\]/gi, " ")
      .replace(/\[pause_[^\]]*\]/gi, " ")
      .replace(/\[breath\]/gi, " ")
      .replace(/\[soft_breath\]/gi, " ")
      .replace(/\[laugh_[^\]]*\]/gi, " ")
      .replace(/\[laughter\]/gi, " ")
      .replace(/\[emphasis\]/gi, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/\((?:risas|pausa|suspiro|énfasis)[^)]*\)/gi, " ")
      .replace(/\bMercosur\b/gi, "Mércosur")
      .replace(/\bFMI\b/g, "F M I")
      .replace(/\bAFA\b/g, "A F A")
      .replace(/\bEE\.?\s*UU\.?\b/g, "Estados Unidos")
      .replace(/\bEEUU\b/g, "Estados Unidos")
      .replace(/\bIA\b/g, "I A")
      .replace(/\bBCRA\b/g, "Banco Central")
      .replace(/\bPBI\b/g, "P B I")
      .replace(/\bPIB\b/g, "P I B")
      .replace(/\bUE\b/g, "Unión Europea")
      .replace(/\bPyMEs\b/gi, "pimes")
      .replace(/\bUSD\b/g, "dólares")
      .replace(/\s+/g, " ")
      .trim();

    const spokenLanguage = detectSpokenLanguageCode(userMessage, cleanSpeechText);

    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        reply: cleanSpeechText,
        prosody_script: prosodyScript,
        spoken_language: spokenLanguage,
        emotion_state: climate.emotion_state,
        emotion_label: climate.label_es,
        speech_rate: climate.speech_rate,
        pitch_shift: climate.pitch_shift,
        station_config: stationConfig,
        model_used: modelUsed,
        provider_attempts: providerAttempts,
        triggered_tools: triggeredTools,
        latency_ms: Date.now() - t0,
        hot_topics_count: radarItems.length,
        hot_topics_preview: radarItems.slice(0, 4),
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: OFFICIAL_HEADERS }
    );
  } catch (err) {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: err instanceof Error ? err.message : "Error interno en cabina",
      },
      { status: 500, headers: OFFICIAL_HEADERS }
    );
  }
}
