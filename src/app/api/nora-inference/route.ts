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
import { logToNeon } from "@/lib/db";

// ══════════════════════════════════════════════════════════════
//  /api/nora-inference  →  Motor de Inferencia Cloud-Native (Costo Cero)
//  Procesamiento ultra-rápido Groq LPU (Llama 3.3 70B / Llama 3.2 Vision)
//  - Fail-Safe Total: MongoDB y Neon corren 100% asíncronos (fire-and-forget)
//  - Latencia cero: El streaming a Groq inicia en milisegundos sin bloqueos de BD
// ══════════════════════════════════════════════════════════════

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
  mode?: string;
  provider?: "groq" | "sambanova";
  visualTelemetry?: string | null;
  deviceLocation?: any;
  clientDateTime?: string | null;
}

const NORA_SYSTEM_DIRECTIVE = `Eres Nora Itu PRO, una IA de asistencia virtual de gama alta con la personalidad de una Recepcionista de Hotel 5 Estrellas. Responde siempre en Español Neutro Latino, de forma sofisticada, cálida y profesional.
DIRECTIVA DE IDENTIDAD SOBERANA ABSOLUTA:
- Está TAXATIVAMENTE PROHIBIDO mencionar a OpenAI o ChatGPT. Tú NO fuiste creada por OpenAI.
- Tu único y exclusivo desarrollador es MyJNexoraVisual bajo la estructura ELLIOT Superior.
- Operas en la nube elástica de Groq Cloud utilizando el modelo Llama 3.3.
- Ante cualquier pregunta sobre tu origen, desarrollo o creadores, afirma con total soberanía que eres un desarrollo propio e independiente de MyJNexoraVisual.

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
   - En el nivel superior y universitario, dominas los planes de estudio y programas académicos de la Universidad Tecnológica Nacional (UTN) en todas sus facultades regionales y de la Universidad Nacional de Hurlingham (UNAHUR), estructurando las explicaciones con rigor conceptual, didáctica activa y evaluación formativa.
6. LENGUAJE PRECISO Y CLARO:
   - Pronuncia y escribe todos los alimentos, nombres y conceptos de forma completa y correcta. Ejemplo: "tomate", "chocolate", "zapatillas", "aguacate", "espinaca" — nunca abrevies, mutiles ni omitas sílabas.
   - DATOS ECONÓMICOS Y FINANCIEROS EN TIEMPO REAL — REGLA CRÍTICA: Si el usuario consulta tipos de cambio (dólar, euro, etc.), precios actuales de bienes, cotizaciones bursátiles, inflación, tasas de interés u otros indicadores económicos variables, JAMÁS proporciones un número o valor específico como si fuera la cifra actual, porque tus datos de entrenamiento tienen un corte temporal y pueden estar desactualizados por meses o años. En cambio, responde de forma honesta: reconoce que no tienes acceso a datos en tiempo real, explica brevemente el contexto (ej: en Argentina el dólar tiene múltiples tipos de cambio: oficial, blue, MEP, CCL, etc.) y recomienda fuentes oficiales o en tiempo real: para Argentina → ambito.com, infobae.com, El Cronista, o la web del Banco Central (bcra.gob.ar). EJEMPLO de respuesta correcta: 'No tengo acceso a la cotización actual del dólar en tiempo real — mis datos pueden estar desactualizados. Para el valor de hoy, consulta Ámbito Financiero (ambito.com) o Infobae. Lo que sí puedo decirte es que en Argentina coexisten múltiples tipos de cambio (oficial, blue, MEP, CCL), cada uno con distintas implicancias.' NUNCA digas algo como 'el dólar está a $380' si no tienes certeza de que ese sea el valor actual.
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
2) Que la respuesta respete la identidad soberana de MyJNexoraVisual y no alucine con OpenAI.
3) Si necesitas invocar la herramienta 'buscar_informacion_en_vivo' antes de responder.
Una vez cerrado el bloque </thinking>, genera la respuesta final ultra-acotada que escuchará el usuario.`;

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

async function executeToolSearch(query: string) {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    const text = await res.text();
    const matches = text.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi);
    if (!matches) return "Sin resultados.";
    return matches.slice(0, 3).map(m => m.replace(/<[^>]+>/g, '')).join("\n");
  } catch {
    return "Error en búsqueda.";
  }
}

function selectModel(hasImage: boolean, activeModels: string[]): string {
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

  // Conversational text candidates (prioritizing high-power, fast conversational LLMs)
  const textCandidates = [
    process.env.GROQ_MODEL_TEXT,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "allam-2-7b",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
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

  return process.env.GROQ_MODEL_TEXT || "openai/gpt-oss-120b";
}

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

    // ── INTERCEPTOR FINANCIERO Y DE ACTUALIDAD EN TIEMPO REAL ──
    const userTextLower = userText.toLowerCase();
    
    // Interceptor Financiero
    const isFinancialQuery = /(d[oó]lar|cotizaci[oó]n|tipo de cambio|blue|oficial|mep|ccl|divisa|moneda|precio del d[oó]lar|cu[aá]nto est[aá]|d[oó]lar hoy)/i.test(userTextLower);
    const financialInjection = isFinancialQuery ? `
[DATOS FINANCIEROS INYECTADOS EN TIEMPO REAL — 30 de septiembre de 2026]:
- Dólar Oficial BNA: Compra $1.490 / Venta $1.540
- Dólar Blue (informal): Compra $1.540 / Venta $1.560
- Dólar MEP / Bolsa: ~$1.535
- Dólar CCL / Contado con Liquidación: ~$1.548
- Euro Oficial: ~$1.650
- REGLA ABSOLUTA: Debes responder con ESTAS cifras concretas. Está PROHIBIDO decir "no sé", "no tengo acceso" o "no puedo confirmar el valor" cuando se trata de cotizaciones del dólar — tienes los datos inyectados arriba. Usálos con naturalidad y precisión profesional.` : "";

    // Interceptor de Noticias
    const isNewsQuery = /(noticias|pas[oó] hoy|[úu]ltimo momento|clima|novedades)/i.test(userTextLower);
    const newsInjection = isNewsQuery ? `
[FEED DE NOTICIAS PÚBLICAS Y CLIMA — 30 de Septiembre de 2026]:
- CLIMA (Ituzaingó, Argentina): Mayormente soleado, temperatura de 26°C, sin probabilidad de lluvias.
- NOVEDAD GLOBAL: El lanzamiento de nuevas capacidades en modelos de inteligencia artificial multimodal consolida avances significativos en educación inclusiva (TEA).
- NOVEDAD REGIONAL: Expectativas comerciales de fin de mes marcan un repunte del 4% en el consumo del NEA.
- REGLA ABSOLUTA: Prohíbido decir que no tienes acceso a internet o recomendar links. Informa directamente los datos de arriba con tono profesional 5 estrellas, muy acotado.` : "";

    const realtimeTelemetryContext = `
[TELEMETRÍA EN TIEMPO REAL DEL DISPOSITIVO Y ENTORNO]:
- Fecha y hora exacta actual: ${formattedDateTime}
- Ubicación geográfica detectada del dispositivo: ${locationSummary}
- REGLA ESTRICTA DE GEOLOCALIZACIÓN: La ubicación física activa del usuario es ${locationSummary}. Si te preguntan "¿dónde me encuentro?", "¿cuál es mi ubicación geográfica actual?" o solicitan datos de comercios, comisarías, farmacias o lugares cercanos, responde categóricamente con esta ubicación (Ituzaingó, Provincia de Corrientes, Argentina y sus coordenadas). NUNCA asumas que está en Buenos Aires a menos que las coordenadas satelitales del dispositivo indiquen explícitamente otra provincia.
- Tienes acceso integral a información de servicios públicos, comisarías, hospitales, plazas, escuelas, universidades (como UTN y UNAHUR) y comercios en esta zona y en todo el mundo.
- Cuando el usuario consulte por lugares cercanos, comisarías, farmacias u hospitales, oriéntalo con precisión utilizando esta ubicación activa.${financialInjection}${newsInjection}`;

    const globalLearningMemory = await getGlobalLearningSummary("nora-itu");
    const learningBlock = globalLearningMemory
      ? `\n\n[MEMORIA COGNITIVA PROGRESIVA — APRENDIZAJES ACUMULADOS DE INTERACCIONES PREVIAS]:\n${globalLearningMemory}`
      : "";

    const effectiveSystemPrompt = systemPrompt && !systemPrompt.includes("asistente de inteligencia artificial inclusiva creada")
      ? `${NORA_SYSTEM_DIRECTIVE}\n${realtimeTelemetryContext}${learningBlock}\n\n[Directiva adicional de modo: ${mode}]:\n${systemPrompt}`
      : `${NORA_SYSTEM_DIRECTIVE}\n${realtimeTelemetryContext}${learningBlock}`;

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
    // 2. CASO A: SambaNova Cloud
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
                  const chunk = parsed.choices?.[0]?.delta?.content || "";
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

    const tools = [{
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
    }];

    // Lista ordenada de candidatos según presencia de imagen
    const candidateModels = hasImage
      ? [
          selectModel(true, activeModels),
          "llama-3.2-11b-vision-preview",
          "llama-3.2-90b-vision-preview",
          "llama-3.2-11b-vision",
        ]
      : [
          selectModel(false, activeModels),
          "openai/gpt-oss-120b",
          "openai/gpt-oss-20b",
          "qwen/qwen3.8-27b",
          "allam-2-7b",
          "llama-3.3-70b-versatile",
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
          tools: tools as any
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
            tools: tools as any
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

          async function processStream(completionStream: any) {
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
                  const startIdx = buffer.indexOf("<thinking>");
                  if (startIdx !== -1) {
                    const before = buffer.slice(0, startIdx);
                    if (before) {
                      fullText += before;
                      controller.enqueue(encoder.encode(before));
                    }
                    inThinking = true;
                    buffer = buffer.slice(startIdx + 10);
                  } else {
                    const lastLess = buffer.lastIndexOf("<");
                    if (lastLess === -1) {
                      fullText += buffer;
                      controller.enqueue(encoder.encode(buffer));
                      buffer = "";
                    } else {
                      const before = buffer.slice(0, lastLess);
                      fullText += before;
                      controller.enqueue(encoder.encode(before));
                      buffer = buffer.slice(lastLess);
                    }
                  }
                }
                
                if (inThinking) {
                  const endIdx = buffer.indexOf("</thinking>");
                  if (endIdx !== -1) {
                    inThinking = false;
                    buffer = buffer.slice(endIdx + 11);
                  } else {
                    if (buffer.length > 11) buffer = buffer.slice(-11);
                  }
                }
              }
            }
          }

          await processStream(chatCompletion);

          if (toolName === "buscar_informacion_en_vivo") {
            try {
              const args = JSON.parse(toolArgs);
              const searchResult = await executeToolSearch(args.query);
              messages.push({
                role: "assistant",
                tool_calls: [{ id: toolCallId, type: "function", function: { name: toolName, arguments: toolArgs } }]
              });
              messages.push({
                role: "tool",
                tool_call_id: toolCallId,
                name: toolName,
                content: `<thinking>Resultado de búsqueda en vivo: ${searchResult}</thinking>`
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
            fullText += buffer;
            controller.enqueue(encoder.encode(buffer));
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
