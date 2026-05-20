import { and, asc, eq, lt } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailMessages } from "@/lib/db/schema";

export const EMAIL_STORAGE_LIMIT_BYTES = envNumber("EMAIL_STORAGE_LIMIT_MB", 10_240) * 1024 * 1024;
export const EMAIL_MAX_MESSAGES = envNumber("EMAIL_MAX_MESSAGES", 5000);
export const EMAIL_RETENTION_DAYS = envNumber("EMAIL_RETENTION_DAYS", 365);
export const EMAIL_MAX_BODY_CHARS = envNumber("EMAIL_MAX_BODY_CHARS", 200_000);
export const EMAIL_MAX_ATTACHMENT_BYTES = envNumber("EMAIL_MAX_ATTACHMENT_MB", 10) * 1024 * 1024;
export const EMAIL_MAX_ATTACHMENTS_PER_MESSAGE = envNumber("EMAIL_MAX_ATTACHMENTS_PER_MESSAGE", 5);

export type StoredEmailAttachment = {
  filename: string;
  path?: string;
  contentType?: string;
  size?: number;
};

export function clampEmailBody(value: string | null | undefined) {
  if (!value) return value ?? null;
  return value.length > EMAIL_MAX_BODY_CHARS ? value.slice(0, EMAIL_MAX_BODY_CHARS) : value;
}

export function normalizeStoredAttachments(value: StoredEmailAttachment[] | null | undefined) {
  return (value ?? []).map((attachment) => ({
    filename: attachment.filename,
    path: attachment.path,
    contentType: attachment.contentType,
    size: attachment.size,
  }));
}

export function getAttachmentsSize(attachments: StoredEmailAttachment[] | null | undefined) {
  return (attachments ?? []).reduce((total, attachment) => total + Math.max(0, attachment.size ?? 0), 0);
}

export function validateEmailAttachments(attachments: StoredEmailAttachment[] | null | undefined) {
  const list = attachments ?? [];
  if (list.length > EMAIL_MAX_ATTACHMENTS_PER_MESSAGE) {
    return `Limite de ${EMAIL_MAX_ATTACHMENTS_PER_MESSAGE} anexo(s) por email.`;
  }

  const tooLarge = list.find((attachment) => (attachment.size ?? 0) > EMAIL_MAX_ATTACHMENT_BYTES);
  if (tooLarge) {
    return `O anexo "${tooLarge.filename}" ultrapassa o limite de ${formatBytes(EMAIL_MAX_ATTACHMENT_BYTES)}.`;
  }

  return null;
}

export async function getEmailStorageUsage() {
  const rows = await db
    .select({
      subject: emailMessages.subject,
      toEmail: emailMessages.toEmail,
      cc: emailMessages.cc,
      bcc: emailMessages.bcc,
      textContent: emailMessages.textContent,
      htmlContent: emailMessages.htmlContent,
      attachments: emailMessages.attachments,
    })
    .from(emailMessages);
  const bytes = rows.reduce((total, row) => {
    const attachments = parseStoredAttachments(row.attachments);
    return (
      total +
      Buffer.byteLength(row.subject ?? "") +
      Buffer.byteLength(row.toEmail ?? "") +
      Buffer.byteLength(row.cc ?? "") +
      Buffer.byteLength(row.bcc ?? "") +
      Buffer.byteLength(row.textContent ?? "") +
      Buffer.byteLength(row.htmlContent ?? "") +
      Buffer.byteLength(row.attachments ?? "") +
      getAttachmentsSize(attachments)
    );
  }, 0);

  return {
    bytes,
    count: rows.length,
    limitBytes: EMAIL_STORAGE_LIMIT_BYTES,
    maxMessages: EMAIL_MAX_MESSAGES,
  };
}

export async function assertEmailStorageAvailable(extraBytes = 0) {
  const usage = await getEmailStorageUsage();
  if (usage.count >= usage.maxMessages) {
    return `Limite de ${usage.maxMessages} mensagens atingido. Apague emails antigos para liberar espaco.`;
  }

  if (usage.bytes + extraBytes > usage.limitBytes) {
    return `Limite de armazenamento de email atingido (${formatBytes(usage.limitBytes)}). Apague emails antigos ou reduza anexos.`;
  }

  return null;
}

export async function pruneEmailStorage() {
  if (EMAIL_RETENTION_DAYS > 0) {
    const cutoff = new Date(Date.now() - EMAIL_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await db
      .delete(emailMessages)
      .where(
        and(
          lt(emailMessages.createdAt, cutoff),
          eq(emailMessages.direction, "inbound")
        )
      );
  }

  const usage = await getEmailStorageUsage();
  if (usage.count <= usage.maxMessages && usage.bytes <= usage.limitBytes) return;

  const overflow = await db
    .select({ id: emailMessages.id })
    .from(emailMessages)
    .where(eq(emailMessages.direction, "inbound"))
    .orderBy(asc(emailMessages.createdAt))
    .limit(Math.max(1, usage.count - usage.maxMessages + 100));

  for (const message of overflow) {
    await db.delete(emailMessages).where(eq(emailMessages.id, message.id));
  }
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function envNumber(key: string, fallback: number) {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function parseStoredAttachments(value: string | null) {
  if (!value) return [];
  try {
    return normalizeStoredAttachments(JSON.parse(value));
  } catch {
    return [];
  }
}
