/**
 * NEXORA ONE ENGINE — STRICT TYPESCRIPT CONTRACTS & TENANT ISOLATION TYPES
 * Engine: Nexora One Engine
 * Signature: By Nora
 * Repository: D:\Nora itu UTN (branch: feat/nexora-industrial-engine)
 * Namespace: src/lib/nexora/types.ts
 *
 * CRITICAL INVARIANT:
 * - Zero coupling with academic routes (`src/app/api/nora-*`), Neon `noraitu_logs`,
 *   or MongoDB `nora_itu_db`.
 * - Exclusively serves the Nexora One Engine ecosystem (Signature: By Nora).
 */

export const NEXORA_ENGINE_NAME = "Nexora One Engine" as const;
export const NEXORA_SIGNATURE = "By Nora" as const;

export type NexoraTenantMode = "ACADEMIC_PROTECTED" | "NEXORA_ONE_ENGINE";

export type NexoraBrandScope =
  | "NEXORA_ONE_ENGINE"
  | "NEXORA_AUDIO"
  | "NEXORA_VISUAL"
  | "NEXORA_EDITORIAL"
  | "NEXORA_SDR"
  | "GLOBAL";

export type NexoraDispatchPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";

export type NexoraMissionStatus =
  | "QUEUED"
  | "IN_PROGRESS"
  | "PARTIAL_FAILURE"
  | "COMPLETED"
  | "ABORTED";

export interface NexoraEngineIdentity {
  engine: "Nexora One Engine";
  signature: "By Nora";
}

export interface NexoraDispatchHeader {
  dispatch_id: string;
  correlation_id: string;
  idempotency_key: string;
  issued_by: "NORA_ITU_CORE_COO";
  orchestration_engine: {
    framework: "LANGGRAPH" | "DIFY_ENGINE";
    primary_llm: "qwen2.5-72b-instruct" | "kimi-moonshot-v1-128k";
    fallback_llm: "deepseek-v3" | "qwen2.5-72b-instruct";
    state_checkpoint_uri: string;
  };
  issued_at: string;
  deadline_at: string;
  priority: NexoraDispatchPriority;
  redis_routing: {
    stream_key: "nexora:bus:master_dispatch";
    consumer_group: "cg_nexora_specialists";
    reply_to_stream: "nexora:bus:nora_core_callbacks";
    dead_letter_stream: "nexora:bus:dlq";
    ttl_seconds: number;
  };
}

export interface NexoraClientContext {
  client_id: string;
  legal_name: string;
  brand_name: string;
  industry_vertical: string;
  website_url?: string;
  target_audience: {
    geo_region: string;
    age_range: [number, number];
    socioeconomic_segments: string[];
    key_pain_points: string[];
  };
  brand_assets: {
    logo_vfs_path?: string;
    primary_hex_color: string;
    secondary_hex_color: string;
    tone_of_voice:
      | "CORPORATE_AUTHORITATIVE"
      | "DYNAMIC_COMMERCIAL"
      | "URGENT_NEWS"
      | "WARM_LOCAL"
      | "DISRUPTIVE_TECH";
  };
  vector_namespace: string;
}

export interface NexoraStorageBindings {
  vfs_mount_root: "/mnt/nexora_storage";
  models_weights_dir: "/mnt/nexora_storage/models_weights";
  nexora_audio_dir: "/mnt/nexora_storage/media_production/nexora_audio";
  nexora_visual_dir: "/mnt/nexora_storage/media_production/nexora_visual";
  nexora_editorial_dir: "/mnt/nexora_storage/media_production/nexora_editorial";
  nexora_demos_dir: "/mnt/nexora_storage/media_production/nexora_demos";
  code_sandbox_dir: "/mnt/nexora_storage/code_sandbox";
  vector_memory_dir: "/mnt/nexora_storage/vector_memory";
}

export interface NexoraCommercialSpotWorkstream {
  task_id: string;
  assigned_agents: Array<"AGENT_MULTIMEDIA_FACTORY" | "AGENT_LIVE_RADIO_BY_NORA">;
  execution_mode: "PARALLEL_DAG";
  creative_brief: {
    campaign_hook: string;
    script_voiceover_text: string;
    call_to_action: string;
    duration_seconds: 10 | 15 | 20 | 30 | 45 | 60;
  };
  visual_pipeline: {
    comfyui_endpoint: "http://nexora-comfyui:8188/prompt";
    image_generator_model: "FLUX.1-schnell" | "Kolors-v1.0";
    video_generator_model: "Tencent-HunyuanVideo" | "CogVideoX-5B";
    resolution: "3840x2160" | "1920x1080" | "1080x1920";
    fps: 24 | 30 | 60;
    Prompts: {
      positive_prompt: string;
      negative_prompt: string;
      typography_overlay_text: string;
    };
  };
  audio_pipeline: {
    tts_engine: "CosyVoice-300M-Instruct" | "ChatTTS-Production";
    voice_profile_id: string;
    prosody_tags: Array<
      | "[breath]"
      | "[laughter]"
      | "[pause_short]"
      | "[emphasis]"
      | "[radio_announcer_warm]"
    >;
    musicgen_model: "facebook/musicgen-stereo-large" | "facebook/musicgen-medium";
    musicgen_prompt: string;
    target_lufs: number;
  };
  ffmpeg_mastering: {
    video_codec: "libx264" | "libx265" | "prores_ks";
    audio_codec: "pcm_s24le" | "flac" | "aac";
    sidechain_ducking_db: number;
    output_spot_vfs_path: string;
    output_audio_master_vfs_path: string;
  };
}

export interface NexoraEditorialWorkstream {
  task_id: string;
  assigned_agent: "AGENT_EDITORIAL_BY_NORA";
  llm_routing: {
    drafting_model: "deepseek-v3" | "qwen2.5-72b-instruct";
    fact_check_model: "qwen2.5-72b-instruct" | "deepseek-v3";
    temperature: number;
  };
  editorial_directive: {
    article_category:
      | "ECONOMIA_NEGOCIOS"
      | "SOCIEDAD"
      | "TECNOLOGIA"
      | "REGIONALES"
      | "PUBLINOTA_PATROCINADA";
    angle_headline: string;
    wire_sources_to_monitor: string[];
    required_word_count: number;
    seo_keywords: string[];
    journalistic_format:
      | "INVERTED_PYRAMID"
      | "INVESTIGATIVE_FEATURE"
      | "BRANDED_CONTENT_ANALYSIS"
      | "BREAKING_FLASH";
  };
  cms_delivery_spec: {
    target_cms_endpoint: string;
    publish_mode: "DRAFT_REVIEW" | "SCHEDULED" | "IMMEDIATE_LIVE";
    structured_schema_org_type:
      | "NewsArticle"
      | "ReportageNewsArticle"
      | "AdvertiserContentArticle";
    generate_live_bulletin_summary: boolean;
  };
  media_assets_binding: {
    infographic_vfs_output_path: string;
    social_reel_vfs_output_path: string;
  };
}

export interface NexoraSDRProspectingWorkstream {
  task_id: string;
  assigned_agent: "AGENT_GROWTH_NORA_SDR";
  n8n_webhook_trigger_url: string;
  reasoning_model: "deepseek-v3";
  prospect_audit_target: {
    prospect_company_name: string;
    decision_maker_role: string;
    contact_channels: {
      whatsapp_e164?: string;
      email?: string;
      linkedin_url?: string;
      instagram_handle?: string;
    };
    detected_brand_weaknesses: Array<
      | "NO_ACTIVE_RADIO_SPOTS"
      | "LOW_RESOLUTION_VISUAL_IDENTITY"
      | "ABSENT_LOCAL_PRESS_COVERAGE"
      | "OUTDATED_WEB_PRESENCE"
      | "NO_SHORT_FORM_VIDEO_REELS"
    >;
    missing_media_presence: string;
  };
  instant_demo_generation: {
    demo_type: "JINGLE_10S_AND_FLYER" | "JINGLE_10S_ONLY" | "BRANDED_FLYER_ONLY";
    max_generation_latency_seconds: number;
    jingle_duration_seconds: 10;
    demo_jingle_vfs_path: string;
    demo_flyer_vfs_path: string;
  };
  outreach_sequence: {
    primary_channel:
      | "WHATSAPP_BUSINESS_API"
      | "SMTP_PERSONALIZED"
      | "INSTAGRAM_DM"
      | "LINKEDIN_INMAIL";
    fallback_channel: "SMTP_PERSONALIZED" | "WHATSAPP_BUSINESS_API";
    bundled_offer_packages: Array<
      | "NEXORA_RADIO_ROTATION_30_SPOTS"
      | "NEXORA_EDITORIAL_SPONSORED_FEATURE"
      | "NEXORA_FULLSTACK_LANDING_PAGE"
      | "NEXORA_CREATIVE_MONTHLY_RETAINER"
    >;
    pricing_tier_anchor_usd: number;
    max_autonomous_discount_pct: number;
  };
  objection_handling_policy: {
    rag_vector_collection: "sdr_growth.objection_playbooks_embeddings";
    max_autonomous_turns: number;
    human_escalation_threshold_score: number;
    closing_payment_link_provider:
      | "MERCADOPAGO_API"
      | "STRIPE_CHECKOUT"
      | "BANK_WIRE_INVOICE";
  };
}

export interface NexoraMasterDispatchContract {
  schema_version: "2.0.0";
  engine_identity: NexoraEngineIdentity;
  dispatch_header: NexoraDispatchHeader;
  client_context: NexoraClientContext;
  storage_bindings: NexoraStorageBindings;
  workstreams: {
    commercial_spot_production: NexoraCommercialSpotWorkstream;
    nexora_editorial_production: NexoraEditorialWorkstream;
    sdr_autonomous_prospecting: NexoraSDRProspectingWorkstream;
  };
  governance_and_telemetry: {
    require_nora_quality_gate: true;
    retry_policy: {
      max_retries: number;
      backoff_strategy: "EXPONENTIAL_JITTER" | "LINEAR";
      initial_delay_ms: number;
    };
    vector_audit_logging: {
      enabled: true;
      pg_table: "nora_core.semantic_memory";
      embedding_model: "bge-m3" | "text-embedding-3-large" | "qwen2.5-embed";
    };
  };
}
