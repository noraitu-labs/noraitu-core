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
