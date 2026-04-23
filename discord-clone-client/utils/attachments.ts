import { Attachment } from "@/types/dm";

const IMAGE_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "heic",
  "heif",
  "avif",
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  avif: "image/avif",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  rar: "application/vnd.rar",
};

export function getFilenameFromUrl(url: string): string {
  try {
    const clean = url.split("?")[0];
    const last = clean.substring(clean.lastIndexOf("/") + 1);
    return decodeURIComponent(last || "file");
  } catch {
    return "file";
  }
}

export function getFileExtension(filenameOrUrl: string): string {
  const clean = filenameOrUrl.split("?")[0];
  const lastDot = clean.lastIndexOf(".");
  if (lastDot < 0) return "";
  return clean.substring(lastDot + 1).toLowerCase();
}

export function getMimeTypeFromNameOrUrl(filenameOrUrl: string, fallback?: string): string {
  const extension = getFileExtension(filenameOrUrl);
  if (extension && MIME_BY_EXTENSION[extension]) {
    return MIME_BY_EXTENSION[extension];
  }
  return fallback || "application/octet-stream";
}

export function ensureFilenameExtension(filename: string, mimeType?: string): string {
  if (getFileExtension(filename)) return filename;

  const resolvedMime = (mimeType || "").toLowerCase();
  const extension = Object.entries(MIME_BY_EXTENSION).find(([, value]) => value === resolvedMime)?.[0];
  if (!extension) return filename;
  return `${filename}.${extension}`;
}

export function isImageUrl(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  const ext = clean.includes(".") ? clean.substring(clean.lastIndexOf(".") + 1) : "";
  if (IMAGE_EXTENSIONS.has(ext)) return true;
  return clean.includes("/image/upload/");
}

export function isImageAttachment(attachment: Attachment): boolean {
  if (attachment.contentType?.toLowerCase().startsWith("image/")) return true;
  return isImageUrl(attachment.url);
}

export function normalizeAttachment(input: unknown, index = 0): Attachment {
  if (typeof input === "string") {
    const filename = getFilenameFromUrl(input);
    const image = isImageUrl(input);
    return {
      id: `att-${index}`,
      url: input,
      filename,
      contentType: image ? "image/*" : "application/octet-stream",
    };
  }

  const raw = (input ?? {}) as Record<string, unknown>;
  const url = String(raw.url ?? raw.secure_url ?? "");
  const filename =
    String(raw.filename ?? raw.name ?? raw.original_filename ?? "") ||
    getFilenameFromUrl(url);
  const contentType = String(raw.contentType ?? raw.type ?? "") || getMimeTypeFromNameOrUrl(filename || url);

  return {
    id: String(raw.id ?? raw.public_id ?? `att-${index}`),
    url,
    filename,
    contentType,
    size: typeof raw.size === "number" ? raw.size : undefined,
  };
}

export function normalizeAttachmentList(inputs?: unknown): Attachment[] {
  if (Array.isArray(inputs)) {
    return inputs
      .map((item, idx) => normalizeAttachment(item, idx))
      .filter((item) => item.url);
  }

  if (typeof inputs === "string") {
    const trimmed = inputs.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item, idx) => normalizeAttachment(item, idx))
          .filter((item) => item.url);
      }
    } catch {
      // Fallback for APIs returning comma-separated URLs
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item, idx) => normalizeAttachment(item, idx))
        .filter((item) => item.url);
    }
  }

  return [];
}
