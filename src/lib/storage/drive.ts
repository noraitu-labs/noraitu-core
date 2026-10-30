import { google } from "googleapis";
import { Readable } from "stream";
import path from "path";
import { recordNeonAuditEvent } from "../db/neon";

// ══════════════════════════════════════════════════════════════
//  NEXORA ONE — Enterprise Data Lake (Google Drive 5TB)
//  Personal OAuth2 Quota Delegation & Fallback Engine
// ══════════════════════════════════════════════════════════════

const ALLOWED_MIME_TYPES = new Set([
  // Audio
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  // Documents
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "application/vnd.ms-excel",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".mp3",
  ".wav",
  ".webm",
  ".ogg",
  ".pdf",
  ".txt",
  ".md",
  ".json",
  ".csv",
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB strict limit

/**
 * Creates and returns an authenticated Google Drive API client.
 * Prioritizes OAuth2 User Refresh Token (direct 5 TB personal quota) with fallback to Service Account JWT.
 */
export function getDriveClient() {
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || "").trim();
  const clientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

  // 1. Primary: OAuth2 Refresh Token (Personal 5 TB Account)
  if (refreshToken && clientId && clientSecret) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return google.drive({ version: "v3", auth: oauth2Client });
  }

  // 2. Fallback: Service Account JWT
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const rawKey = (process.env.GOOGLE_PRIVATE_KEY || "").trim();

  if (!email || !rawKey) {
    throw new Error(
      "Credenciales de autenticación de Google Drive ausentes (OAuth2 GOOGLE_REFRESH_TOKEN o Service Account GOOGLE_SERVICE_ACCOUNT_EMAIL)."
    );
  }

  // Handle escaped \n line breaks from env vars or raw pem
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

/**
 * Resolves or lazily creates a subfolder within the root Drive folder.
 */
async function resolveTargetFolderId(
  drive: ReturnType<typeof getDriveClient>,
  rootFolderId: string,
  subfolder?: string
): Promise<string> {
  if (!subfolder || !subfolder.trim()) {
    return rootFolderId;
  }

  const cleanSubfolder = subfolder.trim().replace(/[/\\?%*:|"<>]/g, "_");
  const query = `'${rootFolderId}' in parents and name = '${cleanSubfolder}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

  const searchRes = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (searchRes.data.files && searchRes.data.files.length > 0) {
    return searchRes.data.files[0].id!;
  }

  // Create subfolder if it does not exist
  const createRes = await drive.files.create({
    requestBody: {
      name: cleanSubfolder,
      mimeType: "application/vnd.google-apps.folder",
      parents: [rootFolderId],
    },
    fields: "id",
  });

  return createRes.data.id!;
}

export interface UploadAssetResult {
  ok: boolean;
  fileId?: string;
  fileName: string;
  sizeBytes: number;
  webViewLink?: string;
  webContentLink?: string;
  error?: string;
  quotaExceeded?: boolean;
}

/**
 * Uploads an enterprise asset to the Google Drive Data Lake with strict size and MIME type guards.
 */
export async function uploadEnterpriseAsset(
  fileName: string,
  mimeType: string,
  buffer: Buffer,
  subfolder?: string
): Promise<UploadAssetResult> {
  // 1. Validate file size (max 50 MB)
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      fileName,
      sizeBytes: buffer.length,
      error: `El archivo supera el tamaño máximo permitido de 50 MB (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
    };
  }

  // 2. Validate extension and MIME type
  const ext = path.extname(fileName).toLowerCase();
  const cleanMime = mimeType.toLowerCase().split(";")[0].trim();

  if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(cleanMime)) {
    return {
      ok: false,
      fileName,
      sizeBytes: buffer.length,
      error: `Tipo de archivo no permitido: '${ext || cleanMime}'. Solo se admiten .mp3, .wav, .pdf, .txt, .md, .json, .csv.`,
    };
  }

  const rootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim() || "1zJIsPi3KgeA6Az8qNHXLoqLgOvgyj6UG";

  try {
    const drive = getDriveClient();
    const parentFolderId = await resolveTargetFolderId(drive, rootFolderId, subfolder);

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const res = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [parentFolderId],
      },
      media: {
        mimeType: cleanMime,
        body: stream,
      },
      fields: "id, name, webViewLink, webContentLink, size",
    });

    return {
      ok: true,
      fileId: res.data.id || undefined,
      fileName: res.data.name || fileName,
      sizeBytes: buffer.length,
      webViewLink: res.data.webViewLink || undefined,
      webContentLink: res.data.webContentLink || undefined,
    };
  } catch (err: any) {
    const isQuotaExceeded =
      (err?.code === 403 &&
        (err?.errors?.some(
          (e: any) =>
            e.reason === "storageQuotaExceeded" ||
            e.reason === "userRateLimitExceeded"
        ) ||
          /quota|storageQuotaExceeded/i.test(err?.message || ""))) ||
      err?.code === 507 ||
      err?.status === 507 ||
      /insufficient storage|storage quota/i.test(err?.message || "");

    if (isQuotaExceeded) {
      console.warn(
        "[Drive DataLake Warning]: Quota exceeded. Emitting SYSTEM_ALERT to Neon DB."
      );
      try {
        await recordNeonAuditEvent({
          sessionId: "system",
          eventType: "SYSTEM_ALERT: DRIVE_STORAGE_FULL",
          metadata: {
            fileName,
            sizeBytes: buffer.length,
            error: err?.message || "Storage quota exceeded",
            timestamp: new Date().toISOString(),
          },
        });
      } catch (neonErr) {
        console.error("[Neon Audit Log Error]:", neonErr);
      }

      return {
        ok: false,
        fileName,
        sizeBytes: buffer.length,
        error: "DRIVE_STORAGE_FULL: Cuota de almacenamiento de Google Drive excedida.",
        quotaExceeded: true,
      };
    }

    console.error("[Drive DataLake Upload Error]:", err?.message || err);
    return {
      ok: false,
      fileName,
      sizeBytes: buffer.length,
      error: err?.message || "Error al subir el archivo a Google Drive.",
      quotaExceeded: false,
    };
  }
}

/**
 * Deletes an enterprise asset by fileId from Google Drive.
 * Treats already deleted/non-existent files (404) as successfully handled.
 */
export async function deleteEnterpriseAsset(
  fileId: string
): Promise<{ ok: boolean; error?: string; bytesFreed?: number }> {
  try {
    const drive = getDriveClient();

    let bytesFreed = 0;
    try {
      const meta = await drive.files.get({
        fileId,
        fields: "size",
        supportsAllDrives: true,
      });
      if (meta.data.size) {
        bytesFreed = parseInt(meta.data.size, 10) || 0;
      }
    } catch {
      // Metadata lookup is best-effort
    }

    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    });

    return { ok: true, bytesFreed };
  } catch (err: any) {
    if (err?.code === 404 || err?.status === 404) {
      return { ok: true, bytesFreed: 0 };
    }
    console.error("[Drive DataLake Delete Error]:", err?.message || err);
    return {
      ok: false,
      error: err?.message || "Error al eliminar el archivo de Google Drive.",
    };
  }
}

/**
 * Lists enterprise assets located in the root or a given subfolder of the Data Lake.
 */
export async function listEnterpriseAssets(subfolder?: string, pageSize = 20) {
  const rootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim() || "1zJIsPi3KgeA6Az8qNHXLoqLgOvgyj6UG";

  const drive = getDriveClient();
  const targetFolderId = await resolveTargetFolderId(drive, rootFolderId, subfolder);

  const query = `'${targetFolderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`;

  const res = await drive.files.list({
    q: query,
    pageSize,
    fields: "files(id, name, mimeType, size, createdTime, webViewLink)",
    orderBy: "createdTime desc",
  });

  return res.data.files || [];
}
