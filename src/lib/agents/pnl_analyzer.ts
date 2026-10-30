// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Motor de Calibración PNL y Coaching Ontológico
//  Analizador de Canales Sensoriales, Clima Emocional y Rapport
// ══════════════════════════════════════════════════════════════

export interface PNLProfile {
  sensoryChannel: 'VISUAL' | 'AUDITORY' | 'KINESTHETIC' | 'DIGITAL';
  emotionalTone: 'CALM' | 'FEAR' | 'ANGER' | 'SADNESS' | 'JOY' | 'CONFUSION';
  confidenceLevel: 'HIGH' | 'NEUTRAL' | 'LOW';
  fillerWords: string[]; // Muletillas detectadas (eh, o sea, viste, no sé...)
  keyPreoccupations: string[];
  recommendedRapportStyle: string;
}

// ── PATRONES HEURÍSTICOS DETERMINISTAS (FALLBACK ULTRA RÁPIDO < 2ms) ──
const PREDICATES = {
  VISUAL: [
    /\b(veo|ver|vista|panorama|perspectiva|n[ií]tido|n[ií]tida|claro|clara|foco|enfocar|brillante|oscuridad|iluminar|observo|mira|mirar|imagen|cuadro|aspecto)\b/gi,
  ],
  AUDITORY: [
    /\b(escucho|oigo|sonar|suena|ruido|tono|ritmo|sinton[ií]a|silencio|armon[ií]a|disonancia|chillar|eco|decir|grito|volumen|hablar)\b/gi,
  ],
  KINESTHETIC: [
    /\b(siento|sentir|peso|pecho|espalda|nudo|cargar|aprieta|toco|tacto|fr[ií]o|calor|pesado|pesadez|ahogo|presi[oó]n|dureza|dolor|c[aá]lido|agobio|golpe|vibra)\b/gi,
  ],
  DIGITAL: [
    /\b(datos|l[oó]gica|proceso|an[aá]lisis|algoritmo|m[eé]tricas|estrategia|n[uú]meros|estad[ií]sticas|sistem[aá]tico|criterio|racional|concepto)\b/gi,
  ],
};

const EMOTIONAL_MARKERS = {
  FEAR: /\b(miedo|temor|p[aá]nico|no s[eé] si voy a poder|ansiedad|asustado|inseguro|inseguridad|peligro|amenaza)\b/gi,
  SADNESS: /\b(triste|baj[oó]n|desanimado|llanto|pena|desesperanza|vac[ií]o|dolor|sin ganas|perdido|derrotado)\b/gi,
  ANGER: /\b(bronca|furia|enojo|odio|indignaci[oó]n|harto|estoy podrido|rabia|injusticia|calentura)\b/gi,
  JOY: /\b(feliz|alegr[ií]a|contento|genial|espectacular|b[aá]rbaro|entusiasmado|ilusi[oó]n|fiesta|orgullo)\b/gi,
  CONFUSION: /\b(no entiendo|mareado|confundido|desorientado|perdido|qu[eé] hago|enredo|duda)\b/gi,
};

const FILLER_PATTERNS = [
  /\b(este|eh|em|o sea|viste|tipo|onda|bueno|no s[eé]|digamos|es como que)\b/gi,
];

/**
 * Realiza un análisis heurístico inmediato de marcadores psicotectónicos y PNL.
 */
function evaluateHeuristics(input: string): PNLProfile {
  const text = input.trim();

  // 1. Conteo de predicados sensoriales
  const scores = {
    VISUAL: 0,
    AUDITORY: 0,
    KINESTHETIC: 0,
    DIGITAL: 0,
  };

  for (const [channel, regexList] of Object.entries(PREDICATES)) {
    for (const regex of regexList) {
      const matches = text.match(regex);
      if (matches) scores[channel as keyof typeof scores] += matches.length;
    }
  }

  let sensoryChannel: PNLProfile['sensoryChannel'] = 'DIGITAL';
  let maxScore = scores.DIGITAL;

  if (scores.KINESTHETIC > maxScore) {
    sensoryChannel = 'KINESTHETIC';
    maxScore = scores.KINESTHETIC;
  }
  if (scores.VISUAL > maxScore) {
    sensoryChannel = 'VISUAL';
    maxScore = scores.VISUAL;
  }
  if (scores.AUDITORY > maxScore) {
    sensoryChannel = 'AUDITORY';
    maxScore = scores.AUDITORY;
  }

  // 2. Tono emocional
  let emotionalTone: PNLProfile['emotionalTone'] = 'CALM';
  for (const [tone, regex] of Object.entries(EMOTIONAL_MARKERS)) {
    if (regex.test(text)) {
      emotionalTone = tone as PNLProfile['emotionalTone'];
      break;
    }
  }

  // 3. Muletillas detectadas
  const fillerSet = new Set<string>();
  for (const regex of FILLER_PATTERNS) {
    const matches = text.match(regex);
    if (matches) {
      matches.forEach((m) => fillerSet.add(m.toLowerCase()));
    }
  }
  const fillerWords = Array.from(fillerSet);

  // 4. Nivel de confianza
  let confidenceLevel: PNLProfile['confidenceLevel'] = 'NEUTRAL';
  const lowConfidenceMarkers = /\b(no s[eé]|duda|quiz[aá]s|tal vez|capaz|no puedo|no s[eé] si voy a poder|tengo miedo)\b/gi;
  const highConfidenceMarkers = /\b(seguro|convencido|totalmente|s[eé] exactamente|definitivamente|vamos a|lo tengo claro)\b/gi;

  if (lowConfidenceMarkers.test(text) || fillerWords.length >= 2) {
    confidenceLevel = 'LOW';
  } else if (highConfidenceMarkers.test(text)) {
    confidenceLevel = 'HIGH';
  }

  // 5. Preocupaciones clave y estilo de rapport
  const keyPreoccupations: string[] = [];
  if (emotionalTone === 'FEAR' || confidenceLevel === 'LOW') {
    keyPreoccupations.push('Capacidad para afrontar la carga actual o incertidumbre');
  }
  if (scores.VISUAL > 0 && text.toLowerCase().includes('número')) {
    keyPreoccupations.push('Claridad y visibilidad en métricas operativas');
  }

  let recommendedRapportStyle = 'Espejamiento neutral con foco en datos objetivos';
  if (sensoryChannel === 'KINESTHETIC') {
    recommendedRapportStyle = 'Rapport kinestésico: modular tono pausado, validar sensaciones corporales y ofrecer contención sin juzgar.';
  } else if (sensoryChannel === 'VISUAL') {
    recommendedRapportStyle = 'Rapport visual: pintar imágenes claras, esquematizar alternativas y brindar perspectiva nítida.';
  } else if (sensoryChannel === 'AUDITORY') {
    recommendedRapportStyle = 'Rapport auditivo: cuidar la cadencia, tono rítmico claro y armonizar la conversación.';
  }

  return {
    sensoryChannel,
    emotionalTone,
    confidenceLevel,
    fillerWords,
    keyPreoccupations: keyPreoccupations.length > 0 ? keyPreoccupations : ['Seguimiento del tema planteado'],
    recommendedRapportStyle,
  };
}

/**
 * Analiza la psicométrica y PNL de un mensaje usando LLM con fallback heurístico determinista.
 */
export async function analyzePsycholinguistics(
  input: string,
  prosodyMetadata?: Record<string, any>
): Promise<PNLProfile> {
  const heuristics = evaluateHeuristics(input);

  // Intentar calibración profunda vía Groq LPU si la clave está disponible
  const groqApiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!groqApiKey || input.trim().length < 8) {
    return heuristics;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500); // 2.5s hard limit

    const systemPrompt = `Eres un experto senior en Calibración PNL y Coaching Ontológico.
Analiza la siguiente frase del interlocutor y responde ÚNICAMENTE un JSON válido con esta estructura:
{
  "sensoryChannel": "VISUAL" | "AUDITORY" | "KINESTHETIC" | "DIGITAL",
  "emotionalTone": "CALM" | "FEAR" | "ANGER" | "SADNESS" | "JOY" | "CONFUSION",
  "confidenceLevel": "HIGH" | "NEUTRAL" | "LOW",
  "fillerWords": ["muletilla1", "muletilla2"],
  "keyPreoccupations": ["preocupación principal detectada"],
  "recommendedRapportStyle": "breve indicación de cómo acomodar el tono y canal"
}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0.1,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analiza esta frase: "${input}"\nMetadatos de prosodia: ${JSON.stringify(prosodyMetadata || {})}` },
        ],
      }),
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content) as PNLProfile;
        if (parsed.sensoryChannel && parsed.emotionalTone) {
          return {
            sensoryChannel: parsed.sensoryChannel,
            emotionalTone: parsed.emotionalTone,
            confidenceLevel: parsed.confidenceLevel || heuristics.confidenceLevel,
            fillerWords: Array.isArray(parsed.fillerWords) ? parsed.fillerWords : heuristics.fillerWords,
            keyPreoccupations: Array.isArray(parsed.keyPreoccupations) ? parsed.keyPreoccupations : heuristics.keyPreoccupations,
            recommendedRapportStyle: parsed.recommendedRapportStyle || heuristics.recommendedRapportStyle,
          };
        }
      }
    }
  } catch {
    // En caso de timeout o indisponibilidad de la API, retornar las heurísticas deterministas
  }

  return heuristics;
}

