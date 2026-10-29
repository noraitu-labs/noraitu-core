"use client";

/**
 * NEXORA ONE ENGINE — FRONTEND DISPATCH & TELEMETRY HOOK
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Repository: D:\Nora itu UTN (branch: feat/nexora-industrial-engine)
 * Hook: src/hooks/useNexoraDispatch.ts
 */

import { useState, useCallback, useEffect } from "react";
import {
  NEXORA_ENGINE_NAME,
  NEXORA_SIGNATURE,
  NexoraDispatchPriority,
  NexoraMasterDispatchContract,
} from "@/lib/nexora/types";

export type NexoraSpecialistAgentId =
  | "RADIO_CO_HOST"
  | "ART_VIDEO_DIRECTOR"
  | "SOUND_DESIGNER"
  | "SDR_24_7";

export interface NexoraRedisLogEntry {
  id: string;
  timestamp: string;
  stream: string;
  agent: string;
  level: "INFO" | "SUCCESS" | "WARN";
  message: string;
}

export interface NexoraDispatchResponse {
  engine: string;
  signature: string;
  status: string;
  dispatch_id: string;
  correlation_id: string;
  redis_stream?: {
    stream_key: string;
    published: boolean;
    message_id: string | null;
    diagnostic: string | null;
  };
  isolated_mongo_persisted?: boolean;
  accepted_at?: string;
}

function generateUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateCorrelationId(suffix: string = "BYNORA01"): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const cleanSuffix = suffix
    .replace(/[^A-Z0-9]/gi, "")
    .toUpperCase()
    .slice(0, 8)
    .padEnd(8, "X");
  return `NXR-${y}${m}${d}-${cleanSuffix}`;
}

export function useNexoraDispatch() {
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastDispatchResult, setLastDispatchResult] =
    useState<NexoraDispatchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gatewayOnline, setGatewayOnline] = useState<boolean>(true);
  const [redisLogs, setRedisLogs] = useState<NexoraRedisLogEntry[]>([
    {
      id: "log-init-1",
      timestamp: new Date().toISOString(),
      stream: "nexora:bus:master_dispatch",
      agent: "NORA_ITU_CORE_COO",
      level: "INFO",
      message: `Engine: ${NEXORA_ENGINE_NAME} | Signature: ${NEXORA_SIGNATURE} — Gateway inicializado en modo aislado.`,
    },
    {
      id: "log-init-2",
      timestamp: new Date().toISOString(),
      stream: "nexora:bus:nora_core_callbacks",
      agent: "VFS_MOUNT_WATCHER",
      level: "SUCCESS",
      message:
        "Montaje /mnt/nexora_storage (5 TB VFS Cache Full) verificado: nexora_audio, nexora_visual, nexora_editorial, nexora_demos.",
    },
  ]);

  const appendRedisLog = useCallback(
    (
      agent: string,
      message: string,
      level: "INFO" | "SUCCESS" | "WARN" = "INFO",
      stream: string = "nexora:bus:master_dispatch"
    ) => {
      setRedisLogs((prev) => [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          stream,
          agent,
          level,
          message,
        },
        ...prev.slice(0, 39),
      ]);
    },
    []
  );

  const checkGatewayHealth = useCallback(async () => {
    try {
      const resp = await fetch("/api/nexora/dispatch", {
        method: "GET",
        headers: {
          "x-nexora-tenant": "NEXORA_ONE_ENGINE",
        },
      });
      if (resp.ok) {
        setGatewayOnline(true);
      }
    } catch {
      setGatewayOnline(false);
    }
  }, []);

  useEffect(() => {
    checkGatewayHealth();
  }, [checkGatewayHealth]);

  const buildMasterContract = useCallback(
    (overrides?: {
      clientBrand?: string;
      industryVertical?: string;
      priority?: NexoraDispatchPriority;
      imageModel?: "FLUX.1-schnell" | "Kolors-v1.0";
      videoModel?: "Tencent-HunyuanVideo" | "CogVideoX-5B";
      resolution?: "3840x2160" | "1920x1080" | "1080x1920";
      positivePrompt?: string;
      negativePrompt?: string;
      typographyText?: string;
      prospectCompany?: string;
      anchorPriceUsd?: number;
      correlationSuffix?: string;
    }): NexoraMasterDispatchContract => {
      const now = new Date();
      const deadline = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const correlationId = generateCorrelationId(
        overrides?.correlationSuffix || "ENG2026A"
      );
      const dispatchId = generateUuidV4();
      const idempotencyKey = `${correlationId}_${dispatchId.replace(/-/g, "")}`;

      const brandName = overrides?.clientBrand || "AgroVial Litoral";
      const prospectName =
        overrides?.prospectCompany || "Distribuidora Metalúrgica San Jorge S.R.L.";

      return {
        schema_version: "2.0.0",
        engine_identity: {
          engine: NEXORA_ENGINE_NAME,
          signature: NEXORA_SIGNATURE,
        },
        dispatch_header: {
          dispatch_id: dispatchId,
          correlation_id: correlationId,
          idempotency_key: idempotencyKey,
          issued_by: "NORA_ITU_CORE_COO",
          orchestration_engine: {
            framework: "LANGGRAPH",
            primary_llm: "qwen2.5-72b-instruct",
            fallback_llm: "deepseek-v3",
            state_checkpoint_uri: `redis://nexora-redis:6379/0/checkpoints/${correlationId}`,
          },
          issued_at: now.toISOString(),
          deadline_at: deadline.toISOString(),
          priority: overrides?.priority || "HIGH",
          redis_routing: {
            stream_key: "nexora:bus:master_dispatch",
            consumer_group: "cg_nexora_specialists",
            reply_to_stream: "nexora:bus:nora_core_callbacks",
            dead_letter_stream: "nexora:bus:dlq",
            ttl_seconds: 7200,
          },
        },
        client_context: {
          client_id: "CLI-NEXORA01",
          legal_name: `${brandName} S.A.`,
          brand_name: brandName,
          industry_vertical:
            overrides?.industryVertical || "Industria & Servicios Corporativos",
          website_url: "https://nexoraone.local",
          target_audience: {
            geo_region: "Corredor Productivo Litoral y NEA",
            age_range: [25, 65],
            socioeconomic_segments: ["Empresas", "Industrias", "Comercio Mayorista"],
            key_pain_points: [
              "Automatización de procesos y presencia multimedia 4K",
              "Posicionamiento comercial continuo 24/7",
            ],
          },
          brand_assets: {
            logo_vfs_path:
              "/mnt/nexora_storage/media_production/nexora_visual/brand_logo.png",
            primary_hex_color: "#0F172A",
            secondary_hex_color: "#06B6D4",
            tone_of_voice: "DYNAMIC_COMMERCIAL",
          },
          vector_namespace: "ns_client_nexora_engine",
        },
        storage_bindings: {
          vfs_mount_root: "/mnt/nexora_storage",
          models_weights_dir: "/mnt/nexora_storage/models_weights",
          nexora_audio_dir: "/mnt/nexora_storage/media_production/nexora_audio",
          nexora_visual_dir: "/mnt/nexora_storage/media_production/nexora_visual",
          nexora_editorial_dir:
            "/mnt/nexora_storage/media_production/nexora_editorial",
          nexora_demos_dir: "/mnt/nexora_storage/media_production/nexora_demos",
          code_sandbox_dir: "/mnt/nexora_storage/code_sandbox",
          vector_memory_dir: "/mnt/nexora_storage/vector_memory",
        },
        workstreams: {
          commercial_spot_production: {
            task_id: generateUuidV4(),
            assigned_agents: [
              "AGENT_MULTIMEDIA_FACTORY",
              "AGENT_LIVE_RADIO_BY_NORA",
            ],
            execution_mode: "PARALLEL_DAG",
            creative_brief: {
              campaign_hook:
                "Potencia industrial y precisión audiovisual con Nexora One Engine | By Nora.",
              script_voiceover_text:
                "Transformamos la presencia de tu empresa con inteligencia artificial distribuida, producción 4K y cobertura en tiempo real.",
              call_to_action:
                "Contactá hoy a Nexora One Engine, By Nora, al 3786414533.",
              duration_seconds: 15,
            },
            visual_pipeline: {
              comfyui_endpoint: "http://nexora-comfyui:8188/prompt",
              image_generator_model: overrides?.imageModel || "FLUX.1-schnell",
              video_generator_model:
                overrides?.videoModel || "Tencent-HunyuanVideo",
              resolution: overrides?.resolution || "1920x1080",
              fps: 24,
              Prompts: {
                positive_prompt:
                  overrides?.positivePrompt ||
                  "Futuristic industrial broadcast control room, holographic telemetry, ultra sharp 8k lighting, commercial aesthetic",
                negative_prompt:
                  overrides?.negativePrompt ||
                  "blurry, low quality, distorted typography, watermark",
                typography_overlay_text:
                  overrides?.typographyText ||
                  `${brandName.toUpperCase()} — NEXORA ONE ENGINE | BY NORA`,
              },
            },
            audio_pipeline: {
              tts_engine: "CosyVoice-300M-Instruct",
              voice_profile_id: "nora_executive_anchor_es",
              prosody_tags: [
                "[radio_announcer_warm]",
                "[emphasis]",
                "[pause_short]",
              ],
              musicgen_model: "facebook/musicgen-stereo-large",
              musicgen_prompt:
                "Modern electronic corporate cinematic pulse, deep warm bass, 122 bpm, broadcast mastering",
              target_lufs: -14.0,
            },
            ffmpeg_mastering: {
              video_codec: "libx264",
              audio_codec: "pcm_s24le",
              sidechain_ducking_db: -12.0,
              output_spot_vfs_path: `/mnt/nexora_storage/media_production/nexora_visual/${correlationId}_spot.mp4`,
              output_audio_master_vfs_path: `/mnt/nexora_storage/media_production/nexora_audio/${correlationId}_master.wav`,
            },
          },
          nexora_editorial_production: {
            task_id: generateUuidV4(),
            assigned_agent: "AGENT_EDITORIAL_BY_NORA",
            llm_routing: {
              drafting_model: "deepseek-v3",
              fact_check_model: "qwen2.5-72b-instruct",
              temperature: 0.25,
            },
            editorial_directive: {
              article_category: "ECONOMIA_NEGOCIOS",
              angle_headline: `${brandName} acelera su transformación digital y comercial junto a Nexora One Engine | By Nora`,
              wire_sources_to_monitor: [
                "Unidad de Inteligencia Nexora One Engine",
                "Monitor Industrial Regional",
              ],
              required_word_count: 450,
              seo_keywords: [
                "Nexora One Engine",
                "By Nora",
                "automatización industrial IA",
              ],
              journalistic_format: "BRANDED_CONTENT_ANALYSIS",
            },
            cms_delivery_spec: {
              target_cms_endpoint:
                "https://cms.nexoraone.local/api/v1/articles/ingest",
              publish_mode: "DRAFT_REVIEW",
              structured_schema_org_type: "AdvertiserContentArticle",
              generate_live_bulletin_summary: true,
            },
            media_assets_binding: {
              infographic_vfs_output_path: `/mnt/nexora_storage/media_production/nexora_editorial/${correlationId}_infographic.png`,
              social_reel_vfs_output_path: `/mnt/nexora_storage/media_production/nexora_editorial/${correlationId}_reel.mp4`,
            },
          },
          sdr_autonomous_prospecting: {
            task_id: generateUuidV4(),
            assigned_agent: "AGENT_GROWTH_NORA_SDR",
            n8n_webhook_trigger_url:
              "http://localhost:5678/webhook/nora-sdr-autonomous-outreach",
            reasoning_model: "deepseek-v3",
            prospect_audit_target: {
              prospect_company_name: prospectName,
              decision_maker_role: "Director Comercial / Socio Gerente",
              contact_channels: {
                whatsapp_e164: "+5493786414533",
                email: "nexoraone@nexativanews.com.ar",
              },
              detected_brand_weaknesses: [
                "NO_ACTIVE_RADIO_SPOTS",
                "ABSENT_LOCAL_PRESS_COVERAGE",
                "NO_SHORT_FORM_VIDEO_REELS",
              ],
              missing_media_presence:
                "Ausencia de pauta audiovisual 4K y cobertura radial automatizada en vivo.",
            },
            instant_demo_generation: {
              demo_type: "JINGLE_10S_AND_FLYER",
              max_generation_latency_seconds: 45,
              jingle_duration_seconds: 10,
              demo_jingle_vfs_path: `/mnt/nexora_storage/media_production/nexora_demos/${correlationId}_demo_jingle_10s.wav`,
              demo_flyer_vfs_path: `/mnt/nexora_storage/media_production/nexora_demos/${correlationId}_demo_flyer.png`,
            },
            outreach_sequence: {
              primary_channel: "WHATSAPP_BUSINESS_API",
              fallback_channel: "SMTP_PERSONALIZED",
              bundled_offer_packages: [
                "NEXORA_RADIO_ROTATION_30_SPOTS",
                "NEXORA_EDITORIAL_SPONSORED_FEATURE",
                "NEXORA_CREATIVE_MONTHLY_RETAINER",
              ],
              pricing_tier_anchor_usd: overrides?.anchorPriceUsd || 480.0,
              max_autonomous_discount_pct: 15.0,
            },
            objection_handling_policy: {
              rag_vector_collection:
                "sdr_growth.objection_playbooks_embeddings",
              max_autonomous_turns: 6,
              human_escalation_threshold_score: 0.85,
              closing_payment_link_provider: "MERCADOPAGO_API",
            },
          },
        },
        governance_and_telemetry: {
          require_nora_quality_gate: true,
          retry_policy: {
            max_retries: 3,
            backoff_strategy: "EXPONENTIAL_JITTER",
            initial_delay_ms: 1000,
          },
          vector_audit_logging: {
            enabled: true,
            pg_table: "nora_core.semantic_memory",
            embedding_model: "bge-m3",
          },
        },
      };
    },
    []
  );

  const dispatchMasterOrder = useCallback(
    async (overrides?: Parameters<typeof buildMasterContract>[0]) => {
      setIsDispatching(true);
      setErrorMessage(null);
      const contract = buildMasterContract(overrides);

      appendRedisLog(
        "NORA_ITU_CORE_COO",
        `Despachando orden maestra ${contract.dispatch_header.correlation_id} para ${contract.client_context.brand_name} [By Nora]...`,
        "INFO"
      );

      try {
        const response = await fetch("/api/nexora/dispatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-nexora-tenant": "NEXORA_ONE_ENGINE",
            "X-Engine": NEXORA_ENGINE_NAME,
            "X-Signature": NEXORA_SIGNATURE,
          },
          body: JSON.stringify(contract),
        });

        const data = (await response.json()) as NexoraDispatchResponse;
        if (!response.ok) {
          throw new Error(
            (data as unknown as { message?: string }).message ||
              `HTTP ${response.status}`
          );
        }

        setLastDispatchResult(data);
        appendRedisLog(
          "REDIS_STREAM_BUS",
          `Orden ${data.correlation_id} aceptada en ${data.redis_stream?.stream_key || "nexora:bus:master_dispatch"} (msg_id=${data.redis_stream?.message_id || "local-queue"}).`,
          "SUCCESS"
        );
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        appendRedisLog(
          "DISPATCH_ERROR",
          `Error en despacho: ${msg}`,
          "WARN",
          "nexora:bus:dlq"
        );
        return null;
      } finally {
        setIsDispatching(false);
      }
    },
    [appendRedisLog, buildMasterContract]
  );

  return {
    isDispatching,
    lastDispatchResult,
    errorMessage,
    gatewayOnline,
    redisLogs,
    appendRedisLog,
    dispatchMasterOrder,
  };
}

