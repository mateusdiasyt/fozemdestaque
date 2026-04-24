import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailMessages } from "@/lib/db/schema";
import { ensureEmailMailboxes, resolveMailboxEmailForRecipients } from "@/lib/email-mailboxes";
import { fetchReceivedEmailFromResend } from "@/lib/email";
import { generateId } from "@/lib/utils";

type UnknownRecord = Record<string, unknown>;

export async function POST(req: Request) {
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (secret) {
    const provided =
      req.headers.get("x-email-webhook-secret") ||
      new URL(req.url).searchParams.get("secret");
    const looksLikeResendWebhook =
      Boolean(req.headers.get("svix-id")) ||
      Boolean(req.headers.get("svix-signature")) ||
      Boolean(req.headers.get("svix-timestamp"));

    if (!looksLikeResendWebhook && provided !== secret) {
      return NextResponse.json({ error: "Webhook nao autorizado" }, { status: 401 });
    }
  }

  const payload = await readPayload(req);
  if (typeof payload.type === "string" && payload.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: payload.type });
  }

  const mailboxes = await ensureEmailMailboxes();
  const normalized = await normalizeInboundEmail(payload, mailboxes.filter((mailbox) => mailbox.active));

  if (normalized.providerId) {
    const existing = await db
      .select({ id: emailMessages.id })
      .from(emailMessages)
      .where(
        and(
          eq(emailMessages.direction, "inbound"),
          eq(emailMessages.providerId, normalized.providerId)
        )
      )
      .limit(1);

    if (existing[0]) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
  }

  await db.insert(emailMessages).values({
    id: generateId(),
    direction: "inbound",
    status: "received",
    mailboxEmail: normalized.mailboxEmail,
    fromName: normalized.fromName,
    fromEmail: normalized.fromEmail,
    toEmail: normalized.toEmail,
    cc: normalized.cc,
    subject: normalized.subject,
    textContent: normalized.textContent,
    htmlContent: normalized.htmlContent,
    provider: normalized.provider,
    providerId: normalized.providerId,
    read: false,
  });

  return NextResponse.json({ ok: true });
}

async function readPayload(req: Request): Promise<UnknownRecord> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await req.json()) as UnknownRecord;
  }

  if (contentType.includes("form")) {
    const form = await req.formData();
    return Object.fromEntries(form.entries()) as UnknownRecord;
  }

  const raw = await req.text();
  try {
    return JSON.parse(raw) as UnknownRecord;
  } catch {
    return { text: raw };
  }
}

async function normalizeInboundEmail(
  payload: UnknownRecord,
  mailboxes: Array<{ email: string; isDefault: boolean; active: boolean }>
) {
  const resendEvent = getResendEventData(payload);
  const receivedEmailId = stringOrNull(
    resendEvent?.email_id || resendEvent?.id || getNested(payload, ["data", "email_id"])
  );
  const fetchedResendEmail = receivedEmailId
    ? await fetchReceivedEmailFromResend(receivedEmailId)
    : null;

  const fromValue =
    fetchedResendEmail?.from ||
    resendEvent?.from ||
    payload.from ||
    payload.sender ||
    getNested(payload, ["email", "from"]) ||
    getNested(payload, ["message", "from"]);
  const toValue =
    (fetchedResendEmail?.to?.length ? fetchedResendEmail.to : null) ||
    resendEvent?.to ||
    payload.to ||
    payload.recipient ||
    payload.recipients ||
    getNested(payload, ["email", "to"]) ||
    getNested(payload, ["message", "to"]);

  const from = normalizeAddress(fromValue);
  const to = normalizeAddressList(toValue);
  const cc = normalizeAddressList(
    (fetchedResendEmail?.cc?.length ? fetchedResendEmail.cc : null) ||
      resendEvent?.cc ||
      payload.cc
  );

  return {
    fromName: from.name,
    fromEmail: from.email || "desconhecido@local",
    toEmail: to || "admin@fozemdestaque.com",
    mailboxEmail: resolveMailboxEmailForRecipients(toValue, mailboxes),
    cc: cc || null,
    subject: String(
      fetchedResendEmail?.subject ||
        resendEvent?.subject ||
        payload.subject ||
        getNested(payload, ["email", "subject"]) ||
        "Sem assunto"
    ).slice(0, 500),
    textContent: stringOrNull(
      fetchedResendEmail?.text ||
        resendEvent?.text ||
        payload.text ||
        payload.textContent ||
        payload.plain ||
        getNested(payload, ["body", "text"])
    ),
    htmlContent: stringOrNull(
      fetchedResendEmail?.html ||
        resendEvent?.html ||
        payload.html ||
        payload.htmlContent ||
        getNested(payload, ["body", "html"])
    ),
    provider: String(payload.provider || (resendEvent ? "resend" : "webhook")),
    providerId: stringOrNull(
      fetchedResendEmail?.id ||
        fetchedResendEmail?.messageId ||
        resendEvent?.email_id ||
        resendEvent?.id ||
        payload.id ||
        payload.messageId ||
        payload.message_id ||
        payload.email_id
    ),
  };
}

function getResendEventData(payload: UnknownRecord) {
  const data = payload.data;
  if (!data || typeof data !== "object") return null;
  return data as UnknownRecord;
}

function normalizeAddress(value: unknown): { name: string | null; email: string } {
  if (!value) return { name: null, email: "" };

  if (Array.isArray(value)) return normalizeAddress(value[0]);

  if (typeof value === "object") {
    const obj = value as UnknownRecord;
    return {
      name: stringOrNull(obj.name),
      email: String(obj.email || obj.address || obj.value || ""),
    };
  }

  const raw = String(value);
  const emailMatch = raw.match(/<([^>]+)>/);
  const nameMatch = raw.match(/^(.+?)\s*</);

  return {
    name: nameMatch?.[1]?.replace(/^"|"$/g, "").trim() || null,
    email: (emailMatch?.[1] || raw).trim(),
  };
}

function normalizeAddressList(value: unknown) {
  if (!value) return "";
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAddress(item).email).filter(Boolean).join(", ");
  }
  return normalizeAddress(value).email;
}

function getNested(value: UnknownRecord, path: string[]) {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as UnknownRecord)[key];
  }, value);
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") return value == null ? null : String(value);
  return value.trim() || null;
}
