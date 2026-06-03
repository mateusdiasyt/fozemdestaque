import { randomUUID } from "crypto";

export type MediaUploadKind = "image" | "video" | "attachment" | "import";

type UploadFileInput = {
  file: File;
  kind: MediaUploadKind;
  pathname: string;
};

type UploadBufferInput = {
  buffer: Buffer;
  contentType: string;
  filename: string;
  kind: MediaUploadKind;
  pathname: string;
};

type MediaUploadResult = {
  url: string;
  path: string;
  size?: number;
  contentType?: string;
};

const FOLDER_BY_KIND: Record<MediaUploadKind, string> = {
  image: "uploads",
  video: "videos",
  attachment: "email-attachments",
  import: "imports",
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/xml": "xml",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/vnd.microsoft.icon": "ico",
  "image/webp": "webp",
  "image/x-icon": "ico",
  "text/csv": "csv",
  "text/plain": "txt",
  "text/xml": "xml",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

function getMediaUploadEndpoint() {
  const endpoint = process.env.MEDIA_UPLOAD_ENDPOINT?.trim();
  if (!endpoint) {
    throw new Error(
      "MEDIA_UPLOAD_ENDPOINT nao configurado. Configure o endpoint privado de upload da VPS."
    );
  }
  return endpoint;
}

function getMediaPublicBaseUrl() {
  const baseUrl = process.env.MEDIA_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) {
    throw new Error(
      "MEDIA_PUBLIC_BASE_URL nao configurado. Configure a URL publica do servico de midia da VPS."
    );
  }
  return baseUrl;
}

function sanitizeExtension(value: string) {
  const extension = value.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension.slice(0, 12);
}

export function getFileExtension(filename: string, contentType: string, fallback = "bin") {
  const fromName = filename.split(".").pop();
  if (fromName && fromName !== filename) {
    const sanitized = sanitizeExtension(fromName);
    if (sanitized) return sanitized;
  }

  return EXTENSION_BY_CONTENT_TYPE[contentType.toLowerCase()] ?? fallback;
}

export function buildMediaPath({
  kind,
  filename,
  contentType,
}: {
  kind: MediaUploadKind;
  filename: string;
  contentType: string;
}) {
  const extension = getFileExtension(filename, contentType, kind === "image" ? "jpg" : "bin");
  const folder = FOLDER_BY_KIND[kind];
  return `${folder}/${Date.now()}-${randomUUID()}.${extension}`;
}

export function buildMediaUrl(pathname: string) {
  const normalizedPath = pathname.replace(/^\/+/, "");
  return `${getMediaPublicBaseUrl()}/${normalizedPath}`;
}

async function sendToMediaServer({
  formData,
  pathname,
}: {
  formData: FormData;
  pathname: string;
}): Promise<MediaUploadResult> {
  const headers: Record<string, string> = {};
  const token = process.env.MEDIA_UPLOAD_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(getMediaUploadEndpoint(), {
    method: "POST",
    headers,
    body: formData,
  });

  const text = await response.text();
  let data: Partial<MediaUploadResult> & { error?: string } = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || text || `Upload na VPS falhou (${response.status}).`);
  }

  return {
    url: data.url || buildMediaUrl(pathname),
    path: data.path || pathname,
    size: data.size,
    contentType: data.contentType,
  };
}

export async function uploadFileToVpsMedia({
  file,
  kind,
  pathname,
}: UploadFileInput): Promise<MediaUploadResult> {
  const formData = new FormData();
  formData.set("path", pathname);
  formData.set("kind", kind);
  formData.set("contentType", file.type);
  formData.set("file", file, file.name);

  return sendToMediaServer({ formData, pathname });
}

export async function uploadBufferToVpsMedia({
  buffer,
  contentType,
  filename,
  kind,
  pathname,
}: UploadBufferInput): Promise<MediaUploadResult> {
  const file = new Blob([new Uint8Array(buffer)], { type: contentType });
  const formData = new FormData();
  formData.set("path", pathname);
  formData.set("kind", kind);
  formData.set("contentType", contentType);
  formData.set("file", file, filename);

  return sendToMediaServer({ formData, pathname });
}
