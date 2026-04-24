import { asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailMailboxes } from "@/lib/db/schema";
import { MAX_EMAIL_MAILBOXES } from "@/lib/email-mailbox-config";
import { ensureEmailMailboxes, normalizeMailboxEmail } from "@/lib/email-mailboxes";
import { generateId } from "@/lib/utils";

const mailboxSchema = z.object({
  label: z.string().min(2).max(120),
  email: z.string().email(),
  description: z.string().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
  isDefault: z.boolean().optional(),
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

  const mailboxes = await ensureEmailMailboxes();
  return NextResponse.json(mailboxes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEmails(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const currentMailboxes = await ensureEmailMailboxes();

  if (currentMailboxes.length >= MAX_EMAIL_MAILBOXES) {
    return NextResponse.json(
      { error: `Voce pode ter no maximo ${MAX_EMAIL_MAILBOXES} caixas internas.` },
      { status: 409 }
    );
  }

  const parsed = mailboxSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nextEmail = normalizeMailboxEmail(parsed.data.email);
  const existing = await db
    .select({ id: emailMailboxes.id })
    .from(emailMailboxes)
    .where(eq(emailMailboxes.email, nextEmail));

  if (existing.length > 0) {
    return NextResponse.json({ error: "Ja existe uma caixa com esse email." }, { status: 409 });
  }

  const lastMailbox = await db
    .select({ order: emailMailboxes.order })
    .from(emailMailboxes)
    .orderBy(desc(emailMailboxes.order))
    .limit(1);

  if (parsed.data.isDefault) {
    await db.update(emailMailboxes).set({ isDefault: false, updatedAt: new Date() });
  }

  await db.insert(emailMailboxes).values({
    id: generateId(),
    label: parsed.data.label.trim(),
    email: nextEmail,
    description: parsed.data.description?.trim() || null,
    order: (lastMailbox[0]?.order ?? -1) + 1,
    active: parsed.data.active ?? true,
    isDefault: parsed.data.isDefault ?? false,
  });

  const mailboxes = await db
    .select()
    .from(emailMailboxes)
    .orderBy(asc(emailMailboxes.order), asc(emailMailboxes.createdAt));

  return NextResponse.json(mailboxes);
}
