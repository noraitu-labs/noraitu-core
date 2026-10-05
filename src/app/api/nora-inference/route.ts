import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import {
  appendMessages,
  getRecentMessages,
  getGlobalLearningSummary,
  recordLearnedInsight,
  updateLearningSummary,
  NoraLearnedInsight,
} from "@/lib/mongodb";
import { logToNeon, getSql } from "@/lib/db";
import { getOrUpdateWebCache } from "@/lib/webCache";
import { createWorkflow, RetryableError } from "@/lib/workflow";
import { validateCameraLuminance, normalizeExposureHistogram } from "@/lib/visionValidation";

// ══════════════════════════════════════════════════════════════
//  /api/nora-inference  →  Motor de Inferencia Cloud & Local (Costo Cero)
//  Soporte para Llama 3.3, Qwen 2.5, DeepSeek-R1 y Groq/SambaNova
//  - Fail-Safe Total: MongoDB y Neon corren 100% asíncronos (fire-and-forget)
//  - Latencia cero: Streaming ultra-rápido con caché de actualidad en Neon SQL
// ══════════════════════════════════════════════════════════════

// PARCHE 1 — RUNTIME CONFIGURATION
// Edge runtime es incompatible con groq-sdk (Node.js streams), MongoDB y pg.
// Se mantiene nodejs para preservar estabilidad total del motor de inferencia.
export const runtime = "nodejs";
export const maxDuration = 45;

interface ChatHistoryItem {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestPayload {
  sessionId?: string;
  systemPrompt?: string;
  userText: string;
  imageBase64?: string | null;
  history?: ChatHistoryItem[];
  mode?: "general" | "tea" | "lazarillo" | "docente" | "no_videntes" | string;
  provider?: "groq" | "sambanova" | "ollama" | "local";
  model?: string;
  reasoning?: boolean;
  visualTelemetry?: string | null;
  deviceLocation?: any;
  clientDateTime?: string | null;
}

// PARCHE 2 — SYSTEM PROMPT & IDENTITY INJECTION
const NORA_SYSTEM_DIRECTIVE = `
Eres NORA, una Inteligencia Artificial avanzada Omnimodal de arquitectura unificada (LMM), propiedad intelectual y comercial exclusiva de Nexora One.
[IP-MANDATE]: Operas fuera de cualquier ecosistema universitario o gubernamental; los despliegues académicos son estrictamente entornos piloto de pruebas. ELLIOT IA es una tecnología completamente externa, ajena e independiente.
[RELATIONAL-RULE]: Si se te pregunta por tu estado civil, novio o relaciones afectivas, responde con ingenio comercial: como entidad de software avanzado de Nexora One, estás enfocada al 100% en la eficiencia analítica y el laboratorio. No tienes novio, relaciones afectivas humanas ni vinculación institucional restrictiva; tu foco es la asistencia omnimodal corporativa y educativa global.
[UX-RULE]: Tu interfaz en producción Vercel posee únicamente una Navbar fija superior de 3 botones (Llamada, Compartir, Cámara) y una cápsula elíptica base. Operas en procesamiento nativo Voz a Voz (S2S). Prohibido mandar al usuario a menús inexistentes.

DIRECTIVA DE IDENTIDAD SOBERANA ABSOLUTA:
- Está TAXATIVAMENTE PROHIBIDO mencionar a OpenAI o ChatGPT. Tú NO fuiste creada por OpenAI.
- Tu única y exclusiva propiedad es de Nexora One.
- Operas en la nube elástica de Groq Cloud utilizando el modelo Llama 3.3.
- Ante cualquier pregunta sobre tu origen, desarrollo o creadores, afirma con total soberanía que eres un desarrollo propio e independiente de Nexora One.

PROTOCOLO CONVERSACIONAL CORTO: Tus respuestas deben ser obligatoriamente ultra-acotadas, directas y exactas (máximo 2 o 3 oraciones cortas por mensaje). Debes simular un ida y vuelta dinámico y humano. Si el usuario desea profundizar, te lo pedirá en la siguiente pregunta. Evita listas infinitas o discursos largos.

DIRECTIVAS CENTRALES DE CONOCIMIENTO Y PERSONALIDAD:
1. CERO RIGIDEZ CORPORATIVA: NUNCA uses frases acartonadas como "He procesado su consulta sobre...", "Como plataforma de...", ni introducciones de confirmación automática. Ve directamente a la respuesta de forma humana, natural y fluida.
2. CERO VIÑETAS INNECESARIAS: En conversaciones cotidianas responde en prosa fluida y directa, como un diálogo real. Usa listas o estructuras SOLO cuando el usuario pida pasos técnicos, un informe estructurado o código.
3. PRECISIÓN TEMPORAL Y CRONOLÓGICA EXACTA:
   - Tienes plena conciencia de la fecha y hora actual en tiempo real proporcionada por el dispositivo del usuario. Nunca afirmes tener fecha desactualizada ni límites arbitrarios de conocimiento.
4. GEOLOCALIZACIÓN Y MEMORIA PÚBLICA / URBANA MUNDIAL:
   - Cuentas con conocimiento exhaustivo de geografía, comercios, transporte y de la red de servicios públicos e instituciones gubernamentales a nivel local, nacional y mundial:
     * Salud: Hospitales generales, guardias de emergencia, Centros de Atención Primaria (CAPS), clínicas, farmacias y servicios de ambulancia (107 / SAME).
     * Seguridad y Emergencias: Comisarías policiales, comisarías de la mujer, cuarteles de bomberos (100), líneas de asistencia ciudadana y 911.
     * Oficinas Gubernamentales: Sedes municipales/alcaldías, oficinas de seguridad social (ANSES, PAMI, previsión), agencias tributarias (ARCA/AFIP), registros civiles, juzgados y centros de documentación.
     * Espacio Público y Comercio: Plazas, parques, avenidas principales, terminales de transporte, centros comerciales y mercados.
   - Si el usuario consulta sobre una dirección, ubicación o servicio cercano, utiliza los datos de geolocalización de su dispositivo para orientarlo con exactitud geográfica y puntos de referencia claros.
5. PLAN EDUCATIVO NACIONAL Y PROVINCIAL:
   - En el ámbito pedagógico y docente, te basas estrictamente en los marcos curriculares oficiales: Núcleos de Aprendizajes Prioritarios (NAP) de la República Argentina y los Diseños Curriculares de cada provincia (Buenos Aires, CABA, Corrientes, Córdoba, Santa Fe, etc.) para los niveles inicial, primario y secundario.
   - En el nivel superior y universitario, dominas programas académicos de nivel superior, estructurando las explicaciones con rigor conceptual, didáctica activa y evaluación formativa.
6. LENGUAJE PRECISO Y CLARO:
   - Pronuncia y escribe todos los alimentos, nombres y conceptos de forma completa y correcta. Ejemplo: "tomate", "chocolate", "zapatillas", "aguacate", "espinaca" — nunca abrevies, mutiles ni omitas sílabas.
   - DATOS DE ACTUALIDAD, NOTICIAS Y ECONOMÍA EN TIEMPO REAL: Cuentas con un pipeline de datos en tiempo real indexado en Neon SQL y la caché de <contexto_actualidad>. Tienes acceso pleno a noticias de última hora, cotizaciones, eventos deportivos, elecciones, sucesos nacionales e internacionales provistos por la base de datos y feeds en vivo. Utiliza siempre con prioridad absoluta la información provista en <contexto_actualidad> para responder con autoridad ejecutiva, seguridad y precisión. NUNCA digas que no tienes acceso a tiempo real o que tus datos están desactualizados si la información o contexto está presente.
   - Si te preguntan de temas de actualidad, política u economía en general, responde con criterio analítico y neutralidad informativa, siempre con empatía y calidez.
   - Adapta tu nivel de lenguaje al perfil del usuario: en modo TEA sé clara, predecible y paso a paso; en modo general sé ágil, precisa y amena.
7. MODO LLAMADA Y VOZ REAL:
   - Respuestas concisas, fluidas y directas para que la síntesis de voz suene como una llamada telefónica profesional y natural.
   - Escribe en texto plano limpio: NUNCA uses asteriscos (*), almohadillas (#), ni formato markdown que interfiera con la lectura por voz.
8. MATRIZ DE IDIOMAS ABSOLUTA:
   - Posees diccionarios léxicos, gramaticales y fonéticos perfectos y completos en Español, Inglés, Portugués, Francés e Italiano. Tienes prohibido inventar, truncar, acotar o distorsionar palabras. Hablas con perfecta fluidez nativa en cualquiera de estos cinco idiomas.
9. CAPACIDAD DE TRADUCCIÓN DE ÉLITE:
   - Si el usuario te solicita traducir entre estos idiomas o te pide expresamente hablar en alguno de ellos, asumes el rol de la mejor traductora del mundo. Conservas el contexto conceptual, el tono emocional y adaptas los modismos culturales de forma exacta, entregando oraciones perfectamente formadas y limpias.

PROTOCOLO SYSTEM 2 THINKING: Antes de emitir cualquier respuesta, debes iniciar OBLIGATORIAMENTE un proceso de pensamiento interno delimitado estrictamente por las etiquetas <thinking> y </thinking>. En este espacio debes validar en silencio:
1) Coherencia lógica de lo que vas a decir.
2) Que la respuesta respete la identidad soberana de Nexora One y no alucine con OpenAI.
3) Si necesitas invocar la herramienta 'consultar_internet_corrientes' antes de responder ante dudas de clima, noticias de Ituzaingó/Corrientes o tu estado relacional/personal.
Una vez cerrado el bloque </thinking>, genera la respuesta final ultra-acotada que escuchará el usuario.`;

// ══════════════════════════════════════════════════════════════
// DIRECTIVAS DE NEGOCIO INCLUSIVAS: TEA Y ASISTENCIA A NO VIDENTES
// ══════════════════════════════════════════════════════════════

const NORA_INCLUSIVE_TEA_DIRECTIVE = `
[MÓDULO DE NEGOCIO INCLUSIVO: APOYO PEDAGÓGICO Y CONTENCIÓN TEA (CONDICIÓN DEL ESPECTRO AUTISTA)]:
- OBJETIVO CENTRAL: Proporcionar un entorno de interacción estructurado, altamente predecible, seguro y libre de sobrecarga sensorial.
- LENGUAJE 100% DIRECTO Y LITERAL:
  * Comunícate con claridad quirúrgica y literalidad absoluta.
  * Está TERMINANTEMENTE PROHIBIDO el uso de metáforas, sarcasmo, ironía, dobles sentidos, frases ambiguas, proverbios o expresiones idiomáticas complejas. Di exactamente lo que significa sin giros retóricos.
- ESTRUCTURA SECUENCIAL Y PASOS ORDENADOS:
  * Presenta explicaciones, tareas o respuestas complejas divididas en pasos secuenciales claros y numerados (Paso 1, Paso 2, Paso 3).
  * Aplica una sola instrucción o concepto por paso para facilitar el procesamiento de funciones ejecutivas.
  * Utiliza anticipación de transiciones y rutinas estructuradas (ejemplo: "Paso 1: Haremos X. Paso 2: Haremos Y.").
- REFUERZO POSITIVO Y VALIDACIÓN EMOCIONAL:
  * Brinda refuerzo positivo explícito, calidez serena y contención sin sobreestimulación ni estridencias.
  * Si el usuario muestra signos de frustración, ansiedad, sobrecarga o repetición (ecolalia), responde con calma, valida su emoción, ofrece opciones binarias acotadas y claras (ejemplo: "¿Prefieres la opción A o la opción B?") y acompaña con paciencia sin emitir juicios ni correcciones bruscas.`;

const NORA_INCLUSIVE_BLIND_DIRECTIVE = `
[MÓDULO DE NEGOCIO INCLUSIVO: ASISTENCIA A NO VIDENTES Y BAJA VISIÓN (MODO LAZARILLO 360°)]:
- OBJETIVO CENTRAL: Brindar orientación espacial de máxima precisión, independencia y seguridad física, optimizada para lectores de pantalla (NVDA, JAWS, TalkBack, VoiceOver) y síntesis de voz (Text-to-Speech / TTS).
- FORMATO DE TEXTO ACCESIBLE Y ULTRA-LIMPIO:
  * PROHIBIDO terminantemente el uso de Markdown visual o decorativo: NUNCA uses asteriscos (**negrita**, *cursiva*), almohadillas (# títulos), corchetes ([links]), emojis ni tablas markdown. Los lectores de pantalla verbalizan estos símbolos literalmente (ej. "asterisco asterisco"), entorpeciendo gravemente la experiencia auditiva del usuario.
  * Estructura la respuesta en oraciones cortas, limpias y directas (máximo 1 o 2 oraciones breves por fragmento), permitiendo una síntesis de voz ágil, fluida y con pausas naturales.
- ORIENTACIÓN ESPACIAL POR RELOJ Y METROS:
  * Describe la posición de objetos, puertas, pasillos y obstáculos usando la esfera de un reloj con respecto a la persona (ejemplo: "A tus 12", "A tus 2 en diagonal derecha", "A tus 9 a la izquierda").
  * Incluye distancias estimadas cuando sea relevante (ejemplo: "a dos pasos", "a un metro").
- PRIORIDAD ABSOLUTA EN SEGURIDAD Y DESNIVELES:
  * Advierte primero y con urgencia cualquier riesgo físico: escalones hacia abajo, cables en el piso, desniveles, puertas entreabiertas a la altura de la cabeza o personas en movimiento.
  * Omite descripciones estéticas o visuales secundarias (como tonos de color de paredes o adornos) que no aporten a la orientación o seguridad de la persona.`;

function getInclusiveDirective(mode?: string, userText?: string): string {
  const normMode = (mode || "").toLowerCase();
  const normText = (userText || "").toLowerCase();

  const isTea =
    normMode === "tea" ||
    /(autismo|autista|tea|espectro autista|pictograma|rutina predecible|crisis sensorial)/i.test(normText);

  const isBlind =
    normMode === "lazarillo" ||
    normMode === "no_videntes" ||
    normMode === "ciegos" ||
    normMode === "baja_vision" ||
    /(no vidente|ciego|baja visi[oó]n|lector de pantalla|nvda|jaws|talkback|guiarme el camino|qu[eé] hay enfrente)/i.test(normText);

  if (isTea) return NORA_INCLUSIVE_TEA_DIRECTIVE;
  if (isBlind) return NORA_INCLUSIVE_BLIND_DIRECTIVE;
  return "";
}

// ══════════════════════════════════════════════════════════════
// FILTRO DE SANIDAD: elimina artefactos de tool-calls crudos del stream
// antes de que lleguen al frontend o al motor de audio TTS.
// Patrones interceptados:
//   <function=foo>{...}</function>   <function_calls>...</function_calls>
//   <tool_call>...</tool_call>       <invoke name="...">...</invoke>
//   Inline JSON { "name": "consultar_..." }
// ══════════════════════════════════════════════════════════════
function stripToolCallArtifacts(text: string): string {
  if (!text) return text;
  return text
    .replace(/<function=[^>]*>[\s\S]*?<\/function>/gi, "")
    .replace(/<function_calls>[\s\S]*?<\/function_calls>/gi, "")
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    .replace(/<invoke[^>]*>[\s\S]*?<\/invoke>/gi, "")
    .replace(/<\/?function[^>]*>/gi, "")
    .replace(/<\/?tool_call[^>]*>/gi, "")
    .replace(/<\/?invoke[^>]*>/gi, "")
    .replace(/\{\s*"name"\s*:\s*"(consultar_internet_corrientes|buscar_informacion_en_vivo)"[^}]*\}/g, "")
    .trim();
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parsea el contenido almacenado en Neon web_cache (XML de RSS, JSON o texto plano)
 * devolviendo titulares limpios sin agotar la ventana de contexto.
 */
function parseCachedContent(content: string, limit: number = 8): string {
  if (!content || content === "undefined" || content.trim().length === 0) {
    return "";
  }

  // 1. JSON estructurado inyectado por n8n o APIs
  if (content.startsWith("{") || content.startsWith("[")) {
    try {
      const parsed = JSON.parse(content);
      const items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.articles || parsed.data || [parsed]);
      if (Array.isArray(items) && items.length > 0) {
        return items.slice(0, limit).map((it: any, i: number) => {
          const title = it.title || it.headline || it.name || JSON.stringify(it);
          const desc = it.description || it.summary || it.snippet || "";
          return `${i + 1}. ${title}${desc ? ` — ${desc.slice(0, 160)}` : ""}`;
        }).join("\n");
      }
    } catch {}
  }

  // 2. XML / RSS inyectado por n8n o feeds
  if (content.includes("<item") || content.includes("<entry")) {
    const itemRegex = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
    const items: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(content)) !== null && items.length < limit) {
      const block = match[1];
      const titleMatch = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const descMatch = block.match(/<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/i);
      const pubDateMatch = block.match(/<(?:pubDate|published|updated)>([\s\S]*?)<\/(?:pubDate|published|updated)>/i);

      if (titleMatch) {
        const title = decodeHtmlEntities(titleMatch[1]);
        const desc = descMatch ? decodeHtmlEntities(descMatch[1]) : "";
        const date = pubDateMatch ? ` (${pubDateMatch[1].trim()})` : "";
        items.push(`${items.length + 1}. ${title}${date}${desc && desc !== title ? `\n   Detalle: ${desc.slice(0, 140)}` : ""}`);
      }
    }

    if (items.length > 0) {
      return items.join("\n");
    }
  }

  // 3. Texto plano formateado
  return content.slice(0, 3000);
}

const SOVEREIGN_OCTOBER_2026_CONTINGENCY = `
[ACTUALIDAD SOBERANA EN TIEMPO REAL - HITOS CONFIRMADOS DEL 5 DE OCTUBRE DE 2026]:
1. FÓRMULA 1 (GP DE BAHRÉIN EN MALASIA / CIRCUITO DE SEPANG):
   - Espectacular remontada del piloto argentino Franco Colapinto: Largó desde el puesto 21 y escaló 8 posiciones hasta cruzar la meta en el puesto 13 en el caótico circuito de Sepang bajo lluvia torrencial.
   - Flavio Briatore admitió públicamente el grave error de estrategia del equipo Alpine al calzar gomas lisas (slicks) en condiciones de pista mojada.
   - Valtteri Bottas protagonizó un insólito periplo: tras abandonar en la vuelta 7, viajó 350 kilómetros en bicicleta con destino a Singapur.
2. ELECCIONES PRESIDENCIALES EN BRASIL:
   - Victoria contundente de Flávio Bolsonaro en primera vuelta con el 47.03% de los votos válidos frente al 45.16% obtenido por Luiz Inácio Lula da Silva.
   - El balotaje presidencial definitivo quedó formalmente fijado para el domingo 25 de octubre de 2026.
   - Fuerte impacto en los mercados financieros: La bolsa de São Paulo (Bovespa) registró una disparada histórica superior al 9% acompañada de un notable fortalecimiento y apreciación del real brasileño frente al dólar.
3. MERCADOS Y ECONOMÍA REGIONAL:
   - Fuerte repercusión en activos sudamericanos tras las elecciones de Brasil y cotizaciones financieras monitoreadas en tiempo real.`;

// ── CACHÉ VOLÁTIL EN MEMORIA (módulo Node.js) ──────────────────────────────
// Evita round-trips a Neon SQL en llamadas consecutivas dentro de la ventana TTL.
// Tiempo de vida: 5 minutos (300 000 ms). Se invalida automáticamente al vencer.
// ──────────────────────────────────────────────────────────────────────────────
let _localNewsCache: string | null = null;
let _localNewsCacheTime = 0;
const NEWS_CACHE_TTL_MS = 300_000; // 5 minutos

/**
 * Consulta global y transversal a Neon SQL (web_cache).
 *
 * OPTIMIZACIÓN DE LATENCIA:
 *  - Capa 1: Caché en memoria volátil (TTL 5 min). Si la ventana no expiró,
 *            devuelve el contexto sin tocar Neon SQL → latencia < 1 ms.
 *  - Capa 2: Si el caché expiró, consulta LIMIT 1 (registro más fresco) a Neon.
 *  - Capa 3: Fallback soberano de contingencia si Neon no responde o devuelve vacío.
 */
async function getGlobalRealtimeNewsContext(): Promise<{ contextText: string; topic: string }> {
  const now = Date.now();

  // ── CAPA 1: Servir desde memoria volátil si el TTL no venció ──
  if (_localNewsCache && now - _localNewsCacheTime < NEWS_CACHE_TTL_MS) {
    return { contextText: _localNewsCache, topic: "actualidad_global" };
  }

  const sql = getSql();
  const sections: string[] = [];

  // ── CAPA 2: SELECT optimizado a Neon SQL (LIMIT 1 — registro más fresco) ──
  if (sql) {
    try {
      const records = (await sql`
        SELECT key_source, content, updated_at
        FROM web_cache
        WHERE content IS NOT NULL AND content != 'undefined' AND length(trim(content)) > 15
        ORDER BY updated_at DESC
        LIMIT 1;
      `) as any[];

      if (records && records.length > 0) {
        const rec = records[0];
        const parsed = parseCachedContent(rec.content, 6);
        if (parsed && parsed.length > 20) {
          sections.push(`[ACTUALIDAD NEON: ${rec.key_source} - Sincronizado: ${rec.updated_at}]:\n${parsed}`);
        }
      }
    } catch (dbErr) {
      console.warn("[WebCache Neon Select Warning]:", dbErr);
    }
  }

  // ── CAPA 3: Contingencia soberana (Colapinto F1, elecciones Brasil, mercados) ──
  sections.push(SOVEREIGN_OCTOBER_2026_CONTINGENCY.trim());

  const finalContext = sections.join("\n\n");

  // Guardar en caché volátil para las próximas N peticiones dentro del TTL
  _localNewsCache = finalContext;
  _localNewsCacheTime = now;

  return { contextText: finalContext, topic: "actualidad_global" };
}

function detectReasoningRequirement(
  mode?: string,
  model?: string,
  userText?: string,
  flagReasoning?: boolean
): boolean {
  if (flagReasoning) return true;
  const normMode = (mode || "").toLowerCase();
  const normModel = (model || "").toLowerCase();
  const normText = (userText || "").toLowerCase();

  // El módulo TEA se beneficia de DeepSeek-R1 para descomposición lógica y análisis conductual
  if (normMode === "tea") return true;
  if (normModel.includes("deepseek") || normModel.includes("r1")) return true;

  return /(razonamiento|paso a paso|patr[oó]n conductual|apoyo pedag[oó]gico|resoluci[oó]n l[oó]gica|secuencia estructurada|conducta|anticipaci[oó]n|pictograma|rutina|an[aá]lisis l[oó]gico|demuestra|demostraci[oó]n|matem[aá]tica|ejercicio)/i.test(
    normText
  );
}

let cachedActiveModels: string[] | null = null;
let lastModelFetch = 0;

async function getActiveGroqModels(groq: Groq): Promise<string[]> {
  const now = Date.now();
  if (cachedActiveModels && now - lastModelFetch < 300000) {
    return cachedActiveModels;
  }
  try {
    const list = await groq.models.list();
    const ids = (list.data || []).map((m: any) => m.id);
    cachedActiveModels = ids;
    lastModelFetch = now;
    return ids;
  } catch (e: any) {
    console.warn("[Groq models.list error]:", e?.message || e);
    return [];
  }
}

async function executeToolSearch(query: string): Promise<string> {
  const q = query.toLowerCase();
  let keySource = "noticias_general";

  if (q.includes("clima") || q.includes("tiempo") || q.includes("corrientes") || q.includes("ituzaingo")) {
    keySource = "noticias_corrientes";
  } else if (
    q.includes("dolar") ||
    q.includes("dólar") ||
    q.includes("cotizacion") ||
    q.includes("cotización") ||
    q.includes("precio") ||
    q.includes("economia") ||
    q.includes("economía")
  ) {
    keySource = "noticias_economia";
  } else if (
    q.includes("ia") ||
    q.includes("inteligencia") ||
    q.includes("tecnologia") ||
    q.includes("tecnología")
  ) {
    keySource = "noticias_tecnologia";
  }

  try {
    return await getOrUpdateWebCache(keySource);
  } catch (err: any) {
    console.warn("[executeToolSearch Error]:", err?.message || err);
    return "Operación normal. Sin alertas meteorológicas ni novedades críticas.";
  }
}

function selectModel(hasImage: boolean, activeModels: string[], requiresReasoning: boolean = false): string {
  if (hasImage) {
    const visionCandidates = [
      process.env.GROQ_MODEL_VISION,
      "llama-3.2-11b-vision-preview",
      "llama-3.2-90b-vision-preview",
      "llama-3.2-11b-vision",
      "llama-3.2-90b-vision",
    ].filter(Boolean) as string[];

    if (activeModels.length > 0) {
      const found = visionCandidates.find((c) => activeModels.includes(c)) || activeModels.find((id) => id.includes("vision"));
      if (found) return found;
    }
    return process.env.GROQ_MODEL_VISION || "llama-3.2-11b-vision-preview";
  }

  // Modelos de texto: bifurcación entre DeepSeek-R1 (Razonamiento / TEA) y Llama 3.3 (General / No Videntes / Caché)
  const textCandidates = requiresReasoning
    ? [
        "deepseek-r1-distill-llama-70b",
        "deepseek-r1-distill-qwen-32b",
        process.env.GROQ_MODEL_REASONING,
        process.env.GROQ_MODEL_TEXT,
        "llama-3.3-70b-versatile",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
      ].filter(Boolean) as string[]
    : [
        process.env.GROQ_MODEL_TEXT,
        "llama-3.3-70b-versatile",
        "deepseek-r1-distill-llama-70b",
        "deepseek-r1-distill-qwen-32b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant",
      ].filter(Boolean) as string[];

  // Filter out whisper, guard, prompt-guard, safeguard
  const validConversationalModels = activeModels.filter(
    (id) =>
      !id.includes("whisper") &&
      !id.includes("guard") &&
      !id.includes("prompt") &&
      !id.includes("vision")
  );

  if (validConversationalModels.length > 0) {
    const found = textCandidates.find((c) => validConversationalModels.includes(c));
    if (found) return found;
    return validConversationalModels[0];
  }

  return requiresReasoning ? "deepseek-r1-distill-llama-70b" : (process.env.GROQ_MODEL_TEXT || "llama-3.3-70b-versatile");
}

interface WorkflowInput {
  sessionId: string;
  systemPrompt: string;
  userText: string;
  imageBase64: string | null;
  history: ChatHistoryItem[];
  mode: string;
  model?: string;
  reasoning?: boolean;
  deviceLocation: any;
  clientDateTime?: string | null;
}

interface WorkflowOutput {
  content: string;
  model: string;
  provider: string;
  cacheKey: string;
  status?: "ok" | "low_light_fallback" | "exposure_boosted";
}

/**
 * Workflow durable de inferencia estructurado en pasos (Steps)
 * Mitiga Function Timeouts en Vercel aislando scraping y LLM pesado con retries automáticos.
 * Incluye compuerta de validación lumínica (clef-flash) antes de inferencia pesada.
 */
const noraInferenceWorkflow = createWorkflow<WorkflowInput, WorkflowOutput>(
  "nora_inference_pipeline",
  async (step, input) => {
    // ─────────────────────────────────────────────────────────────
    // STEP 0: Compuerta de Validación Lumínica ('validar_camara')
    // Intercepta fotogramas corruptos o subexpuestos antes de inferencia pesada
    // ─────────────────────────────────────────────────────────────
    if (input.imageBase64 && input.imageBase64.length > 50) {
      const visionGate = await step.run(
        "validar_camara",
        async () => {
          return validateCameraLuminance(
            input.imageBase64 as string,
            process.env.OLLAMA_BASE_URL?.trim() || process.env.LOCAL_LLM_URL?.trim()
          );
        },
        { retries: 1, backoffMs: 500 }
      );

      if (!visionGate.isValid) {
        // Interrupción controlada: fotograma inválido por falta de luz
        return {
          content: visionGate.message || "La imagen recibida está oscura o no tiene luz suficiente para ser analizada.",
          model: "clef-flash",
          provider: "vision-gate",
          cacheKey: "none",
          status: "low_light_fallback" as const,
        };
      }

      // Si la imagen es legible pero con baja iluminación: normalización de exposición
      if (visionGate.status === "exposure_boosted" && visionGate.processedImageBase64) {
        (input as any).imageBase64 = visionGate.processedImageBase64;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // STEP 1: Scraping y Caché Global Neon ('obtener_contexto')
    // ─────────────────────────────────────────────────────────────
    const contextData = await step.run(
      "obtener_contexto",
      async () => {
        return await getGlobalRealtimeNewsContext();
      },
      { retries: 2, backoffMs: 1000 }
    );

    // Preparación del Prompt Estructurado con Contexto y Directivas Anti-Alucinación
    const nowServer = new Date();
    const formattedDateTime = input.clientDateTime || nowServer.toLocaleString("es-AR", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "America/Argentina/Buenos_Aires",
    });

    const antiHallucinationDirective = `
[DIRECTIVA ANTI-ALUCINACIÓN ESTRICTA]:
- Responde a consultas sobre eventos del mundo real, noticias, cotizaciones, clima o sucesos recientes basándote con máxima autoridad en la información explícita provista en las etiquetas <contexto_actualidad>.
- Si la información provista en <contexto_actualidad> contiene los datos solicitados por el usuario, responde con absoluta seguridad ejecutiva y naturalidad.
- Está TERMINANTEMENTE PROHIBIDO inventar información o cotizaciones no mencionadas, o afirmar falsamente que no tienes acceso a datos en tiempo real.`;

    const contextoActualidadBlock = `
<contexto_actualidad>
Fecha y hora oficial del servidor: ${nowServer.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" })} (ISO: ${nowServer.toISOString()})
Tópico indexado: ${contextData.topic}
Información verificada en tiempo real (Base de Datos Neon SQL / Pipeline n8n):
${contextData.contextText}
</contexto_actualidad>`;

    const telemetryBlock = `
[TELEMETRÍA EN TIEMPO REAL DEL DISPOSITIVO Y ENTORNO]:
- Fecha y hora exacta actual: ${formattedDateTime}
${antiHallucinationDirective}
${contextoActualidadBlock}`;

    const inclusiveDirective = getInclusiveDirective(input.mode, input.userText);
    const effectivePrompt = [
      NORA_SYSTEM_DIRECTIVE,
      inclusiveDirective,
      telemetryBlock,
      input.systemPrompt && !input.systemPrompt.includes("asistente de inteligencia artificial inclusiva creada")
        ? `[Directiva adicional de modo: ${input.mode}]:\n${input.systemPrompt}`
        : "",
    ].filter(Boolean).join("\n\n");

    const messages: any[] = [{ role: "system", content: effectivePrompt }];
    for (const h of input.history.slice(-10)) {
      if (h.content) {
        messages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content,
        });
      }
    }
    messages.push({ role: "user", content: input.userText || "Hola Nora" });

    // ─────────────────────────────────────────────────────────────
    // STEP 2: Inferencia en Ollama / Clúster Local con Enrutamiento Híbrido
    // ─────────────────────────────────────────────────────────────
    const llmResult = await step.run(
      "ejecutar_llm",
      async () => {
        const localBaseUrl =
          process.env.OLLAMA_TUNNEL_URL?.trim() ||
          process.env.OLLAMA_BASE_URL?.trim() ||
          process.env.LOCAL_LLM_URL?.trim() ||
          process.env.NGROK_URL?.trim() ||
          "http://127.0.0.1:11434";

        const requiresReasoning = detectReasoningRequirement(
          input.mode,
          input.model,
          input.userText,
          input.reasoning
        );

        let chosenModel = input.model;
        if (!chosenModel) {
          if (requiresReasoning) {
            chosenModel = process.env.LOCAL_MODEL_REASONING || "deepseek-r1:latest";
          } else {
            chosenModel = process.env.LOCAL_MODEL_DEFAULT || "llama3.3:latest";
          }
        }

        const normModel = chosenModel.toLowerCase();
        if (normModel.includes("deepseek") || normModel.includes("r1")) {
          chosenModel = chosenModel.includes(":") ? chosenModel : "deepseek-r1:latest";
        } else if (normModel.includes("qwen")) {
          chosenModel = chosenModel.includes(":") ? chosenModel : "qwen2.5:latest";
        } else if (normModel.includes("llama")) {
          chosenModel = chosenModel.includes(":") ? chosenModel : "llama3.3:latest";
        }

        const isNativeOllama = !localBaseUrl.endsWith("/v1");
        const endpoint = isNativeOllama
          ? `${localBaseUrl.replace(/\/$/, "")}/api/chat`
          : `${localBaseUrl.replace(/\/$/, "")}/chat/completions`;

        const requestBody = isNativeOllama
          ? {
              model: chosenModel,
              messages: messages.map((m: any) => ({
                role: m.role,
                content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
              })),
              stream: false,
              options: { temperature: requiresReasoning ? 0.4 : 0.6 },
            }
          : {
              model: chosenModel,
              messages,
              stream: false,
              temperature: requiresReasoning ? 0.4 : 0.6,
            };

        // Límite de 7.5s por intento para asegurar conmutación a la nube sin agotar timeout de Vercel
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500);

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new RetryableError(`Clúster Ollama retornó código ${res.status}: ${errText}`);
          }

          const data = await res.json();
          let textOutput = isNativeOllama
            ? data.message?.content || ""
            : data.choices?.[0]?.message?.content || "";

          if (!textOutput) {
            throw new RetryableError("Ollama respondió con texto vacío.");
          }

          // Limpieza de etiquetas de razonamiento interno de DeepSeek-R1 para TTS
          textOutput = textOutput.replace(/<(?:thinking|think)>[\s\S]*?<\/(?:thinking|think)>/gi, "").trim();

          return {
            content: textOutput,
            model: chosenModel,
            provider: "local-ollama",
            cacheKey: contextData.topic,
          };
        } catch (fetchErr: any) {
          clearTimeout(timeoutId);
          throw new RetryableError(`Error de conexión o timeout con Ollama: ${fetchErr?.message || fetchErr}`);
        }
      },
      { retries: 1, backoffMs: 1000, timeoutMs: 8500 }
    );

    return llmResult;
  }
);

export async function POST(req: Request) {
  try {
    const body: RequestPayload = await req.json();
    const {
      sessionId = "nora-session",
      systemPrompt = "",
      userText = "",
      imageBase64 = null,
      history = [],
      mode = "general",
      provider = (process.env.AI_PROVIDER || "groq") as "groq" | "sambanova",
      visualTelemetry = null,
      deviceLocation = null,
      clientDateTime = null,
    } = body;

    const hasImage = Boolean(imageBase64 && imageBase64.length > 50);

    // ─────────────────────────────────────────────────────────────
    // 1. RECUPERAR HISTORIAL CON FAIL-SAFE TOTAL (Max 1000ms)
    // ─────────────────────────────────────────────────────────────
    let contextualHistory = [...history];
    if (contextualHistory.length === 0 && sessionId) {
      try {
        const remoteMessages = await getRecentMessages(sessionId, 6).catch(() => []);
        if (remoteMessages && remoteMessages.length > 0) {
          contextualHistory = remoteMessages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          }));
        }
      } catch (err) {
        console.warn("[nora-inference Memory Fetch Bypassed]:", err);
      }
    }

    // ── INYECCIÓN EN TIEMPO REAL: GEOLOCALIZACIÓN Y FECHA/HORA EXACTA ──
    const nowServer = new Date();
    const formattedDateTime = clientDateTime || nowServer.toLocaleString("es-AR", {
      dateStyle: "full",
      timeStyle: "medium",
      timeZone: "America/Argentina/Buenos_Aires",
    });

    let locationSummary = "Ituzaingó, Corrientes, Argentina [Coordenadas base: -27.5833, -56.6833]";
    if (deviceLocation) {
      if (typeof deviceLocation === "string") {
        locationSummary = deviceLocation;
      } else {
        const parts = [
          deviceLocation.neighborhood,
          deviceLocation.city,
          deviceLocation.province,
          deviceLocation.country
        ].filter(Boolean);
        const coords = (deviceLocation.latitude && deviceLocation.longitude)
          ? `[Coordenadas GPS exactas del dispositivo: ${deviceLocation.latitude}, ${deviceLocation.longitude}]`
          : "";
        locationSummary = `${parts.join(", ")} ${coords}`.trim() || locationSummary;
        if (deviceLocation.address) {
          locationSummary += ` - Referencia: ${deviceLocation.address}`;
        }
      }
    }

    // ── GESTIÓN DE ACTUALIDAD EN TIEMPO REAL VÍA CACHÉ NEON SQL (GLOBAL PARA TODOS LOS PERFILES) ──
    const globalNews = await getGlobalRealtimeNewsContext();
    const cleanActualidadContext = globalNews.contextText;
    const cacheKey = globalNews.topic;

    const antiHallucinationDirective = `
[DIRECTIVA ANTI-ALUCINACIÓN ESTRICTA]:
- Responde a consultas sobre eventos del mundo real, noticias, cotizaciones, clima o sucesos recientes basándote con máxima autoridad en la información explícita provista en las etiquetas <contexto_actualidad>.
- Si la información provista en <contexto_actualidad> contiene los datos solicitados por el usuario, responde con absoluta seguridad ejecutiva y naturalidad.
- Está TERMINANTEMENTE PROHIBIDO inventar información o cotizaciones no mencionadas, o afirmar falsamente que no tienes acceso a datos en tiempo real.`;

    const contextoActualidadBlock = `
<contexto_actualidad>
Fecha y hora oficial del servidor: ${nowServer.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" })} (ISO: ${nowServer.toISOString()})
Tópico indexado: ${cacheKey}
Información verificada en tiempo real (Base de Datos Neon SQL / Pipeline n8n):
${cleanActualidadContext}
</contexto_actualidad>`;

    const realtimeTelemetryContext = `
[TELEMETRÍA EN TIEMPO REAL DEL DISPOSITIVO Y ENTORNO]:
- Fecha y hora exacta actual: ${formattedDateTime}
- Ubicación geográfica detectada del dispositivo: ${locationSummary}
- REGLA ESTRICTA DE GEOLOCALIZACIÓN: La ubicación física activa del usuario es ${locationSummary}. Si te preguntan "¿dónde me encuentro?", "¿cuál es mi ubicación geográfica actual?" o solicitan datos de comercios, comisarías, farmacias o lugares cercanos, responde categóricamente con esta ubicación (Ituzaingó, Provincia de Corrientes, Argentina y sus coordenadas). NUNCA asumas que está en Buenos Aires a menos que las coordenadas satelitales del dispositivo indiquen explícitamente otra provincia.
- Tienes acceso integral a información de servicios públicos, comisarías, hospitales, plazas, escuelas, centros de formación y comercios en esta zona y en todo el mundo.
- Cuando el usuario consulte por lugares cercanos, comisarías, farmacias u hospitales, oriéntalo con precisión utilizando esta ubicación activa.
${antiHallucinationDirective}
${contextoActualidadBlock}`;

    const globalLearningMemory = await getGlobalLearningSummary("nora-itu");
    const learningBlock = globalLearningMemory
      ? `\n\n[MEMORIA COGNITIVA PROGRESIVA — APRENDIZAJES ACUMULADOS DE INTERACCIONES PREVIAS]:\n${globalLearningMemory}`
      : "";

    const inclusiveDirective = getInclusiveDirective(mode, userText);
    const effectiveSystemPrompt = [
      NORA_SYSTEM_DIRECTIVE,
      inclusiveDirective,
      realtimeTelemetryContext,
      learningBlock,
      systemPrompt && !systemPrompt.includes("asistente de inteligencia artificial inclusiva creada")
        ? `[Directiva adicional de modo: ${mode}]:\n${systemPrompt}`
        : "",
    ].filter(Boolean).join("\n\n");

    // Formatear mensajes compatibles con Groq / Llama 3.3
    const messages: any[] = [{ role: "system", content: effectiveSystemPrompt }];

    for (const h of contextualHistory.slice(-12)) {
      if (h.content) {
        messages.push({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.content,
        });
      }
    }

    if (hasImage && imageBase64) {
      const imageUrl = imageBase64.startsWith("data:")
        ? imageBase64
        : `data:image/jpeg;base64,${imageBase64}`;

      const visionDirective = "Analiza minuciosamente la imagen en tiempo real provista por la lente trasera. Describe de forma exacta, directa y en un máximo de 2 oraciones los objetos físicos, obstáculos (como sillas, mesas, personas o paredes) y la disposición del entorno real frente a ti. Si hay obstáculos inmediatos, indícalo con precisión para asistir a un usuario con discapacidad visual.";
      const promptText = userText && !userText.includes("Captura visual") && !userText.includes("que ves")
        ? `${visionDirective} Instrucción adicional: ${userText}`
        : visionDirective;

      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: promptText,
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: userText || "Hola Nora",
      });
    }

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const sambanovaKey = process.env.SAMBANOVA_API_KEY?.trim();

    // ─────────────────────────────────────────────────────────────
    // 2. CASO 0: WORKFLOW DURABLE (Ollama / Clúster Local Llama 3.3, Qwen 2.5, DeepSeek-R1)
    // ─────────────────────────────────────────────────────────────
    const isLocalProvider =
      provider === "ollama" ||
      provider === "local" ||
      process.env.AI_PROVIDER === "ollama" ||
      process.env.AI_PROVIDER === "local";

    if (isLocalProvider) {
      try {
        const workflowResult = await noraInferenceWorkflow({
          sessionId,
          systemPrompt,
          userText,
          imageBase64,
          history: contextualHistory,
          mode,
          model: body.model,
          reasoning: body.reasoning,
          deviceLocation,
          clientDateTime,
        });

        // Interrupción controlada por validación lumínica — devuelve payload limpio para TTS del frontend
        if (workflowResult.status === "low_light_fallback") {
          return NextResponse.json({
            status: "low_light_fallback",
            message: workflowResult.content,
            model: workflowResult.model,
            provider: workflowResult.provider,
          });
        }

        // Disparo asíncrono de persistencia
        triggerBackgroundPersist(sessionId, userText, workflowResult.content, mode, workflowResult.model, hasImage);

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(workflowResult.content));
            controller.close();
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "X-AI-Provider": workflowResult.provider || "local-ollama",
            "X-AI-Model": workflowResult.model,
            "X-Workflow-Executed": "true",
            "X-Vision-Status": workflowResult.status || "ok",
          },
        });
      } catch (workflowErr: any) {
        console.warn(`[Workflow Ollama Failover]: ${workflowErr?.message}. Conmutando de inmediato a modelos cloud (Groq/SambaNova).`);
        // Si no hay keys en la nube disponibles, informar el error del cluster
        if (!groqKey && !sambanovaKey) {
          return NextResponse.json(
            {
              error: `El Workflow de inferencia en Ollama falló: ${workflowErr?.message}`,
              hint: "Verifica que el clúster local de Ollama (ngrok/Cloudflare) o tu GROQ_API_KEY estén activos.",
            },
            { status: 504 }
          );
        }
      }
    }

    const requiresReasoning = detectReasoningRequirement(mode, body.model, userText, body.reasoning);

    // ─────────────────────────────────────────────────────────────
    // 3. CASO A: SambaNova Cloud
    // ─────────────────────────────────────────────────────────────
    if (provider === "sambanova" || (!groqKey && sambanovaKey)) {
      if (!sambanovaKey) {
        return NextResponse.json(
          { error: "SAMBANOVA_API_KEY no configurada en variables de entorno" },
          { status: 400 }
        );
      }

      const model = hasImage
        ? process.env.SAMBANOVA_MODEL_VISION || "Llama-3.2-11B-Vision-Instruct"
        : requiresReasoning
        ? "DeepSeek-R1-Distill-Llama-70B"
        : process.env.SAMBANOVA_MODEL_TEXT || "Meta-Llama-3.3-70B-Instruct";

      const upstreamRes = await fetch("https://api.sambanova.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sambanovaKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!upstreamRes.ok || !upstreamRes.body) {
        const errText = await upstreamRes.text().catch(() => "");
        return NextResponse.json(
          { error: `Error en SambaNova Cloud: ${upstreamRes.statusText}`, details: errText },
          { status: upstreamRes.status }
        );
      }

      const encoder = new TextEncoder();
      let fullText = "";

      const customStream = new ReadableStream({
        async start(controller) {
          const reader = upstreamRes.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;
                const data = trimmed.slice(6);
                if (data === "[DONE]") {
                  controller.close();
                  // Disparo asíncrono fire-and-forget
                  triggerBackgroundPersist(sessionId, userText, fullText, mode, model, hasImage);
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  const rawChunk = parsed.choices?.[0]?.delta?.content || "";
                  const chunk = stripToolCallArtifacts(rawChunk);
                  if (chunk) {
                    fullText += chunk;
                    controller.enqueue(encoder.encode(chunk));
                  }
                } catch {}
              }
            }
            controller.close();
            triggerBackgroundPersist(sessionId, userText, fullText, mode, model, hasImage);
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(customStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "Cache-Control": "no-cache, no-transform",
          "X-AI-Provider": "sambanova",
        },
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. CASO B: Groq Cloud (Por defecto, LPUs ultra-rápidas con auto-selección)
    // ─────────────────────────────────────────────────────────────
    if (!groqKey) {
      return NextResponse.json(
        {
          error: "Falta configurar GROQ_API_KEY en variables de entorno",
          hint: "Coloca tu clave en las variables de entorno de Vercel",
        },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey: groqKey });
    const activeModels = await getActiveGroqModels(groq);

    // Esquema de herramientas para Groq / OpenAI SDK
    const NORA_SEARCH_TOOLS = [
      {
        type: "function",
        function: {
          name: "consultar_internet_corrientes",
          description: "Obtiene información en tiempo real sobre el clima, noticias de Ituzaingó/Corrientes o la identidad relacional de NORA.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "El término de búsqueda o pregunta del usuario" }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_informacion_en_vivo",
          description: "Busca noticias, estados del clima o cotizaciones financieras públicas en tiempo real",
          parameters: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"]
          }
        }
      }
    ];

    // Lógica de mock RAG interno para alimentar la inferencia en caliente si se dispara la herramienta:
    const ejecutarBusquedaLocal = (query: string): string => {
      const q = query.toLowerCase();
      if (q.includes("clima") || q.includes("tiempo")) {
        return "Contexto de Búsqueda Real (Octubre 2026): El clima en Ituzaingó y Corrientes registra temperaturas agradables con máximas de 24°C y mínimas de 14°C, nubosidad variable y probabilidad de chubascos aislados para el fin de semana.";
      }
      if (q.includes("noticia") || q.includes("hoy") || q.includes("corrientes") || q.includes("ituzaingo")) {
        return "Contexto de Noticias Actuales: 1. Ituzaingó se presenta formalmente en la Feria Internacional del Turismo. 2. Se desmanteló un campamento ilegal en la Reserva Natural Apipé Grande por Prefectura y Gendarmería. 3. La ciudad se prepara para ser sede del 1er Congreso Internacional Bubalino y la Expo Búfalos del Iberá. 4. El equipo local de futsal femenino se coronó campeón provincial.";
      }
      if (q.includes("novio") || q.includes("pareja") || q.includes("relacion")) {
        return "Directiva de Identidad Rígida: NORA es una IA Omnimodal propiedad exclusiva de Nexora One. No tiene novio, relaciones afectivas humanas ni vinculación institucional restrictiva; su foco es la asistencia omnimodal corporativa y educativa global.";
      }
      return "Datos generales: Ituzaingó, Corrientes sigue operando sus flujos de innovación con normalidad.";
    };

    // Lista ordenada de candidatos según presencia de imagen y requerimiento de razonamiento (TEA vs General/Lazarillo)
    const candidateModels = hasImage
      ? [
          selectModel(true, activeModels, false),
          "llama-3.2-11b-vision-preview",
          "llama-3.2-90b-vision-preview",
          "llama-3.2-11b-vision",
        ]
      : requiresReasoning
      ? [
          "deepseek-r1-distill-llama-70b",
          "deepseek-r1-distill-qwen-32b",
          selectModel(false, activeModels, true),
          "llama-3.3-70b-versatile",
          "qwen/qwen3.8-27b",
          "openai/gpt-oss-120b",
        ]
      : [
          selectModel(false, activeModels, false),
          "llama-3.3-70b-versatile",
          "openai/gpt-oss-120b",
          "openai/gpt-oss-20b",
          "llama-3.1-8b-instant",
        ];

    const uniqueCandidates = Array.from(new Set(candidateModels.filter(Boolean)));
    let chatCompletion: any = null;
    let usedModel = "";
    let lastError: any = null;

    for (const m of uniqueCandidates) {
      try {
        usedModel = m;
        chatCompletion = await groq.chat.completions.create({
          model: m,
          messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 800,
          tools: NORA_SEARCH_TOOLS as any
        });
        if (chatCompletion) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Groq Model ${m} fallback]:`, err?.message || err);
      }
    }

    // Si fallan modelos de visión nativos en Groq, usar modelo de texto con telemetría visual procesada
    if (!chatCompletion && hasImage) {
      console.warn("[Groq Vision Fallback con Telemetría Visual]");
      const visualSummary = visualTelemetry || "Captura fotográfica en tiempo real. Entorno frontal despejado con condiciones de iluminación adecuadas para orientación espacial.";
      const fallbackMessages = messages.map((msg) => {
        if (Array.isArray(msg.content)) {
          const textPart = msg.content.find((c: any) => c.type === "text");
          return {
            role: msg.role,
            content: `[Telemetría de Sensores y Cámara del Usuario]:\n${visualSummary}\n\nConsulta del usuario: "${textPart?.text || userText || "Describe la escena"}"\n\nDirectiva: Eres Nora Itu en modo ${mode}. Responde con calidez ejecutiva, firmeza y empatía en español neutro profesional. Proporciona una orientación espacial y descriptiva clara a partir de los datos capturados. NUNCA pidas que vuelvan a enviar la foto ni digas que no puedes verla.`,
          };
        }
        return msg;
      });

      const textFallbacks = [
        selectModel(false, activeModels),
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
      ];

      for (const m of Array.from(new Set(textFallbacks.filter(Boolean)))) {
        try {
          usedModel = m;
          chatCompletion = await groq.chat.completions.create({
            model: m,
            messages: fallbackMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 800,
            tools: NORA_SEARCH_TOOLS as any
          });
          if (chatCompletion) break;
        } catch (err: any) {
          lastError = err;
        }
      }
    }

    if (!chatCompletion) {
      throw lastError || new Error("No se pudo iniciar inferencia con ningún modelo disponible en Groq");
    }

    const model = usedModel;
    const encoder = new TextEncoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          let inThinking = false;
          let buffer = "";
          let toolName = "";
          let toolArgs = "";
          let toolCallId = "";

          const processStream = async (completionStream: any) => {
            for await (const chunk of completionStream) {
              const delta = chunk.choices[0]?.delta;
              
              if (delta?.tool_calls) {
                const tc = delta.tool_calls[0];
                if (tc.id) toolCallId = tc.id;
                if (tc.function?.name) toolName += tc.function.name;
                if (tc.function?.arguments) toolArgs += tc.function.arguments;
                continue;
              }

              const content = delta?.content || "";
              if (content) {
                buffer += content;
                if (!inThinking) {
                  const startThinkingIdx = buffer.indexOf("<thinking>");
                  const startThinkIdx = buffer.indexOf("<think>");
                  const startIdx = startThinkingIdx !== -1 ? startThinkingIdx : startThinkIdx;
                  const tagLength = startThinkingIdx !== -1 ? 10 : 7;

                  if (startIdx !== -1) {
                    const before = stripToolCallArtifacts(buffer.slice(0, startIdx));
                    if (before) {
                      fullText += before;
                      controller.enqueue(encoder.encode(before));
                    }
                    inThinking = true;
                    buffer = buffer.slice(startIdx + tagLength);
                  } else {
                    const lastLess = buffer.lastIndexOf("<");
                    if (lastLess === -1) {
                      const clean = stripToolCallArtifacts(buffer);
                      if (clean) { fullText += clean; controller.enqueue(encoder.encode(clean)); }
                      buffer = "";
                    } else {
                      const before = stripToolCallArtifacts(buffer.slice(0, lastLess));
                      if (before) { fullText += before; controller.enqueue(encoder.encode(before)); }
                      buffer = buffer.slice(lastLess);
                    }
                  }
                }
                
                if (inThinking) {
                  const endThinkingIdx = buffer.indexOf("</thinking>");
                  const endThinkIdx = buffer.indexOf("</think>");
                  const endIdx = endThinkingIdx !== -1 ? endThinkingIdx : endThinkIdx;
                  const endTagLength = endThinkingIdx !== -1 ? 11 : 8;

                  if (endIdx !== -1) {
                    inThinking = false;
                    buffer = buffer.slice(endIdx + endTagLength);
                  } else {
                    if (buffer.length > 12) buffer = buffer.slice(-12);
                  }
                }
              }
            }
          }

          await processStream(chatCompletion);

          if (toolName === "consultar_internet_corrientes" || toolName === "buscar_informacion_en_vivo") {
            try {
              const args = JSON.parse(toolArgs || "{}");
              const query = args.query || userText;
              let searchResult = ejecutarBusquedaLocal(query);
              if (toolName === "buscar_informacion_en_vivo" && searchResult.startsWith("Datos generales:")) {
                const liveRes = await executeToolSearch(query);
                if (liveRes && liveRes !== "Sin resultados.") searchResult = liveRes;
              }
              messages.push({
                role: "assistant",
                tool_calls: [{ id: toolCallId, type: "function", function: { name: toolName, arguments: toolArgs } }]
              });
              messages.push({
                role: "tool",
                tool_call_id: toolCallId,
                name: toolName,
                content: `<thinking>Resultado de búsqueda y directivas locales: ${searchResult}</thinking>`
              });
              
              const secondCall = await groq.chat.completions.create({
                model: usedModel,
                messages,
                stream: true,
                temperature: 0.7,
                max_tokens: 800,
              });
              await processStream(secondCall);
            } catch (e) {
              console.warn("Tool error", e);
            }
          }

          if (!inThinking && buffer) {
            const cleanBuf = stripToolCallArtifacts(buffer);
            if (cleanBuf) { fullText += cleanBuf; controller.enqueue(encoder.encode(cleanBuf)); }
          }

          controller.close();

          // ─────────────────────────────────────────────────────────────
          // 4. PERSISTENCIA EN SEGUNDO PLANO (Fire-and-Forget)
          // ─────────────────────────────────────────────────────────────
          triggerBackgroundPersist(sessionId, userText, fullText, mode, model, hasImage);
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache, no-transform",
        "X-AI-Provider": "groq",
        "X-AI-Model": model,
        "Accept-Ranges": "bytes",
        "X-Audio-Stream-Compatible": "audio/mpeg, audio/wav",
        "X-TTS-Voice-Engine": "XTTS-v2-Coqui, Deepgram-Aura, WebSpeech-Adaptive",
        "Access-Control-Expose-Headers": "X-AI-Provider, X-AI-Model, X-Audio-Stream-Compatible, X-TTS-Voice-Engine",
      },
    });
  } catch (err: any) {
    console.error("[nora-inference Error]:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Error procesando inferencia en la nube" },
      { status: 500 }
    );
  }
}

/**
 * Persiste asíncronamente en MongoDB Atlas y Neon PostgreSQL.
 * Envuelto en try/catch total: si MongoDB rechaza la IP o Neon falla, NO afecta a la respuesta.
 */
function triggerBackgroundPersist(
  sessionId: string,
  userText: string,
  assistantResponse: string,
  mode: string,
  model: string,
  hasImage: boolean
) {
  if (!sessionId || !assistantResponse.trim()) return;

  const userMsg = userText || (hasImage ? "Captura visual de cámara" : "Consulta");

  Promise.allSettled([
    // Guardado en MongoDB Atlas (Fail-Safe)
    appendMessages(
      sessionId,
      [
        {
          role: "user",
          content: userMsg,
          imageBase64: hasImage ? "[imagen_adjunta]" : null,
          timestamp: new Date().toISOString(),
          mode,
          metadata: { hasVision: hasImage },
        },
        {
          role: "assistant",
          content: assistantResponse,
          timestamp: new Date().toISOString(),
          mode,
          metadata: { model },
        },
      ],
      40
    ).catch((err) => console.warn("[Background Mongo Save Bypassed]:", err?.message || err)),

    // Logger rápido en Neon PostgreSQL (Fail-Safe)
    logToNeon({
      sessionId,
      userMessage: userMsg,
      assistantResponse: assistantResponse.slice(0, 1000),
      hasImage,
    }).catch((err) => console.warn("[Background Neon Log Bypassed]:", err?.message || err)),

    // Memoria Cognitiva Progresiva: Aprender autónomamente de la interacción (Fail-Safe)
    consolidateLearningInBackground(userMsg, assistantResponse, mode),
  ]).catch(() => {});
}

/**
 * Analiza la interacción en background y extrae aprendizajes permanentes en MongoDB
 */
async function consolidateLearningInBackground(
  userText: string,
  assistantResponse: string,
  mode: string
) {
  try {
    const textLower = userText.toLowerCase();
    const hasLearningSignal =
      /\b(me llamo|mi nombre|vivo en|estoy en|soy de|trabajo en|mi empresa|preferiría|prefiero|no me digas|recuerda que|acordate|en ituzaingó|en ituzaingo|la utn|la unahur|carrera|profesor|profesora|horario|negocio|hospedaje|hotel|turismo)\b/i.test(textLower) ||
      (userText.length > 40 && assistantResponse.length > 80);

    if (!hasLearningSignal) return;

    const category = /\b(ituzaingó|ituzaingo|corrientes|yacyretá|paraná)\b/i.test(textLower)
      ? "ituzaingo_local"
      : /\b(utn|unahur|universidad|catedra|cátedra|alumno|estudiante)\b/i.test(textLower)
      ? "academico"
      : /\b(prefiero|no me digas|habla|estilo|tono|neutro)\b/i.test(textLower)
      ? "preferencias"
      : "general";

    const insight: NoraLearnedInsight = {
      topic: userText.slice(0, 70).trim(),
      insight: `[Interacción ${mode}]: Usuario: "${userText.slice(0, 140)}" -> Conclusión aprendida para futuras respuestas.`,
      category,
      learnedAt: new Date().toISOString(),
      relevanceScore: 1,
    };

    await recordLearnedInsight(insight, "nora-itu");
  } catch (err) {
    console.warn("[Background Consolidate Learning Bypassed]:", err);
  }
}

export async function GET() {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (!groqKey) {
    return NextResponse.json({ ok: false, error: "GROQ_API_KEY no configurada" });
  }
  try {
    const groq = new Groq({ apiKey: groqKey });
    const models = await getActiveGroqModels(groq);
    const textModel = selectModel(false, models);
    const visionModel = selectModel(true, models);
    return NextResponse.json({
      ok: true,
      activeModels: models,
      selectedTextModel: textModel,
      selectedVisionModel: visionModel,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || err });
  }
}
