/**
 * NEXORA ONE ENGINE — ISOLATED GATEWAY ENDPOINT FOR NORA ITU (CORE / COO)
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Repository: D:\Nora itu UTN (branch: feat/nexora-industrial-engine)
 * Route: src/app/api/nexora/dispatch/route.ts
 *
 * CRITICAL NON-REGRESSION GUARANTEE:
 * - Resides strictly under `/api/nexora/dispatch`.
 * - Does NOT import or mutate any academic route (`/api/nora-inference`, `/api/nora-memory`, etc.).
 * - Enforces tenant discrimination (`resolveTenantMode`), structural contract validation,
 *   official signature headers (`X-Engine: Nexora One Engine`, `X-Signature: By Nora`),
 *   isolated MongoDB persistence (`noraitu_nexora`), and Redis Stream publication.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  NEXORA_ENGINE_NAME,
  NEXORA_SIGNATURE,
  NexoraMasterDispatchContract,
} from "@/lib/nexora/types";
import {
  connectNexoraMongo,
  getNexoraDispatchesCollection,
  persistNexoraDispatchToMongo,
  publishDispatchToRedisStream,
  resolveTenantMode,
} from "@/lib/nexora/tenantStore";

const OFFICIAL_RESPONSE_HEADERS = {
  "X-Engine": NEXORA_ENGINE_NAME,
  "X-Signature": NEXORA_SIGNATURE,
};

function validateMasterContractStructure(body: unknown): {
  valid: boolean;
  contract?: NexoraMasterDispatchContract;
  reason?: string;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, reason: "Payload must be a non-null JSON object." };
  }
  const obj = body as Record<string, unknown>;

  if (obj.schema_version !== "2.0.0") {
    return { valid: false, reason: "schema_version must equal '2.0.0'." };
  }

  const identity = obj.engine_identity as Record<string, unknown> | undefined;
  if (
    !identity ||
    identity.engine !== NEXORA_ENGINE_NAME ||
    identity.signature !== NEXORA_SIGNATURE
  ) {
    return {
      valid: false,
      reason: `engine_identity must contain engine='${NEXORA_ENGINE_NAME}' and signature='${NEXORA_SIGNATURE}'.`,
    };
  }

  const hdr = obj.dispatch_header as Record<string, unknown> | undefined;
  if (!hdr || typeof hdr !== "object") {
    return { valid: false, reason: "Missing dispatch_header object." };
  }
  if (
    typeof hdr.dispatch_id !== "string" ||
    typeof hdr.correlation_id !== "string" ||
    !/^NXR-[0-9]{8}-[A-Z0-9]{8}$/.test(hdr.correlation_id) ||
    hdr.issued_by !== "NORA_ITU_CORE_COO"
  ) {
    return {
      valid: false,
      reason:
        "Invalid dispatch_header: requires UUID dispatch_id, correlation_id matching ^NXR-[0-9]{8}-[A-Z0-9]{8}$, and issued_by='NORA_ITU_CORE_COO'.",
    };
  }

  const client = obj.client_context as Record<string, unknown> | undefined;
  if (
    !client ||
    typeof client.client_id !== "string" ||
    typeof client.brand_name !== "string"
  ) {
    return { valid: false, reason: "Invalid or missing client_context." };
  }

  const storage = obj.storage_bindings as Record<string, unknown> | undefined;
  if (
    !storage ||
    storage.vfs_mount_root !== "/mnt/nexora_storage" ||
    storage.nexora_audio_dir !==
      "/mnt/nexora_storage/media_production/nexora_audio" ||
    storage.nexora_visual_dir !==
      "/mnt/nexora_storage/media_production/nexora_visual" ||
    storage.nexora_editorial_dir !==
      "/mnt/nexora_storage/media_production/nexora_editorial" ||
    storage.nexora_demos_dir !==
      "/mnt/nexora_storage/media_production/nexora_demos"
  ) {
    return {
      valid: false,
      reason:
        "Invalid storage_bindings: must bind strictly to /mnt/nexora_storage/media_production/{nexora_audio,nexora_visual,nexora_editorial,nexora_demos}.",
    };
  }

  const ws = obj.workstreams as Record<string, unknown> | undefined;
  if (
    !ws ||
    !ws.commercial_spot_production ||
    !ws.nexora_editorial_production ||
    !ws.sdr_autonomous_prospecting
  ) {
    return {
      valid: false,
      reason:
        "workstreams must include commercial_spot_production, nexora_editorial_production, and sdr_autonomous_prospecting.",
    };
  }

  return {
    valid: true,
    contract: obj as unknown as NexoraMasterDispatchContract,
  };
}

/**
 * GET /api/nexora/dispatch
 */
export async function GET(req: NextRequest) {
  const tenantMode = resolveTenantMode(req.headers);
  const mongoConn = await connectNexoraMongo();
  const col = await getNexoraDispatchesCollection();

  let recentDispatches: Array<{
    correlation_id: string;
    brand_name: string;
    priority: string;
    status: string;
    updated_at: Date;
  }> = [];

  if (col) {
    try {
      const docs = await col
        .find({})
        .sort({ updated_at: -1 })
        .limit(10)
        .project({
          correlation_id: 1,
          brand_name: 1,
          priority: 1,
          status: 1,
          updated_at: 1,
        })
        .toArray();
      recentDispatches = docs.map((d) => ({
        correlation_id: String(d.correlation_id),
        brand_name: String(d.brand_name),
        priority: String(d.priority),
        status: String(d.status),
        updated_at: d.updated_at || new Date(),
      }));
    } catch {
      recentDispatches = [];
    }
  }

  return NextResponse.json(
    {
      engine: NEXORA_ENGINE_NAME,
      signature: NEXORA_SIGNATURE,
      gateway: "NORA_ITU_CORE_NEXORA_GATEWAY",
      branch: "feat/nexora-industrial-engine",
      academic_core_isolation: "STRICT_INVARIANT_ENFORCED",
      detected_tenant_mode: tenantMode,
      isolated_mongodb_database: "noraitu_nexora",
      mongodb_connected: Boolean(mongoConn),
      storage_hierarchy: {
        root: "/mnt/nexora_storage",
        nexora_audio: "/mnt/nexora_storage/media_production/nexora_audio",
        nexora_visual: "/mnt/nexora_storage/media_production/nexora_visual",
        nexora_editorial: "/mnt/nexora_storage/media_production/nexora_editorial",
        nexora_demos: "/mnt/nexora_storage/media_production/nexora_demos",
      },
      recent_dispatches: recentDispatches,
      timestamp: new Date().toISOString(),
    },
    { status: 200, headers: OFFICIAL_RESPONSE_HEADERS }
  );
}

/**
 * POST /api/nexora/dispatch
 */
export async function POST(req: NextRequest) {
  const tenantMode = resolveTenantMode(req.headers);
  if (tenantMode !== "NEXORA_ONE_ENGINE") {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: "TENANT_ISOLATION_GUARD",
        message:
          "This endpoint belongs exclusively to Nexora One Engine | By Nora. Pass header 'x-nexora-tenant: NEXORA_ONE_ENGINE' (or BY_NORA).",
      },
      { status: 403, headers: OFFICIAL_RESPONSE_HEADERS }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: "INVALID_JSON",
        message: "Request body is not valid JSON.",
      },
      { status: 400, headers: OFFICIAL_RESPONSE_HEADERS }
    );
  }

  const validation = validateMasterContractStructure(rawBody);
  if (!validation.valid || !validation.contract) {
    return NextResponse.json(
      {
        engine: NEXORA_ENGINE_NAME,
        signature: NEXORA_SIGNATURE,
        error: "SCHEMA_VALIDATION_FAILED",
        message: validation.reason || "Invalid Master Dispatch payload.",
      },
      { status: 422, headers: OFFICIAL_RESPONSE_HEADERS }
    );
  }

  const contract = validation.contract;

  const redisResult = await publishDispatchToRedisStream(contract);

  const mongoPersisted = await persistNexoraDispatchToMongo(
    contract,
    redisResult.ok ? "QUEUED" : "IN_PROGRESS",
    redisResult.messageId
  );

  return NextResponse.json(
    {
      engine: NEXORA_ENGINE_NAME,
      signature: NEXORA_SIGNATURE,
      status: "ACCEPTED",
      gateway: "NORA_ITU_CORE_COO",
      tenant_mode: tenantMode,
      dispatch_id: contract.dispatch_header.dispatch_id,
      correlation_id: contract.dispatch_header.correlation_id,
      redis_stream: {
        stream_key: contract.dispatch_header.redis_routing.stream_key,
        published: redisResult.ok,
        message_id: redisResult.messageId,
        diagnostic: redisResult.error || null,
      },
      isolated_mongo_persisted: mongoPersisted,
      accepted_at: new Date().toISOString(),
    },
    { status: 202, headers: OFFICIAL_RESPONSE_HEADERS }
  );
}
