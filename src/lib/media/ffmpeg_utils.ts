// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — FFmpeg Engine Utilities & System Discovery
//  Soporte multiplataforma, detección segura y manejo de fallbacks
// ══════════════════════════════════════════════════════════════

import { execFile, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface FFmpegSystemInfo {
  available: boolean;
  ffmpegPath: string | null;
  ffprobePath: string | null;
  version?: string;
  error?: string;
}

let cachedInfo: FFmpegSystemInfo | null = null;

/**
 * Detecta y valida la disponibilidad de los binarios FFmpeg y FFprobe en el sistema.
 * Inspecciona variables de entorno (FFMPEG_PATH, FFPROBE_PATH) y el PATH del sistema operativo.
 */
export async function getFFmpegSystemInfo(): Promise<FFmpegSystemInfo> {
  if (cachedInfo) {
    return cachedInfo;
  }

  const customFfmpeg = (process.env.FFMPEG_PATH || "").trim();
  const customFfprobe = (process.env.FFPROBE_PATH || "").trim();

  // Candidatos para ffmpeg
  const ffmpegCandidates = [
    customFfmpeg,
    "ffmpeg",
    "ffmpeg.exe",
    path.join(process.cwd(), "bin", "ffmpeg.exe"),
    "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe",
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
  ].filter(Boolean);

  let resolvedFfmpeg: string | null = null;
  let ffmpegVersion: string | undefined;

  for (const candidate of ffmpegCandidates) {
    try {
      const { stdout } = await execFileAsync(candidate, ["-version"], { timeout: 3000 });
      resolvedFfmpeg = candidate;
      const firstLine = stdout.split("\n")[0] || "";
      ffmpegVersion = firstLine.trim();
      break;
    } catch {
      // Continuar búsqueda
    }
  }

  // Candidatos para ffprobe
  const ffprobeCandidates = [
    customFfprobe,
    "ffprobe",
    "ffprobe.exe",
    path.join(process.cwd(), "bin", "ffprobe.exe"),
    "C:\\ProgramData\\chocolatey\\bin\\ffprobe.exe",
    "C:\\ffmpeg\\bin\\ffprobe.exe",
  ].filter(Boolean);

  let resolvedFfprobe: string | null = null;

  for (const candidate of ffprobeCandidates) {
    try {
      await execFileAsync(candidate, ["-version"], { timeout: 3000 });
      resolvedFfprobe = candidate;
      break;
    } catch {
      // Continuar búsqueda
    }
  }

  if (!resolvedFfmpeg) {
    cachedInfo = {
      available: false,
      ffmpegPath: null,
      ffprobePath: null,
      error:
        "El binario FFmpeg no se encuentra en el PATH del sistema ni en FFMPEG_PATH. Asegúrese de instalar FFmpeg en el host o contenedor.",
    };
    return cachedInfo;
  }

  cachedInfo = {
    available: true,
    ffmpegPath: resolvedFfmpeg,
    ffprobePath: resolvedFfprobe,
    version: ffmpegVersion,
  };

  return cachedInfo;
}

/**
 * Ejecuta un comando FFmpeg de manera asíncrona controlada con timeout y captura de streams.
 */
export async function runFFmpeg(
  args: string[],
  options: { timeoutMs?: number; workingDir?: string } = {}
): Promise<{ stdout: string; stderr: string }> {
  const info = await getFFmpegSystemInfo();
  if (!info.available || !info.ffmpegPath) {
    throw new Error(info.error || "FFmpeg no disponible en el sistema.");
  }

  const timeoutMs = options.timeoutMs ?? 120_000; // 2 minutos por defecto

  return new Promise((resolve, reject) => {
    const proc = spawn(info.ffmpegPath!, args, {
      cwd: options.workingDir,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`FFmpeg timeout excedido (${timeoutMs} ms). Stderr: ${stderr.slice(-300)}`));
    }, timeoutMs);

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(
          new Error(
            `FFmpeg finalizó con código de salida ${code}. Stderr: ${stderr.slice(-600)}`
          )
        );
      }
    });
  });
}

/**
 * Obtiene la duración exacta de un archivo de video/audio en segundos.
 * Si ffprobe no está disponible, utiliza el fallback proporcionado o estima en base a tamaño.
 */
export async function probeMediaDuration(
  filePath: string,
  fallbackSeconds = 5.0
): Promise<number> {
  const info = await getFFmpegSystemInfo();
  if (info.ffprobePath && fs.existsSync(filePath)) {
    try {
      const { stdout } = await execFileAsync(
        info.ffprobePath,
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          filePath,
        ],
        { timeout: 5000 }
      );
      const parsed = parseFloat(stdout.trim());
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    } catch {
      // Continuar a fallback
    }
  }

  return fallbackSeconds;
}

/**
 * Asegura la existencia de un directorio destino.
 */
export function ensureDirectory(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return dirPath;
}

