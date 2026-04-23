import { NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailMessages } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import {
  extractEmailAddress,
  extractEmailName,
  getConfiguredFromAddress,
  sendEmailWithResend,
  splitRecipients,
  textToHtml,
} from "@/lib/email";
import { desc } from "drizzle-orm";
import { z } from "zod";

const sendSchema = z.object({
  to: z.string().min(3),
  subject: z.string().min(2).max(500),
  body: z.string().min(1),
  replyTo: z.string().optional(),
});

function canManageEmails(role?: string) {
  return hasPermission(
    (role as "administrador" | "editor" | "colaborador") ?? "colaborador",
    "emails"
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageEmails(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const all = await db
    .select()
    .from(emailMessages)
    .orderBy(desc(emailMessages.createdAt));

  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEmails(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const parsed = sendSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const recipients = splitRecipients(parsed.data.to);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Informe ao menos um destinatario." }, { status: 400 });
  }

  const from = getConfiguredFromAddress();
  const id = generateId();
  let providerId: string | null = null;

  try {
    const result = await sendEmailWithResend({
      to: recipients,
      subject: parsed.data.subject,
      text: parsed.data.body,
      replyTo: parsed.data.replyTo || undefined,
    });
    providerId = result.id;

    await db.insert(emailMessages).values({
      id,
      direction: "outbound",
      status: "sent",
      fromName: extractEmailName(from),
      fromEmail: extractEmailAddress(from),
      toEmail: recipients.join(", "),
      subject: parsed.data.subject,
      textContent: parsed.data.body,
      htmlContent: textToHtml(parsed.data.body),
      provider: "resend",
      providerId,
      read: true,
    });

    return NextResponse.json({ ok: true, id, providerId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao enviar email.";

    await db.insert(emailMessages).values({
      id,
      direction: "outbound",
      status: "failed",
      fromName: extractEmailName(from),
      fromEmail: extractEmailAddress(from),
      toEmail: recipients.join(", "),
      subject: parsed.data.subject,
      textContent: parsed.data.body,
      htmlContent: textToHtml(parsed.data.body),
      provider: "resend",
      providerId,
      error: message,
      read: true,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
