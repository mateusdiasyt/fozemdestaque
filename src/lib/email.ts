export interface SendEmailInput {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
  from?: string;
  attachments?: EmailAttachmentInput[];
}

export interface SentEmailResult {
  id: string | null;
}

export interface EmailAttachmentInput {
  filename: string;
  path?: string;
  content?: string;
  contentType?: string;
  contentId?: string;
  size?: number;
}

export interface EmailAttachmentRecord {
  id?: string;
  filename: string;
  size?: number;
  contentType?: string;
  contentDisposition?: string;
  contentId?: string;
  downloadUrl?: string;
  expiresAt?: string;
  path?: string;
}

export interface ResendReceivedEmail {
  id: string;
  from: string | null;
  to: string[];
  cc: string[];
  subject: string | null;
  text: string | null;
  html: string | null;
  messageId: string | null;
}

export function getConfiguredFromAddress() {
  return process.env.EMAIL_FROM || "Foz em Destaque <admin@fozemdestaque.com>";
}

export function hasEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY);
}

export function splitRecipients(value: string) {
  return value
    .split(/[;,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function extractEmailAddress(value: string) {
  const match = value.match(/<([^>]+)>/);
  return (match?.[1] ?? value).trim();
}

export function extractEmailName(value: string) {
  const match = value.match(/^(.+?)\s*</);
  return match?.[1]?.replace(/^"|"$/g, "").trim() || null;
}

export function textToHtml(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

export async function sendEmailWithResend(input: SendEmailInput): Promise<SentEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY nao configurada.");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: input.from || getConfiguredFromAddress(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: textToHtml(input.text),
      reply_to: input.replyTo || undefined,
      attachments:
        input.attachments?.map((attachment) => ({
          filename: attachment.filename,
          path: attachment.path,
          content: attachment.content,
          content_type: attachment.contentType,
          content_id: attachment.contentId,
        })) || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      data?.error ||
      "Nao foi possivel enviar o email.";
    throw new Error(String(message));
  }

  return { id: data?.id ?? data?.data?.id ?? null };
}

export async function listSentEmailAttachments(emailId: string): Promise<EmailAttachmentRecord[]> {
  return listResendAttachments(`https://api.resend.com/emails/${emailId}/attachments`);
}

export async function listReceivedEmailAttachments(emailId: string): Promise<EmailAttachmentRecord[]> {
  return listResendAttachments(`https://api.resend.com/emails/receiving/${emailId}/attachments`);
}

export async function fetchReceivedEmailFromResend(emailId: string): Promise<ResendReceivedEmail | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !emailId) return null;

  const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;

  return {
    id: String(data?.id || emailId),
    from: data?.from ? String(data.from) : null,
    to: Array.isArray(data?.to) ? data.to.map((item: unknown) => String(item)) : [],
    cc: Array.isArray(data?.cc) ? data.cc.map((item: unknown) => String(item)) : [],
    subject: data?.subject ? String(data.subject) : null,
    text: data?.text ? String(data.text) : null,
    html: data?.html ? String(data.html) : null,
    messageId: data?.message_id ? String(data.message_id) : null,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function listResendAttachments(url: string): Promise<EmailAttachmentRecord[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return [];

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data?.data)) return [];
  const items = data.data as unknown[];

  return items.reduce((acc: EmailAttachmentRecord[], item: unknown) => {
      if (!item || typeof item !== "object") return acc;
      const attachment = item as Record<string, unknown>;
      const filename =
        typeof attachment.filename === "string" ? attachment.filename.trim() : "";
      if (!filename) return acc;

      acc.push({
        id: typeof attachment.id === "string" ? attachment.id : undefined,
        filename,
        size:
          typeof attachment.size === "number"
            ? attachment.size
            : Number(attachment.size || 0) || undefined,
        contentType:
          typeof attachment.content_type === "string"
            ? attachment.content_type
            : undefined,
        contentDisposition:
          typeof attachment.content_disposition === "string"
            ? attachment.content_disposition
            : undefined,
        contentId:
          typeof attachment.content_id === "string" ? attachment.content_id : undefined,
        downloadUrl:
          typeof attachment.download_url === "string" ? attachment.download_url : undefined,
        expiresAt:
          typeof attachment.expires_at === "string" ? attachment.expires_at : undefined,
      } satisfies EmailAttachmentRecord);

      return acc;
    }, []);
}
