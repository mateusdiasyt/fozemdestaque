export interface SendEmailInput {
  to: string[];
  subject: string;
  text: string;
  replyTo?: string;
  from?: string;
}

export interface SentEmailResult {
  id: string | null;
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
