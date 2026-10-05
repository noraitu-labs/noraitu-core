import { MongoClient, Db, Collection } from "mongodb";

// ══════════════════════════════════════════════════════════════
//  NORA ITU — MongoDB Fail-Safe Edge Layer
//  Capa NoSQL para memoria conversacional multi-agente
//  Resiliencia Absoluta: NUNCA bloquea el flujo si Atlas tarda o rechaza IP
// ══════════════════════════════════════════════════════════════

const DB_NAME = "nora_itu_db";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

function getMongoClientPromise(): Promise<MongoClient> | null {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[Nora MongoDB]: MONGODB_URI no configurado.");
    return null;
  }

  if (global.__mongoClientPromise) {
    return global.__mongoClientPromise;
  }

  try {
    const client = new MongoClient(uri, {
      maxPoolSize: 2,               // Conservador para capa Free M0
      minPoolSize: 0,
      maxIdleTimeMS: 15000,
      serverSelectionTimeoutMS: 2000, // Máximo 2s para evitar colgar Vercel
      connectTimeoutMS: 2000,
      socketTimeoutMS: 5000,
    });

    const promise = client.connect().catch((err) => {
      console.warn("[Nora MongoDB Connect Fail-Safe]:", err?.message || err);
      global.__mongoClientPromise = undefined;
      throw err;
    });

    global.__mongoClientPromise = promise;
    return promise;
  } catch (err) {
    console.warn("[Nora MongoDB Init Warning]:", err);
    return null;
  }
}

/**
 * Conecta con un timeout estricto de 2000ms. Si Atlas no responde, retorna null de inmediato.
 */
export async function connectMongo(): Promise<{ client: MongoClient; db: Db } | null> {
  try {
    const promise = getMongoClientPromise();
    if (!promise) return null;

    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 2000)
    );

    const conn = await Promise.race([
      promise.then((client) => ({ client, db: client.db(DB_NAME) })),
      timeoutPromise,
    ]);

    return conn;
  } catch (err) {
    console.warn("[Nora MongoDB Non-blocking Bypass]:", (err as Error)?.message || err);
    global.__mongoClientPromise = undefined;
    return null;
  }
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
 * Agrega mensajes en MongoDB de forma completamente asíncrona y segura.
 */
export async function appendMessages(
  sessionId: string,
  newMessages: NoraMessage[],
  maxHistory: number = 40,
  agentId: string = "nora-itu"
): Promise<boolean> {
  try {
    const timeoutPromise = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(false), 2500)
    );

    const opPromise = (async () => {
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

    return await Promise.race([opPromise, timeoutPromise]);
  } catch (err) {
    console.warn("[Nora MongoDB appendMessages Fail-Safe]:", (err as Error)?.message || err);
    return false;
  }
}

/**
 * Recupera mensajes recientes. Si MongoDB demora >1500ms, retorna [] sin bloquear.
 */
export async function getRecentMessages(
  sessionId: string,
  limit: number = 10,
  agentId: string = "nora-itu"
): Promise<NoraMessage[]> {
  try {
    const timeoutPromise = new Promise<NoraMessage[]>((resolve) =>
      setTimeout(() => resolve([]), 1500)
    );

    const opPromise = (async () => {
      const col = await getConversationsCollection();
      if (!col) return [];
      const doc = await col.findOne(
        { sessionId, agentId },
        { projection: { messages: { $slice: -limit } } }
      );
      return doc?.messages ?? [];
    })();

    return await Promise.race([opPromise, timeoutPromise]);
  } catch (err) {
    console.warn("[Nora MongoDB getRecentMessages Fail-Safe]:", (err as Error)?.message || err);
    return [];
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
 * Obtiene la síntesis de aprendizajes acumulados para enriquecer el System Prompt en tiempo real.
 * Cuenta con caché de 60 segundos y timeout de 1200ms para latencia cero.
 */
export async function getGlobalLearningSummary(agentId: string = "nora-itu"): Promise<string> {
  const now = Date.now();
  if (cachedGlobalSummary && now - cachedGlobalSummary.timestamp < 60000) {
    return cachedGlobalSummary.text;
  }

  try {
    const timeoutPromise = new Promise<string>((resolve) =>
      setTimeout(() => resolve(cachedGlobalSummary?.text || ""), 1200)
    );

    const fetchPromise = (async () => {
      const col = await getGlobalLearningCollection();
      if (!col) return cachedGlobalSummary?.text || "";

      const doc = await col.findOne({ agentId });
      if (!doc || !doc.summaryPrompt) {
        const defaultPrompt =
          "- Preferencias aprendidas: Hablar siempre en español neutro profesional, sin modismos ni 'che'.\n" +
          "- Localización núcleo: Ituzaingó, Corrientes, Argentina (cerca de Represa Yacyretá, Río Paraná).\n" +
          "- Entorno académico: Conexión formativa con UTN (Universidad Tecnológica Nacional) y UNAHUR.\n" +
          "- Identidad del creador: Nexora One, soporte noraitudev@gmail.com, WhatsApp +54 9 3786 41-4533.";
        return defaultPrompt;
      }

      cachedGlobalSummary = { text: doc.summaryPrompt, timestamp: now };
      return doc.summaryPrompt;
    })();

    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch (err) {
    console.warn("[Global Learning Get Bypassed]:", (err as Error)?.message || err);
    return cachedGlobalSummary?.text || "";
  }
}

/**
 * Registra un aprendizaje adquirido y regenera el bloque sintético de memoria.
 */
export async function recordLearnedInsight(
  insight: NoraLearnedInsight,
  agentId: string = "nora-itu"
): Promise<boolean> {
  try {
    const col = await getGlobalLearningCollection();
    if (!col) return false;

    await col.updateOne(
      { agentId },
      {
        $push: {
          insights: {
            $each: [insight],
            $slice: -60, // Conservar los 60 aprendizajes más recientes y relevantes
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

    // Invalidar caché local para que la próxima inferencia lea la actualización
    cachedGlobalSummary = null;
    return true;
  } catch (err) {
    console.warn("[Record Learned Insight Fail-Safe]:", (err as Error)?.message || err);
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
    console.warn("[Update Learning Summary Fail-Safe]:", (err as Error)?.message || err);
    return false;
  }
}
