// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Ensamble de Video y Transiciones (Video Stitcher)
//  Normalización 1080p (16:9 o 9:16), transiciones xfade y MP4 Web
// ══════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import {
  ensureDirectory,
  getFFmpegSystemInfo,
  probeMediaDuration,
  runFFmpeg,
} from "./ffmpeg_utils";

export type AspectRatio = "16:9" | "9:16";
export type XFadeTransition = "fade" | "dissolve" | "wipeleft" | "wiperight" | "circlecrop";

export interface VideoStitchOptions {
  aspectRatio?: AspectRatio;
  transitionType?: XFadeTransition;
  transitionDuration?: number; // segundos (default: 0.5s)
  fps?: number; // default: 30
  crf?: number; // default: 22
  preset?: "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" | "medium";
  includeAudio?: boolean; // default: true
}

export interface VideoStitchResult {
  success: boolean;
  outputPath?: string;
  durationSeconds?: number;
  totalClips: number;
  aspectRatio: AspectRatio;
  resolution: { width: number; height: number };
  ffmpegFound: boolean;
  generatedCommand?: string;
  error?: string;
}

/**
 * Normaliza y concatena múltiples clips de video con transiciones xfade broadcast.
 * Exporta en MP4 H.264 / AAC con atom faststart optimizado para streaming web.
 */
export async function stitchVideos(
  videoPaths: string[],
  outputPath: string,
  options: VideoStitchOptions = {}
): Promise<VideoStitchResult> {
  const aspectRatio: AspectRatio = options.aspectRatio ?? "16:9";
  const transitionType: XFadeTransition = options.transitionType ?? "fade";
  const transitionDuration = options.transitionDuration ?? 0.5;
  const fps = options.fps ?? 30;
  const crf = options.crf ?? 22;
  const preset = options.preset ?? "fast";
  const includeAudio = options.includeAudio ?? true;

  const width = aspectRatio === "16:9" ? 1920 : 1080;
  const height = aspectRatio === "16:9" ? 1080 : 1920;

  if (!videoPaths || videoPaths.length === 0) {
    return {
      success: false,
      totalClips: 0,
      aspectRatio,
      resolution: { width, height },
      ffmpegFound: false,
      error: "Se requiere al menos una ruta de video para el ensamble.",
    };
  }

  // Verificar existencia de archivos de origen
  const missingFiles = videoPaths.filter((p) => !fs.existsSync(p));
  if (missingFiles.length > 0) {
    return {
      success: false,
      totalClips: videoPaths.length,
      aspectRatio,
      resolution: { width, height },
      ffmpegFound: false,
      error: `Archivos de video no encontrados: ${missingFiles.join(", ")}`,
    };
  }

  const sysInfo = await getFFmpegSystemInfo();
  ensureDirectory(path.dirname(outputPath));

  // 1. Probar duraciones de cada clip
  const clipDurations: number[] = [];
  for (const clipPath of videoPaths) {
    const dur = await probeMediaDuration(clipPath, 5.0);
    clipDurations.push(dur);
  }

  // 2. Construir argumentos e Inputs de FFmpeg
  const ffmpegArgs: string[] = ["-y"];

  for (const clipPath of videoPaths) {
    ffmpegArgs.push("-i", clipPath);
  }

  // 3. Filtro complejo para escala uniforme y transiciones xfade
  const filterParts: string[] = [];
  const scalePadFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps}`;

  // Normalizar escala de cada stream
  for (let i = 0; i < videoPaths.length; i++) {
    filterParts.push(`[${i}:v]${scalePadFilter}[v${i}]`);
  }

  let finalVideoStream = "[v0]";
  let currentOffset = 0;

  if (videoPaths.length === 1) {
    finalVideoStream = "[v0]";
  } else {
    let lastOut = "[v0]";
    currentOffset = clipDurations[0] - transitionDuration;

    for (let i = 1; i < videoPaths.length; i++) {
      const nextOut = i === videoPaths.length - 1 ? "[vout]" : `[x${i}]`;
      const offset = Math.max(0.1, currentOffset);
      filterParts.push(
        `${lastOut}[v${i}]xfade=transition=${transitionType}:duration=${transitionDuration}:offset=${offset.toFixed(2)}${nextOut}`
      );
      lastOut = nextOut;

      if (i < videoPaths.length - 1) {
        currentOffset += clipDurations[i] - transitionDuration;
      }
    }
    finalVideoStream = "[vout]";
  }

  const filterComplex = filterParts.join(";");
  ffmpegArgs.push("-filter_complex", filterComplex);
  ffmpegArgs.push("-map", finalVideoStream);

  if (includeAudio) {
    // Si se incluye audio, tomar el audio del primer input o mezclar
    ffmpegArgs.push("-c:a", "aac", "-b:a", "192k");
  } else {
    ffmpegArgs.push("-an");
  }

  // Códec H.264 para compatibilidad universal web / mobile
  ffmpegArgs.push(
    "-c:v",
    "libx264",
    "-preset",
    preset,
    "-crf",
    String(crf),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    outputPath
  );

  const commandPreview = `${sysInfo.ffmpegPath || "ffmpeg"} ${ffmpegArgs.join(" ")}`;

  // 4. Si el binario FFmpeg no está disponible en el host, responder con reporte descriptivo
  if (!sysInfo.available || !sysInfo.ffmpegPath) {
    return {
      success: false,
      totalClips: videoPaths.length,
      aspectRatio,
      resolution: { width, height },
      ffmpegFound: false,
      generatedCommand: commandPreview,
      error:
        "FFmpeg no está instalado en este entorno. Se generó el comando estricto para ejecución en el contenedor multimedia.",
    };
  }

  try {
    await runFFmpeg(ffmpegArgs);

    const totalDuration =
      clipDurations.reduce((a, b) => a + b, 0) -
      (videoPaths.length - 1) * transitionDuration;

    return {
      success: true,
      outputPath,
      durationSeconds: Math.max(0, totalDuration),
      totalClips: videoPaths.length,
      aspectRatio,
      resolution: { width, height },
      ffmpegFound: true,
      generatedCommand: commandPreview,
    };
  } catch (err: any) {
    return {
      success: false,
      outputPath,
      totalClips: videoPaths.length,
      aspectRatio,
      resolution: { width, height },
      ffmpegFound: true,
      generatedCommand: commandPreview,
      error: `Error al ensamblar video con FFmpeg: ${err?.message || err}`,
    };
  }
}

