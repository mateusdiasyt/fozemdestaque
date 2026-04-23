import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { emailMailboxes, type EmailMailbox } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";

const BRAND_NAME = "Foz em Destaque";

export const DEFAULT_EMAIL_MAILBOXS = [
  {
    label: "Admin",
    email: "admin@fozemdestaque.com",
    description: "Caixa principal do portal e mensagens internas.",
    order: 0,
    isDefault: true,
  },
  {
    label: "Comercial",
    email: "comercial@fozemdestaque.com",
    description: "Atendimento de publicidade, marcas e negociacoes.",
    order: 1,
    isDefault: false,
  },
  {
    label: "Contato",
    email: "contato@fozemdestaque.com",
    description: "Contato geral do portal.",
    order: 2,
    isDefault: false,
  },
  {
    label: "Marco",
    email: "marco@fozemdestaque.com",
    description: "Caixa dedicada ao contato pessoal do Marco.",
    order: 3,
    isDefault: false,
  },
  {
    label: "Oportunidade",
    email: "oportunidade@fozemdestaque.com",
    description: "Propostas, convites e novas oportunidades.",
    order: 4,
    isDefault: false,
  },
  {
    label: "Pauta",
    email: "pauta@fozemdestaque.com",
    description: "Sugestoes de pauta e relacionamento editorial.",
    order: 5,
    isDefault: false,
  },
] as const;

export function normalizeMailboxEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getMailboxDisplayFromAddress(mailbox: Pick<EmailMailbox, "label" | "email">) {
  return `${mailbox.label} - ${BRAND_NAME} <${normalizeMailboxEmail(mailbox.email)}>`;
}

export async function ensureEmailMailboxes() {
  const existing = await db
    .select()
    .from(emailMailboxes)
    .orderBy(asc(emailMailboxes.order), asc(emailMailboxes.createdAt));

  if (existing.length > 0) return existing;

  await db.insert(emailMailboxes).values(
    DEFAULT_EMAIL_MAILBOXS.map((mailbox) => ({
      id: generateId(),
      label: mailbox.label,
      email: normalizeMailboxEmail(mailbox.email),
      description: mailbox.description,
      order: mailbox.order,
      active: true,
      isDefault: mailbox.isDefault,
    }))
  );

  return db
    .select()
    .from(emailMailboxes)
    .orderBy(asc(emailMailboxes.order), asc(emailMailboxes.createdAt));
}

export function getDefaultMailbox<T extends Pick<EmailMailbox, "email" | "active" | "isDefault">>(mailboxes: T[]) {
  return mailboxes.find((mailbox) => mailbox.isDefault && mailbox.active) ?? mailboxes.find((mailbox) => mailbox.active) ?? null;
}

export function extractAddressCandidates(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractAddressCandidates(item));
  }

  if (typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    return extractAddressCandidates(candidate.email || candidate.address || candidate.value || candidate.text);
  }

  return String(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const angleMatch = item.match(/<([^>]+)>/);
      return normalizeMailboxEmail(angleMatch?.[1] ?? item);
    })
    .filter(Boolean);
}

export function resolveMailboxEmailForRecipients(
  value: unknown,
  mailboxes: Array<Pick<EmailMailbox, "email" | "active" | "isDefault">>
) {
  const candidates = extractAddressCandidates(value);
  const known = new Set(mailboxes.map((mailbox) => normalizeMailboxEmail(mailbox.email)));

  for (const candidate of candidates) {
    if (known.has(candidate)) return candidate;
  }

  return candidates[0] || getDefaultMailbox(mailboxes)?.email || DEFAULT_EMAIL_MAILBOXS[0].email;
}
