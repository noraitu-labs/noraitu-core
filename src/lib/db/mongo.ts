import { MongoClient, Db, Collection } from "mongodb";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — MongoDB Atlas Fail-Safe Singleton Client
//  High-Performance NoSQL storage for Raw Transcripts & Agent Memory
// ══════════════════════════════════════════════════════════════

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const DB_NAME = process.env.MONGODB_DB_NAME?.trim() || "nexora_one_db";

// Circuit Breaker for Atlas connectivity
let circuitOpenUntil = 0;
let collectionsIndexed = false;

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function tripCircuit(cooldownMs: number = 45_000) {
  circuitOpenUntil = Date.now() + cooldownMs;
  global.__mongoClientPromise = undefined;
}

/**
 * Returns the singleton MongoClient promise, reusing connections across Serverless lambdas.
 */
export function getMongoClientPromise(): Promise<MongoClient> | null {
  if (isCircuitOpen()) {
    return null;
  }

  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) {
    return null;
  }

  if (!global.__mongoClientPromise) {
    const client = new MongoClient(uri, {
      connectTimeoutMS: 4000,
      serverSelectionTimeoutMS: 4000,
      socketTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 0,
      retryWrites: true,
    });

    global.__mongoClientPromise = client.connect().catch((err) => {
      console.warn("[Mongo Atlas Connection Tripped]:", err?.message || err);
      tripCircuit(60_000);
      throw err;
    });
  }

  return global.__mongoClientPromise;
}

/**
 * Resolves the MongoDB database instance.
 */
export async function getMongoDb(): Promise<Db | null> {
  const promise = getMongoClientPromise();
  if (!promise) return null;
  try {
    const client = await promise;
    const db = client.db(DB_NAME);

    // Lazily create useful indexes once
    if (!collectionsIndexed) {
      collectionsIndexed = true;
      Promise.all([
        db.collection("radio_transcripts").createIndex({ session_id: 1, created_at: -1 }),
        db.collection("agent_memory").createIndex({ session_id: 1, key: 1 }),
      ]).catch(() => { });
    }

    return db;
  } catch (err) {
    return null;
  }
}

/**
 * Access helper for radio_transcripts collection.
 */
export async function getRadioTranscriptsCollection(): Promise<Collection<RadioTranscriptDocument> | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<RadioTranscriptDocument>("radio_transcripts");
}

/**
 * Access helper for agent_memory collection.
 */
export async function getAgentMemoryCollection(): Promise<Collection<AgentMemoryDocument> | null> {
  const db = await getMongoDb();
  if (!db) return null;
  return db.collection<AgentMemoryDocument>("agent_memory");
}

export interface RadioTranscriptDocument {
  session_id: string;
  user_message: string;
  assistant_reply: string;
  model_used: string;
  latency_ms: number;
  has_image: boolean;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface AgentMemoryDocument {
  session_id: string;
  key: string;
  value: any;
  category?: string;
  updated_at: Date;
}

/**
 * Non-blocking helper to persist a radio conversational turn.
 */
export async function saveRadioTranscript(doc: {
  sessionId?: string;
  userMessage: string;
  assistantReply: string;
  modelUsed?: string;
  latencyMs?: number;
  hasImage?: boolean;
  metadata?: Record<string, any>;
}): Promise<boolean> {
  try {
    const col = await getRadioTranscriptsCollection();
    if (!col) return false;

    await col.insertOne({
      session_id: doc.sessionId || "default_live_booth",
      user_message: doc.userMessage,
      assistant_reply: doc.assistantReply,
      model_used: doc.modelUsed || "unknown",
      latency_ms: doc.latencyMs || 0,
      has_image: Boolean(doc.hasImage),
      metadata: doc.metadata || {},
      created_at: new Date(),
    });
    return true;
  } catch (err) {
    console.warn("[Mongo saveRadioTranscript Warning]:", err);
    return false;
  }
}

