import { MongoClient, Db, Collection } from "mongodb";

// ══════════════════════════════════════════════════════════════
//  NORA ITU — MongoDB Fail-Safe Edge Layer con Circuit Breaker
//  Capa NoSQL para memoria conversacional multi-agente
//  Resiliencia Absoluta: Latencia Cero bajo fallos de red / IP rejection
// ══════════════════════════════════════════════════════════════

const DB_NAME = "nora_itu_db";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

// ── PATRÓN CIRCUIT BREAKER ─────────────────────────────────────
// Si Atlas no responde o rechaza la IP (TLS alert 80 / timeout),
// el circuito se abre durante 60 segundos. Durante este tiempo,
// ninguna función espera ni bloquea el event-loop: retornan en 0ms.
let mongoCircuitOpenUntil = 0;
let indexesCreated = false;

function isCircuitOpen(): boolean {
  return Date.now() < mongoCircuitOpenUntil;
}

function tripCircuit(cooldownMs: number = 60_000) {
  mongoCircuitOpenUntil = Date.now() + cooldownMs;
  global.__mongoClientPromise = undefined;
}

function resetCircuit() {
  mongoCircuitOpenUntil = 0;
}

/**
 * Ejecuta una promesa con timeout estricto garantizando la limpieza
 * inmediata del temporizador para evitar fugas de memoria o bloqueos.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getMongoClientPromise(): Promise<MongoClient> | null {
  if (isCircuitOpen()) {
    return null;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  if (global.__mongoClientPromise) {
    return global.__mongoClientPromise;
  }

  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,                 // Concurrencia elástica optimizada
      minPoolSize: 0,
      maxIdleTimeMS: 15000,
      serverSelectionTimeoutMS: 1500, // Máximo 1.5s
      connectTimeoutMS: 1500,
      socketTimeoutMS: 4000,
    });

    const promise = client.connect()
      .then((connectedClient) => {
        resetCircuit();
        return connectedClient;
      })
      .catch((err) => {
        tripCircuit(60_000); // Abrir circuito por 60s
        console.warn("[Nora MongoDB Circuit Tripped]:", err?.message || err);
        throw err;
      });

    global.__mongoClientPromise = promise;
    return promise;
  } catch (err) {
    tripCircuit(60_000);
    return null;
  }
}

/**
 * Conecta con un timeout estricto de 1500ms y Circuit Breaker.
 * Si el circuito está abierto, retorna null en 0ms sin latencia.
 */
export async function connectMongo(): Promise<{ client: MongoClient; db: Db } | null> {
  if (isCircuitOpen()) {
    return null;
  }

  try {
    const promise = getMongoClientPromise();
    if (!promise) return null;

    const conn = await withTimeout(
      promise.then((client) => ({ client, db: client.db(DB_NAME) })),
      1500,
      null
    );

    if (!conn) {
      tripCircuit(45_000);
      return null;
    }

    // Creación no-bloqueante de índices en primer arranque
    if (!indexesCreated) {
      indexesCreated = true;
      ensureIndexes(conn.db).catch(() => {});
    }

    return conn;
  } catch (err) {
    tripCircuit(45_000);
    return null;
  }
}

async function ensureIndexes(db: Db) {
  try {
    await Promise.all([
      db.collection("nora_conversations").createIndex(
        { sessionId: 1, agentId: 1 },
        { background: true }
      ),
      db.collection("nora_global_learning").createIndex(
        { agentId: 1 },
        { background: true, unique: true }
      ),
    ]);
  } catch {}
}

// ══════════════════════════════════════════════════════════════
//  ESQUEMA DE DOCUMENTOS
// ══════════════════════════════════════════════════════════════

export interface NoraMessage {
  role: "user" | "assistant" | "system";
  content: string;
  imageBase64?: string | null;
  timestamp: string;
  mode?: "general" | "tea" | "lazarillo" | "docente" | string;
  metadata?: {
    model?: string;
    latencyMs?: number;
    tokenCount?: number;
    hasVision?: boolean;
  };
}

export interface NoraConversationDoc {
  _id?: string;
  sessionId: string;
  agentId: string;
  createdAt: Date;
  updatedAt: Date;
  messages: NoraMessage[];
  context?: {
    thinkingSteps?: string[];
    workingMemory?: Record<string, unknown>;
    activeTopics?: string[];
  };
  userProfile?: {
    mode: string;
    autoTEA: boolean;
    sessionLanguage: string;
  };
}

export async function getConversationsCollection(): Promise<Collection<NoraConversationDoc> | null> {
  try {
    const conn = await connectMongo();
    if (!conn) return null;
    return conn.db.collection<NoraConversationDoc>("nora_conversations");
  } catch {
    return null;
  }
}

/**
 * Agrega mensajes en MongoDB de forma asíncrona, tolerante y no-bloqueante.
 */
export async function appendMessages(
  sessionId: string,
  newMessages: NoraMessage[],
  maxHistory: number = 40,
  agentId: string = "nora-itu"
): Promise<boolean> {
  if (isCircuitOpen()) return false;

  try {
    const op = (async () => {
      const col = await getConversationsCollection();
      if (!col) return false;

      await col.updateOne(
        { sessionId, agentId },
        {
          $push: {
            messages: {
              $each: newMessages,
              $slice: -maxHistory,
            },
          } as any,
          $set: { updatedAt: new Date() },
          $setOnInsert: {
            createdAt: new Date(),
            context: { thinkingSteps: [], workingMemory: {}, activeTopics: [] },
            userProfile: { mode: "general", autoTEA: false, sessionLanguage: "es-419" },
          },
        },
        { upsert: true }
      );
      return true;
    })();

    return await withTimeout(op, 2000, false);
  } catch (err) {
    console.warn("[Nora MongoDB appendMessages Fail-Safe]:", (err as Error)?.message || err);
    return false;
  }
}

/**
 * Recupera mensajes recientes. Si MongoDB no responde en 1200ms o el circuito está abierto,
 * retorna [] inmediatamente sin congelar la inferencia.
 */
export async function getRecentMessages(
  sessionId: string,
  limit: number = 10,
  agentId: string = "nora-itu"
): Promise<NoraMessage[]> {
  if (isCircuitOpen()) return [];

  try {
    const op = (async () => {
      const col = await getConversationsCollection();
      if (!col) return [];
      const doc = await col.findOne(
        { sessionId, agentId },
        { projection: { messages: { $slice: -limit } } }
      );
      return doc?.messages ?? [];
    })();

    return await withTimeout(op, 1200, []);
  } catch (err) {
    return [];
  }
}

export async function getConversationSessions(
  agentId: string = "nora-itu",
  limit: number = 25
): Promise<Array<{ sessionId: string; updatedAt: Date; lastMessageSnippet: string; messageCount: number }>> {
  if (isCircuitOpen()) return [];

  try {
    const op = (async () => {
      const col = await getConversationsCollection();
      if (!col) return [];
      const docs = await col
        .find({ agentId })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .project({ sessionId: 1, updatedAt: 1, messages: { $slice: -1 } })
        .toArray();

      return docs.map((d: any) => {
        const lastMsg = d.messages && d.messages.length > 0 ? d.messages[0] : null;
        let snippet = lastMsg ? (lastMsg.role === "user" ? "Tú: " : "Nora: ") + (lastMsg.content || "") : "Conversación iniciada";
        if (snippet.length > 60) snippet = snippet.slice(0, 57) + "...";
        return {
          sessionId: d.sessionId,
          updatedAt: d.updatedAt || new Date(),
          lastMessageSnippet: snippet,
          messageCount: d.messages ? d.messages.length : 0,
        };
      });
    })();

    return await withTimeout(op, 1500, []);
  } catch {
    return [];
  }
}

export async function deleteConversationSession(
  sessionId: string,
  agentId: string = "nora-itu"
): Promise<boolean> {
  if (isCircuitOpen()) return false;

  try {
    const op = (async () => {
      const col = await getConversationsCollection();
      if (!col) return false;
      await col.deleteOne({ sessionId, agentId });
      return true;
    })();

    return await withTimeout(op, 1500, false);
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
//  MEMORIA COGNITIVA PROGRESIVA — APRENDIZAJE ACUMULATIVO DÍA A DÍA
// ══════════════════════════════════════════════════════════════

export interface NoraLearnedInsight {
  topic: string;
  insight: string;
  category: "usuario" | "preferencias" | "ituzaingo_local" | "academico" | "vocabulario" | "general";
  learnedAt: string;
  relevanceScore?: number;
}

export interface NoraGlobalLearningDoc {
  _id?: string;
  agentId: string;
  updatedAt: Date;
  totalInteractions: number;
  insights: NoraLearnedInsight[];
  summaryPrompt: string;
}

let cachedGlobalSummary: { text: string; timestamp: number } | null = null;

const DEFAULT_GLOBAL_LEARNING_SUMMARY =
  "- Preferencias aprendidas: Hablar siempre en español neutro profesional, sin modismos ni 'che'.\n" +
  "- Localización núcleo: Ituzaingó, Corrientes, Argentina (cerca de Represa Yacyretá, Río Paraná).\n" +
  "- Entorno y versatilidad: Asistencia universal inclusiva, profesional, corporativa y académica.\n" +
  "- Identidad y autor: Desarrollado por Nexora One, Tel/WhatsApp: +54 9 3786 41-4533, Correo oficial: mjnexora.visual@gmail.com.";

export async function getGlobalLearningCollection(): Promise<Collection<NoraGlobalLearningDoc> | null> {
  try {
    const conn = await connectMongo();
    if (!conn) return null;
    return conn.db.collection<NoraGlobalLearningDoc>("nora_global_learning");
  } catch {
    return null;
  }
}

/**
 * Obtiene la síntesis de aprendizajes acumulados con caché volátil de 60s
 * y Circuit Breaker instantáneo. Latencia < 1ms cuando el circuito está abierto.
 */
export async function getGlobalLearningSummary(agentId: string = "nora-itu"): Promise<string> {
  const now = Date.now();
  if (cachedGlobalSummary && now - cachedGlobalSummary.timestamp < 60000) {
    return cachedGlobalSummary.text;
  }

  if (isCircuitOpen()) {
    return cachedGlobalSummary?.text || DEFAULT_GLOBAL_LEARNING_SUMMARY;
  }

  try {
    const op = (async () => {
      const col = await getGlobalLearningCollection();
      if (!col) return cachedGlobalSummary?.text || DEFAULT_GLOBAL_LEARNING_SUMMARY;

      const doc = await col.findOne({ agentId });
      if (!doc || !doc.summaryPrompt) {
        return DEFAULT_GLOBAL_LEARNING_SUMMARY;
      }

      cachedGlobalSummary = { text: doc.summaryPrompt, timestamp: now };
      return doc.summaryPrompt;
    })();

    return await withTimeout(op, 1000, cachedGlobalSummary?.text || DEFAULT_GLOBAL_LEARNING_SUMMARY);
  } catch (err) {
    return cachedGlobalSummary?.text || DEFAULT_GLOBAL_LEARNING_SUMMARY;
  }
}

/**
 * Registra un aprendizaje adquirido y regenera el bloque sintético de memoria.
 */
export async function recordLearnedInsight(
  insight: NoraLearnedInsight,
  agentId: string = "nora-itu"
): Promise<boolean> {
  if (isCircuitOpen()) return false;

  try {
    const col = await getGlobalLearningCollection();
    if (!col) return false;

    await col.updateOne(
      { agentId },
      {
        $push: {
          insights: {
            $each: [insight],
            $slice: -60,
          },
        } as any,
        $inc: { totalInteractions: 1 },
        $set: { updatedAt: new Date() },
        $setOnInsert: {
          agentId,
          summaryPrompt: "",
        },
      },
      { upsert: true }
    );

    cachedGlobalSummary = null;
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Actualiza la síntesis consolidada de memoria de aprendizaje en MongoDB.
 */
export async function updateLearningSummary(
  summaryText: string,
  agentId: string = "nora-itu"
): Promise<boolean> {
  if (isCircuitOpen()) return false;

  try {
    const col = await getGlobalLearningCollection();
    if (!col) return false;

    await col.updateOne(
      { agentId },
      {
        $set: {
          summaryPrompt: summaryText,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    cachedGlobalSummary = { text: summaryText, timestamp: Date.now() };
    return true;
  } catch (err) {
    return false;
  }
}
