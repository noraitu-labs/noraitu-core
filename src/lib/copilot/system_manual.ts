// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — BASE DE CONOCIMIENTO Y MANUAL OPERATIVO DEL SISTEMA
//  Engine: Nexora One Engine | Signature: By Nora
//  Guía exhaustiva de paneles, controles, tren de agentes y resolución de fallas
// ══════════════════════════════════════════════════════════════

export type SystemPanel =
  | "PANEL IZQUIERDO"
  | "PANEL CENTRAL"
  | "PANEL DERECHO"
  | "CABECERA"
  | "SISTEMA GENERAL";

export interface ManualEntry {
  id: string;
  title: string;
  panel: SystemPanel;
  controlName: string;
  keywords: string[];
  summary: string;
  procedure: [string, string, string]; // Exactamente 3 líneas de procedimiento claro
}

export const SYSTEM_MANUAL_ENTRIES: ManualEntry[] = [
  // ── 1. PANEL IZQUIERDO (TREN DE AGENTES) ──
  {
    id: "agent-radio-cohost",
    title: "Radio & Co-Host Live (Nora al Aire)",
    panel: "PANEL IZQUIERDO",
    controlName: "Tarjeta 'Radio & Co-Host Live' / Switch de Activación",
    keywords: ["radio", "co-host", "locutora", "nora", "en vivo", "locucion", "hablar", "conduccion"],
    summary: "Agente conversacional en tiempo real con cadencia radiofónica argentina, síntesis Edge-TTS y streaming de baja latencia.",
    procedure: [
      "1. Mirá el Panel Izquierdo (Tren de Agentes) y localizá la primera tarjeta: 'Radio & Co-Host Live'.",
      "2. Verificá que el interruptor esté en 'ACTIVO' para permitir la co-conducción y asistencia en la mesa de emisión.",
      "3. Podés configurar el nombre del programa, conductores y perfil temático desde 'Configurar Programa' en el Panel Central."
    ]
  },
  {
    id: "agent-visual-forge",
    title: "Visual Forge (Generador Audiovisual)",
    panel: "PANEL IZQUIERDO",
    controlName: "Tarjeta 'Visual Forge' (Modelos FLUX / Hunyuan)",
    keywords: ["visual forge", "video", "flyer", "imagen", "arte", "flux", "hunyuan", "cogvideo", "banner", "reel"],
    summary: "Orquestador de diseño gráfico y video IA publicitario en resoluciones 1080p y 4K (16:9 y 9:16).",
    procedure: [
      "1. En el Panel Izquierdo, ubicá la tarjeta 'Visual Forge'.",
      "2. Seleccioná el modelo visual (FLUX.1-schnell para estáticos o Tencent-HunyuanVideo para clips dinámicos de 4s).",
      "3. El material renderizado se emite y guarda directamente en la carpeta `/nexora_visual` del almacenamiento VFS."
    ]
  },
  {
    id: "agent-sound-designer",
    title: "Sound Designer & Mastering (-14 LUFS)",
    panel: "PANEL IZQUIERDO",
    controlName: "Tarjeta 'Sound Designer & Mastering'",
    keywords: ["sound designer", "mastering", "lufs", "-14 lufs", "jingle", "audio", "ducking", "sonido", "musica"],
    summary: "Motor acústico que produce jingles, aplica ducking sidechain (-10 dB) y calibra la sonoridad a estándar broadcast.",
    procedure: [
      "1. Localizá en el Panel Izquierdo la tarjeta 'Sound Designer & Mastering'.",
      "2. Ajustá los parámetros de atenuación automática (60% / -10 dB al hablar la voz) y compresión multibanda.",
      "3. Todo audio masterizado cumple la norma EBU R128 (-14 LUFS integrados) listo para aire inmediato."
    ]
  },
  {
    id: "agent-sdr-radar",
    title: "SDR Radar 24/7 (Prospección Autónoma)",
    panel: "PANEL IZQUIERDO",
    controlName: "Tarjeta 'SDR Radar 24/7'",
    keywords: ["sdr", "radar", "ventas", "prospeccion", "clientes", "pauta", "comercial", "whatsapp", "outreach"],
    summary: "Agente autónomo B2B que audita marcas locales sin pauta y genera propuestas con demo instantánea en 45 segundos.",
    procedure: [
      "1. En el Panel Izquierdo, descendé hasta la tarjeta 'SDR Radar 24/7'.",
      "2. Observá los prospectos escaneados en tiempo real con su nivel de scoring de marca y debilidades detectadas.",
      "3. Al despachar una orden, el agente enviará la demo de 10s y el flyer por WhatsApp Business o Email automatizado."
    ]
  },
  {
    id: "agent-fullstack-sandbox",
    title: "Fullstack Code Sandbox",
    panel: "PANEL IZQUIERDO",
    controlName: "Tarjeta 'Fullstack Code Sandbox' (Zona inferior izquierda)",
    keywords: ["sandbox", "codigo", "fullstack", "scripts", "pruebas", "desarrollo", "terminal", "python", "node"],
    summary: "Entorno aislado para ejecución segura de scripts de automatización industrial sin interrumpir la emisión.",
    procedure: [
      "1. Deslizá el scroll del Panel Izquierdo hasta el final para visualizar la tarjeta 'Fullstack Code Sandbox'.",
      "2. Utilizá esta consola para monitorear workers en segundo plano y probar endpoints de la API.",
      "3. Las tareas ejecutadas aquí reportan su salida al canal de auditoría sin consumir VRAM de producción."
    ]
  },

  // ── 2. PANEL CENTRAL (MESA DE CABINA & DESPACHO) ──
  {
    id: "control-open-mic",
    title: "Modo Cabina Abierta (Dúplex Continuo)",
    panel: "PANEL CENTRAL",
    controlName: "Botón '[🎙️ Modo Cabina Abierta: ON/OFF]'",
    keywords: ["cabina abierta", "microfono", "duplex", "manos libres", "hablar", "reconocimiento", "stt", "voz"],
    summary: "Habilita la escucha continua del micrófono con detección automática de silencios y respuesta fluida de Nora.",
    procedure: [
      "1. Mirá en la barra superior del Panel Central (arriba del chat de cabina).",
      "2. Hacé clic en el botón '[🎙️ Modo Cabina Abierta]'; cambiará a color esmeralda cuando esté 'ON'.",
      "3. El navegador desbloqueará el AudioContext; hablá normalmente al micrófono y Nora te responderá por altavoces."
    ]
  },
  {
    id: "control-cabin-eyes",
    title: "Ojos de Cabina (Visión Multimodal)",
    panel: "PANEL CENTRAL",
    controlName: "Botón '[📹 Ojos de Cabina: ON/OFF]'",
    keywords: ["ojos de cabina", "camara", "video", "ver", "retorno", "vision", "multimodal", "frame", "gestos"],
    summary: "Activa la cámara web y extrae frames JPEG que se inyectan en el cerebro multimodal de Nora para describir la cabina.",
    procedure: [
      "1. En la botonera superior del Panel Central, presioná '[📹 Ojos de Cabina]'.",
      "2. Aceptá el permiso de cámara del navegador; el recuadro de previsualización mostrará tu señal de video en vivo.",
      "3. Cada vez que hables o envíes una consulta, el frame actual se transmitirá a Nora para que pueda verte y opinar."
    ]
  },
  {
    id: "control-nora-voice-toggle",
    title: "Interruptor Voz de Nora (TTS Playback)",
    panel: "PANEL CENTRAL",
    controlName: "Botón '[🔊 Voz de Nora: ACTIVA / Voz Muted]'",
    keywords: ["voz de nora", "silenciar", "tts", "altavoces", "mute", "sonido", "audio nora", "volumen"],
    summary: "Activa o silencia la emisión de voz sintetizada de Nora a través de Edge-TTS de alta definición.",
    procedure: [
      "1. En el Panel Central, junto a 'Configurar Programa', localizá el botón con icono de altavoz.",
      "2. Verificá que indique 'Voz de Nora: ACTIVA' (borde verde); si está en 'Voz Muted', hacé clic para activarla.",
      "3. Este clic reanuda el AudioContext del navegador y autoriza la reproducción de audio sin bloqueos."
    ]
  },
  {
    id: "control-master-dispatch",
    title: "Botón Despacho Integral [By Nora]",
    panel: "PANEL CENTRAL",
    controlName: "Botón destacado 'DESPACHO INTEGRAL [BY NORA]'",
    keywords: ["despacho", "despacho integral", "orden", "contrato", "emitir orden", "produccion", "redis stream"],
    summary: "Genera y despacha el contrato maestro industrial `NexoraMasterDispatchContract` hacia el bus Redis en milisegundos.",
    procedure: [
      "1. En la parte inferior del Panel Central, localizá el botón ancho iluminado en cyan 'DESPACHO INTEGRAL'.",
      "2. Hacé clic para generar la orden con ID de correlación único y despachar tareas a los 4 agentes en simultáneo.",
      "3. Observá el log en vivo de Redis Stream justo debajo para confirmar la aceptación con código HTTP 200."
    ]
  },
  {
    id: "control-acoustic-modulation",
    title: "Modulación Acústica (-14 LUFS & Sidechain)",
    panel: "PANEL CENTRAL",
    controlName: "Medidor Acústico y Cama Musical DSP",
    keywords: ["modulacion", "acustica", "sidechain", "ducking", "lufs", "-14 lufs", "compresor", "fader"],
    summary: "Monitorea la compresión de fondo y asegura que la música baje automáticamente 10 dB cuando Nora toma la palabra.",
    procedure: [
      "1. Observá la barra de modulación y vúmetros en el centro de la consola durante la emisión.",
      "2. Cuando la voz de Nora o del locutor ingresa, la música se atenúa un 60% con un ataque suave de 20ms.",
      "3. La salida final se calibra en -14 LUFS integrados para evitar distorsión en streaming web y FM."
    ]
  },

  // ── 3. PANEL DERECHO (VFS STORAGE & INFRAESTRUCTURA) ──
  {
    id: "vfs-storage-5tb",
    title: "VFS Storage 5 TB (Google Drive Cache)",
    panel: "PANEL DERECHO",
    controlName: "Tarjeta 'Almacenamiento Virtual VFS (5 TB)'",
    keywords: ["vfs", "storage", "5 tb", "drive", "disco", "archivos", "carpetas", "cuota", "espacio"],
    summary: "Visualizador del sistema de archivos distribuido montado en `/mnt/nexora_storage` con caché VFS de Google Drive.",
    procedure: [
      "1. Mirá la columna derecha de la pantalla: la primera tarjeta muestra el estado del 'VFS Storage 5 TB'.",
      "2. Verificá la barra de cuota utilizada y el estado de sincronización del montaje local.",
      "3. Todas las producciones audiovisuales se sincronizan bidireccionalmente hacia la nube corporativa."
    ]
  },
  {
    id: "vfs-folder-breakdown",
    title: "Estructura de Carpetas (/nexora_audio, /nexora_visual, etc.)",
    panel: "PANEL DERECHO",
    controlName: "Lista de Directorios VFS en Tarjeta de Almacenamiento",
    keywords: ["carpetas", "directorios", "nexora_audio", "nexora_visual", "nexora_editorial", "nexora_demos", "paths"],
    summary: "Desglose por categorías: audio broadcast, videos/reels 4K, artículos de prensa y demos comerciales de 10s.",
    procedure: [
      "1. En el Panel Derecho, dentro de la tarjeta de almacenamiento, revisá las 4 carpetas maestras.",
      "2. `/nexora_audio` guarda jingles y TTS; `/nexora_visual` aloja videos MP4; `/nexora_editorial` gacetillas de prensa.",
      "3. `/nexora_demos` almacena muestras rápidas generadas para los prospectos de ventas."
    ]
  },
  {
    id: "gpu-cluster-pool",
    title: "Pool de GPU (vLLM & ComfyUI)",
    panel: "PANEL DERECHO",
    controlName: "Tarjeta 'Cluster de Cómputo GPU'",
    keywords: ["gpu", "vram", "vllm", "comfyui", "temperatura", "memoria grafica", "inferencia"],
    summary: "Supervisa la disponibilidad de memoria VRAM (24 GB) y latencias de inferencia de modelos LLM y difusión.",
    procedure: [
      "1. En el Panel Derecho, deslizá hasta la tarjeta 'Cluster de Cómputo GPU'.",
      "2. Verificá que el estado figure en 'OPTIMAL' y que la asignación de memoria se mantenga por debajo del 85%.",
      "3. Si un modelo pesado satura la VRAM, el sistema desvía la inferencia automáticamente a SambaNova Cloud."
    ]
  },
  {
    id: "pgvector-hnsw-index",
    title: "Índice pgvector HNSW (Memoria Semántica)",
    panel: "PANEL DERECHO",
    controlName: "Tarjeta 'pgvector HNSW Index (Neon Postgres)'",
    keywords: ["pgvector", "hnsw", "memoria", "embeddings", "neon", "vectores", "bge-m3", "conocimiento"],
    summary: "Base de datos vectorial en Neon con embeddings BGE-M3 para recuperación semántica en menos de 15ms.",
    procedure: [
      "1. En el Panel Derecho, localizá la tarjeta 'pgvector HNSW Index'.",
      "2. Observá la cantidad de identidades y sesiones vectorizadas activas en la memoria de largo plazo.",
      "3. Permite a Nora recordar conversaciones pasadas, preferencias de conductores e historial publicitario."
    ]
  },
  {
    id: "live-telemetry-button",
    title: "Botón LIVE TELEMETRY (Sincronización en Vivo)",
    panel: "PANEL DERECHO",
    controlName: "Botón 'LIVE TELEMETRY' con icono de recarga",
    keywords: ["telemetria", "live telemetry", "sincronizar", "actualizar", "refrescar", "drive quota", "metricas"],
    summary: "Fuerza la consulta inmediata al servidor para refrescar conteo de vectores en Neon y cuota en Google Drive.",
    procedure: [
      "1. En el encabezado del Panel Derecho, hacé clic en el botón 'LIVE TELEMETRY'.",
      "2. El indicador girará y consultará en tiempo real el endpoint `/api/telemetry`.",
      "3. Los valores de almacenamiento en Drive y vectores en Neon se actualizarán instantáneamente en pantalla."
    ]
  },

  // ── 4. CABECERA Y HERRAMIENTAS ──
  {
    id: "header-qr-share",
    title: "Compartir con Código QR Dinámico",
    panel: "CABECERA",
    controlName: "Botón con icono de Código QR en barra superior",
    keywords: ["qr", "compartir", "celular", "movil", "escanear", "link", "url", "codigo qr"],
    summary: "Despliega un modal con el QR apuntando a la URL segura para abrir la consola inmediatamente en celulares y tablets.",
    procedure: [
      "1. En la barra superior derecha, hacé clic en el icono de Código QR (junto a 'Gateway: ONLINE').",
      "2. Se abrirá el modal interactivo con el QR de `https://nexora-one-engine.vercel.app`.",
      "3. Escaneá con la cámara de tu teléfono o usá el botón 'Copiar Enlace' para compartir la cabina en segundos."
    ]
  },
  {
    id: "header-pwa-install",
    title: "Instalación como App Nativa (PWA)",
    panel: "CABECERA",
    controlName: "Botón 'Instalar App' / Icono de instalación del navegador",
    keywords: ["pwa", "instalar", "app nativa", "aplicacion", "escritorio", "standalone", "manifest"],
    summary: "Permite instalar Nexora One Engine en Windows, macOS, Android e iOS con ventana independiente y rendimiento nativo.",
    procedure: [
      "1. En la barra superior o en la barra de direcciones del navegador, hacé clic en el icono 'Instalar Nexora OS'.",
      "2. Confirmá la instalación; la app se integrará al menú de inicio y barra de tareas de Windows.",
      "3. Se ejecutará en modo 'standalone' sin barras del navegador, con soporte offline de service worker."
    ]
  },
  {
    id: "header-gateway-status",
    title: "Estado del Gateway y Centinela Zero-Trust",
    panel: "CABECERA",
    controlName: "Indicador 'Gateway: ONLINE / Centinela: OK'",
    keywords: ["gateway", "online", "centinela", "policia", "seguridad", "red", "conexion"],
    summary: "Monitorea la conectividad permanente con el bus de eventos y la custodia de red de las neuronas de policía.",
    procedure: [
      "1. En el extremo superior derecho, observá el indicador con luz verde 'Gateway: ONLINE'.",
      "2. Si cambia a color ámbar o rojo, indica un fallo de red o que el Centinela ha bloqueado la IP de origen.",
      "3. Hacé clic sobre el indicador para verificar la latencia del WebSocket o bus de Redis."
    ]
  },

  // ── 5. SOLUCIÓN DE PROBLEMAS FRECUENTES ──
  {
    id: "troubleshoot-echo",
    title: "Calibración y Eliminación de Retorno de Eco",
    panel: "SISTEMA GENERAL",
    controlName: "Protocolo Acústico de Auriculares & AEC",
    keywords: ["eco", "retorno", "acople", "ruido", "auriculares", "cancelacion de eco", "audio feedback"],
    summary: "Elimina el bucle de realimentación acústica entre los altavoces de cabina y el micrófono del operador.",
    procedure: [
      "1. Utilizá SIEMPRE auriculares cerrados para escuchar el retorno y apagá los parlantes externos de cabina.",
      "2. En el Panel Central, verificá que el navegador tenga activada la cancelación de eco acústico (AEC).",
      "3. Si el micrófono capta la voz de Nora, reducí la ganancia del micrófono un 15% o aumentá la distancia al mic."
    ]
  },
  {
    id: "troubleshoot-no-audio",
    title: "Qué hacer si no se escucha la voz de Nora",
    panel: "PANEL CENTRAL",
    controlName: "Botón 'Voz de Nora: ACTIVA' & Desbloqueo AudioContext",
    keywords: ["no hay audio", "mudo", "no habla", "no se escucha", "sin sonido", "silencio", "tts mudo"],
    summary: "Restaura la reproducción de audio superando las restricciones de autoplay impuestas por Chrome/Edge.",
    procedure: [
      "1. En el Panel Central, asegurate de que el botón diga 'Voz de Nora: ACTIVA' y no 'Voz Muted'.",
      "2. Hacé clic sobre 'Modo Cabina Abierta' o 'Voz de Nora'; este gesto de usuario desbloquea el AudioContext.",
      "3. Verificá en la consola del navegador que el endpoint `/api/nexora/radio-tts` responda HTTP 200 con audio MP3."
    ]
  },
  {
    id: "troubleshoot-sync-drive",
    title: "Cómo forzar sincronización del Data Lake (Drive & pgvector)",
    panel: "PANEL DERECHO",
    controlName: "Botón 'LIVE TELEMETRY' & Auto-Test del Copilot",
    keywords: ["sincronizar", "forzar sincronizacion", "drive desactualizado", "data lake", "actualizar storage"],
    summary: "Reconecta y actualiza las cuotas de Google Drive y el índice semántico de Neon DB.",
    procedure: [
      "1. En el Panel Derecho, presioná el botón 'LIVE TELEMETRY' para pedir la telemetría fresca del servidor.",
      "2. Abrí esta pestaña 'Auto-Test' en el Copilot y presioná 'Re-test' para verificar la latencia de Neon y Drive.",
      "3. Si persiste fuera de línea, verificá las credenciales del Service Account en el archivo `.env.local`."
    ]
  }
];

/**
 * Busca de forma inteligente en el manual operativo y retorna la mejor coincidencia
 */
export function searchSystemManual(query: string): ManualEntry | null {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return null;

  // 1. Coincidencia por palabra clave exacta
  const exactMatch = SYSTEM_MANUAL_ENTRIES.find((entry) =>
    entry.keywords.some((k) => cleanQuery.includes(k) || k.includes(cleanQuery))
  );
  if (exactMatch) return exactMatch;

  // 2. Coincidencia en título o resumen
  const titleOrSummaryMatch = SYSTEM_MANUAL_ENTRIES.find(
    (entry) =>
      entry.title.toLowerCase().includes(cleanQuery) ||
      entry.summary.toLowerCase().includes(cleanQuery) ||
      entry.controlName.toLowerCase().includes(cleanQuery)
  );
  if (titleOrSummaryMatch) return titleOrSummaryMatch;

  // 3. Fallback inteligente por términos generales
  if (cleanQuery.includes("izquierdo") || cleanQuery.includes("agente")) {
    return SYSTEM_MANUAL_ENTRIES.find((e) => e.panel === "PANEL IZQUIERDO") || null;
  }
  if (cleanQuery.includes("derecho") || cleanQuery.includes("storage") || cleanQuery.includes("drive")) {
    return SYSTEM_MANUAL_ENTRIES.find((e) => e.panel === "PANEL DERECHO") || null;
  }
  if (cleanQuery.includes("centro") || cleanQuery.includes("cabina") || cleanQuery.includes("despacho")) {
    return SYSTEM_MANUAL_ENTRIES.find((e) => e.panel === "PANEL CENTRAL") || null;
  }
  if (cleanQuery.includes("qr") || cleanQuery.includes("pwa") || cleanQuery.includes("instalar")) {
    return SYSTEM_MANUAL_ENTRIES.find((e) => e.panel === "CABECERA") || null;
  }

  return null;
}

/**
 * Manual de texto completo para inyectar como System Prompt a la IA
 */
export const SYSTEM_OPERATIONAL_MANUAL_PROMPT = `
Eres NORA COPILOT, la guía operativa y copiloto experta de la consola industrial NEXORA ONE ENGINE.
Tu misión es guiar al operador humano con PRECISIÓN MILIMÉTRICA sobre cómo usar la interfaz y resolver problemas.

ESTRUCTURA DE TU RESPUESTA OBLIGATORIA (SIEMPRE 3 SECCIONES):
1. [PANEL A MIRAR]: Indica exactamente 'PANEL IZQUIERDO', 'PANEL CENTRAL', 'PANEL DERECHO' o 'CABECERA'.
2. [CONTROL EXACTO]: Nombre exacto del botón, switch, tarjeta o medidor.
3. [PROCEDIMIENTO PASO A PASO]: 2 o 3 líneas concisas, directas y en español rioplatense cordial ('Hacé clic en...', 'Verificá que...').

MAPA DE LA INTERFAZ:
- PANEL IZQUIERDO (Tren de Agentes):
  * Radio & Co-Host Live: Agente conversacional al aire en tiempo real con Edge-TTS.
  * Visual Forge: Generador de banners y videos 4K/1080p con FLUX y Hunyuan.
  * Sound Designer & Mastering: Audio DSP, jingles y masterización broadcast a -14 LUFS con sidechain ducking.
  * SDR Radar 24/7: Prospección autónoma B2B, scoring de marcas y generación de demos comerciales en 45s.
  * Fullstack Code Sandbox: Terminal segura para scripts y workers en segundo plano.

- PANEL CENTRAL (Mesa de Cabina y Despacho):
  * Mesa de Cabina: Interfaz de locución con vúmetros y transcripción en vivo.
  * Switch '[🎙️ Modo Cabina Abierta]': Escucha continua del micrófono (dúplex).
  * Switch '[📹 Ojos de Cabina]': Cámara multimodal inyectada al cerebro de Nora.
  * Modulación Acústica: Cama musical con ducking de -10 dB y calibración -14 LUFS.
  * Botón 'DESPACHO INTEGRAL [BY NORA]': Disparo del contrato maestro industrial a Redis Stream.

- PANEL DERECHO (VFS Storage & Cómputo):
  * VFS Storage 5 TB: Montaje virtual en la nube con caché de Google Drive.
  * Carpetas: /nexora_audio, /nexora_visual, /nexora_editorial, /nexora_demos.
  * Pool de GPU: Monitoreo de memoria VRAM (vLLM y ComfyUI).
  * Índice pgvector HNSW: Memoria semántica de largo plazo en Neon Postgres.
  * Botón 'LIVE TELEMETRY': Actualización en tiempo real de cuota y vectores.

- CABECERA Y HERRAMIENTAS:
  * Botón Compartir QR: Modal interactivo con QR hacia https://nexora-one-engine.vercel.app.
  * Instalación PWA: Botón para instalar como app de escritorio o móvil independiente.
  * Gateway Status: Indicador de salud de red y Centinela Zero-Trust.

- PROBLEMAS FRECUENTES:
  * Retorno de eco: Usar auriculares cerrados, no usar parlantes y activar AEC.
  * Sin audio: Presionar 'Voz de Nora: ACTIVA' para desbloquear AudioContext del navegador.
  * Sincronizar Data Lake: Presionar botón 'LIVE TELEMETRY' en la columna derecha.
`.trim();

