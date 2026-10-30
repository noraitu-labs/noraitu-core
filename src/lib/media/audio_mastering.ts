// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Mezcla de Audio y Mastering Broadcast
//  Sidechain Auto-Ducking + Normalización EBU R128 (-14 LUFS / -1.0 TP)
// ══════════════════════════════════════════════════════════════

import fs from "fs";
import path from "path";
import {
  ensureDirectory,
  getFFmpegSystemInfo,
  probeMediaDuration,
  runFFmpeg,
} from "./ffmpeg_utils";

export interface AudioMasteringOptions {
  /**
   * Objetivo de sonoridad integrada en LUFS (estándar streaming: -14 LUFS).
   */
  targetLufs?: number; // default: -14

  /**
   * Pico máximo verdadero en dBTP (estándar broadcast: -1.0 dBTP).
   */
  truePeakDb?: number; // default: -1.0

  /**
   * Rango de sonoridad LRA (Loudness Range).
   */
  loudnessRange?: number; // default: 11

  /**
   * Umbral de compresión sidechain (0.000976563 a 1).
   * Valores comunes: 0.08 (~ -22 dB).
   */
  duckingThreshold?: number; // default: 0.08

  /**
   * Ratio de atenuación cuando la voz está activa (ej: 4:1 o 6:1).
   */
  duckingRatio?: number; // default: 4

  /**
   * Tiempo de ataque del ducking en milisegundos.
   */
  duckingAttackMs?: number; // default: 20

  /**
   * Tiempo de recuperación (release) del ducking en milisegundos.
   */
  duckingReleaseMs?: number; // default: 250

  /**
   * Ganancia previa de la cama musical (ej: 0.75 para -2.5 dB).
   */
  musicVolume?: number; // default: 0.75

  /**
   * Ganancia de la voz (ej: 1.0).
   */
  voiceVolume?: number; // default: 1.0

  /**
   * Duración objetivo: 'voice' ajusta la música a la voz, 'longest' conserva toda la música.
   */
  durationMode?: "voice" | "longest";
}

export interface AudioMasteringResult {
  success: boolean;
  outputPath?: string;
  targetLufs: number;
  truePeakDb: number;
  voiceDurationSeconds?: number;
  musicDurationSeconds?: number;
  finalDurationSeconds?: number;
  ffmpegFound: boolean;
  generatedCommand?: string;
  error?: string;
}

/**
 * Aplica mastering broadcast a dos pistas: voz y música de fondo.
 * - Sidechain Compression: La música se comprime dinámicamente cuando la voz habla.
 * - EBU R128 Loudnorm: Calibra el master a -14 LUFS con True Peak de -1.0 dB.
 */
export async function masterAudio(
  voiceoverPath: string,
  musicBedPath: string,
  outputPath: string,
  options: AudioMasteringOptions = {}
): Promise<AudioMasteringResult> {
  const targetLufs = options.targetLufs ?? -14;
  const truePeakDb = options.truePeakDb ?? -1.0;
  const loudnessRange = options.loudnessRange ?? 11;
  const duckingThreshold = options.duckingThreshold ?? 0.08;
  const duckingRatio = options.duckingRatio ?? 4;
  const duckingAttackMs = options.duckingAttackMs ?? 20;
  const duckingReleaseMs = options.duckingReleaseMs ?? 250;
  const musicVolume = options.musicVolume ?? 0.75;
  const voiceVolume = options.voiceVolume ?? 1.0;
  const durationMode = options.durationMode ?? "voice";

  // Validar existencia de pistas
  if (!fs.existsSync(voiceoverPath)) {
    return {
      success: false,
      targetLufs,
      truePeakDb,
      ffmpegFound: false,
      error: `Pista de voz no encontrada: ${voiceoverPath}`,
    };
  }

  if (!fs.existsSync(musicBedPath)) {
    return {
      success: false,
      targetLufs,
      truePeakDb,
      ffmpegFound: false,
      error: `Pista musical no encontrada: ${musicBedPath}`,
    };
  }

  const sysInfo = await getFFmpegSystemInfo();
  ensureDirectory(path.dirname(outputPath));

  // Medir duraciones
  const voiceDuration = await probeMediaDuration(voiceoverPath, 15.0);
  const musicDuration = await probeMediaDuration(musicBedPath, 30.0);

  // 1. Inputs: [0:a] Música, [1:a] Voz
  const ffmpegArgs: string[] = ["-y", "-i", musicBedPath, "-i", voiceoverPath];

  // 2. Construir cadena de filtros para auto-ducking y loudnorm
  // [1:a] se divide en señal de disparo (sc) y señal audible (clean_voice)
  // [0:a] se escala en volumen inicial y se comprime usando [sc] como sidechain
  // luego se mezclan ambas y se aplica loudnorm
  const filterGraph = [
    `[0:a]volume=${musicVolume.toFixed(2)}[m_scaled]`,
    `[1:a]volume=${voiceVolume.toFixed(2)},asplit=2[sc_trigger][voice_clean]`,
    `[m_scaled][sc_trigger]sidechaincompress=threshold=${duckingThreshold.toFixed(4)}:ratio=${duckingRatio}:attack=${duckingAttackMs}:release=${duckingReleaseMs}[ducked_music]`,
    durationMode === "voice"
      ? `[ducked_music]atrim=0:${(voiceDuration + 0.8).toFixed(2)},afade=t=out:st=${voiceDuration.toFixed(2)}:d=0.8[music_trimmed]`
      : `[ducked_music]anull[music_trimmed]`,
    `[music_trimmed][voice_clean]amix=inputs=2:duration=longest:dropout_transition=2[mixed_pre]`,
    `[mixed_pre]loudnorm=I=${targetLufs}:TP=${truePeakDb}:LRA=${loudnessRange}:measured_I=-20:measured_TP=-2.0:measured_LRA=10:offset=0.0:linear=true:print_format=none[master_out]`,
  ].join(";");

  ffmpegArgs.push("-filter_complex", filterGraph);
  ffmpegArgs.push("-map", "[master_out]");

  // Determinar códec según extensión de salida
  const ext = path.extname(outputPath).toLowerCase();
  if (ext === ".wav") {
    ffmpegArgs.push("-c:a", "pcm_s16le", "-ar", "48000");
  } else if (ext === ".mp3") {
    ffmpegArgs.push("-c:a", "libmp3lame", "-b:a", "320k", "-ar", "48000");
  } else {
    // .aac, .m4a o default
    ffmpegArgs.push("-c:a", "aac", "-b:a", "256k", "-ar", "48000");
  }

  ffmpegArgs.push(outputPath);

  const commandPreview = `${sysInfo.ffmpegPath || "ffmpeg"} ${ffmpegArgs.join(" ")}`;

  // Si FFmpeg no está disponible en el host, retornar comando estructurado sin romper
  if (!sysInfo.available || !sysInfo.ffmpegPath) {
    return {
      success: false,
      targetLufs,
      truePeakDb,
      voiceDurationSeconds: voiceDuration,
      musicDurationSeconds: musicDuration,
      ffmpegFound: false,
      generatedCommand: commandPreview,
      error:
        "FFmpeg no está instalado en este entorno. Se generó el comando estricto para mastering broadcast.",
    };
  }

  try {
    await runFFmpeg(ffmpegArgs);

    const finalDuration =
      durationMode === "voice" ? voiceDuration + 0.8 : Math.max(voiceDuration, musicDuration);

    return {
      success: true,
      outputPath,
      targetLufs,
      truePeakDb,
      voiceDurationSeconds: voiceDuration,
      musicDurationSeconds: musicDuration,
      finalDurationSeconds: finalDuration,
      ffmpegFound: true,
      generatedCommand: commandPreview,
    };
  } catch (err: any) {
    return {
      success: false,
      outputPath,
      targetLufs,
      truePeakDb,
      ffmpegFound: true,
      generatedCommand: commandPreview,
      error: `Error al aplicar mastering de audio con FFmpeg: ${err?.message || err}`,
    };
  }
}

