/**
 * NEXORA ONE ENGINE — ISOLATED MULTI-TENANT PERSISTENCE & REDIS RESP3 BRIDGE
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Repository: D:\Nora itu UTN (branch: feat/nexora-industrial-engine)
 * Namespace: src/lib/nexora/tenantStore.ts
 *
 * CRITICAL ISOLATION INVARIANT:
 * - Academic MongoDB uses `nora_itu_db` (collections `nora_conversations`, `nora_global_learning`).
 * - This module binds EXCLUSIVELY to the isolated corporate database `noraitu_nexora`
 *   (collections `nexora_mission_dispatches`, `nexora_engine_audit`, `nexora_sdr_prospects`)
 *   and the isolated PostgreSQL schema `nora_core`.
 */

import { MongoClient, Db, Collection } from "mongodb";
import * as net from "net";
import {
  NEXORA_ENGINE_NAME,
  NEXORA_SIGNATURE,
  NexoraMasterDispatchContract,
  NexoraMissionStatus,
  NexoraTenantMode,
} from "./types";

const NEXORA_CORPORATE_DB_NAME = "noraitu_nexora";

declare global {
  // eslint-disable-next-line no-var
  var __nexoraMongoClientPromise: Promise<MongoClient> | undefined;
}

export interface NexoraDispatchRecord {
  _id?: string;
  engine: "Nexora One Engine";
  signature: "By Nora";
  dispatch_id: string;
  correlation_id: string;
  client_id: string;
  brand_name: string;
  priority: string;
  status: NexoraMissionStatus;
  tenant_mode: NexoraTenantMode;
  redis_message_id?: string | null;
  contract: NexoraMasterDispatchContract;
  created_at: Date;
  updated_at: Date;
}

/**
 * Discriminates strictly between Academic Requests and Nexora One Engine | By Nora Requests.
 */
export function resolveTenantMode(headers: Headers): NexoraTenantMode {
  const tenantHeader = (headers.get("x-nexora-tenant") || "").trim().toUpperCase();
  const apiKey = headers.get("x-nexora-key") || "";
  const expectedKey = process.env.NEXORA_HOLDING_API_KEY || "";

  if (expectedKey && apiKey === expectedKey) {
    return "NEXORA_ONE_ENGINE";
  }
  if (
    tenantHeader === "NEXORA_ONE_ENGINE" ||
    tenantHeader === "NEXORA_ONE" ||
    tenantHeader === "BY_NORA"
  ) {
    return "NEXORA_ONE_ENGINE";
  }
  return "ACADEMIC_PROTECTED";
}

/**
 * Connects to the isolated `noraitu_nexora` MongoDB database without touching `nora_itu_db`.
 */
export async function connectNexoraMongo(): Promise<{
  client: MongoClient;
  db: Db;
} | null> {
  const uri = process.env.NEXORA_MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) {
    return null;
  }

  try {
    if (!global.__nexoraMongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 8,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000,
        socketTimeoutMS: 4500,
      });
      global.__nexoraMongoClientPromise = client.connect();
    }

    const client = await global.__nexoraMongoClientPromise;
    const db = client.db(NEXORA_CORPORATE_DB_NAME);
    return { client, db };
  } catch (err) {
    global.__nexoraMongoClientPromise = undefined;
    console.warn(
      "[Nexora One Engine | By Nora MongoDB Warning]:",
      err instanceof Error ? err.message : String(err)
    );
    return null;
  }
}

export async function getNexoraDispatchesCollection(): Promise<Collection<NexoraDispatchRecord> | null> {
  const conn = await connectNexoraMongo();
  if (!conn) return null;
  return conn.db.collection<NexoraDispatchRecord>("nexora_mission_dispatches");
}

export async function persistNexoraDispatchToMongo(
  contract: NexoraMasterDispatchContract,
  status: NexoraMissionStatus,
  redisMessageId: string | null
): Promise<boolean> {
  try {
    const col = await getNexoraDispatchesCollection();
    if (!col) return false;

    const now = new Date();
    await col.updateOne(
      { correlation_id: contract.dispatch_header.correlation_id },
      {
        $set: {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
          dispatch_id: contract.dispatch_header.dispatch_id,
          client_id: contract.client_context.client_id,
          brand_name: contract.client_context.brand_name,
          priority: contract.dispatch_header.priority,
          status,
          tenant_mode: "NEXORA_ONE_ENGINE",
          redis_message_id: redisMessageId,
          contract,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.warn(
      "[Nexora One Engine | By Nora MongoDB Persist Non-Blocking]:",
      err instanceof Error ? err.message : String(err)
    );
    return false;
  }
}

function encodeRespCommand(args: string[]): Buffer {
  const parts: Buffer[] = [Buffer.from(`*${args.length}\r\n`, "utf-8")];
  for (const arg of args) {
    const byteBuf = Buffer.from(arg, "utf-8");
    parts.push(Buffer.from(`$${byteBuf.length}\r\n`, "utf-8"));
    parts.push(byteBuf);
    parts.push(Buffer.from("\r\n", "utf-8"));
  }
  return Buffer.concat(parts);
}

/**
 * Publishes a Master Dispatch payload directly to the Redis 7 Event Bus (`XADD nexora:bus:master_dispatch * payload <json>`)
 */
export async function publishDispatchToRedisStream(
  contract: NexoraMasterDispatchContract
): Promise<{ ok: boolean; messageId: string | null; error?: string }> {
  const host = process.env.NEXORA_REDIS_HOST || "127.0.0.1";
  const port = parseInt(process.env.NEXORA_REDIS_PORT || "6379", 10);
  const password = process.env.NEXORA_REDIS_PASSWORD || process.env.REDIS_PASSWORD || "";
  const streamKey = contract.dispatch_header.redis_routing.stream_key;
  const serializedPayload = JSON.stringify(contract);

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    let responseBuffer = "";

    const finalize = (result: {
      ok: boolean;
      messageId: string | null;
      error?: string;
    }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(2500);

    socket.on("timeout", () => {
      finalize({ ok: false, messageId: null, error: "Redis TCP socket timeout" });
    });

    socket.on("error", (err) => {
      finalize({ ok: false, messageId: null, error: err.message });
    });

    socket.connect(port, host, () => {
      const commands: Buffer[] = [];
      if (password) {
        commands.push(encodeRespCommand(["AUTH", password]));
      }
      commands.push(
        encodeRespCommand([
          "XADD",
          streamKey,
          "*",
          "engine",
          NEXORA_ENGINE_NAME,
          "signature",
          NEXORA_SIGNATURE,
          "payload",
          serializedPayload,
        ])
      );
      socket.write(Buffer.concat(commands));
    });

    socket.on("data", (chunk) => {
      responseBuffer += chunk.toString("utf-8");
      if (responseBuffer.startsWith("-ERR") || responseBuffer.includes("\r\n-")) {
        finalize({
          ok: false,
          messageId: null,
          error: responseBuffer.trim(),
        });
        return;
      }
      const match = responseBuffer.match(/([0-9]{10,}-[0-9]+)/);
      if (match) {
        finalize({ ok: true, messageId: match[1] });
      }
    });
  });
}
