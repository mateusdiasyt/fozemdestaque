import { and, asc, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailMailboxes } from "@/lib/db/schema";
import { normalizeMailboxEmail } from "@/lib/email-mailboxes";

const updateSchema = z.object({
  label: z.string().min(2).max(120).optional(),
  email: z.string().email().optional(),
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEmails(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await params;
  const current = await db
    .select()
    .from(emailMailboxes)
    .where(eq(emailMailboxes.id, id))
    .limit(1);

  if (!current[0]) {
    return NextResponse.json({ error: "Caixa nao encontrada." }, { status: 404 });
  }

  const update: {
    label?: string;
    email?: string;
    description?: string | null;
    active?: boolean;
    isDefault?: boolean;
    updatedAt: Date;
  } = {
    updatedAt: new Date(),
  };

  if (typeof parsed.data.label === "string") update.label = parsed.data.label.trim();
  if (typeof parsed.data.description === "string") update.description = parsed.data.description.trim() || null;
  if (typeof parsed.data.active === "boolean") update.active = parsed.data.active;
  if (typeof parsed.data.isDefault === "boolean") update.isDefault = parsed.data.isDefault;

  if (typeof parsed.data.email === "string") {
    const nextEmail = normalizeMailboxEmail(parsed.data.email);
    const duplicate = await db
      .select({ id: emailMailboxes.id })
      .from(emailMailboxes)
      .where(and(ne(emailMailboxes.id, id), eq(emailMailboxes.email, nextEmail)))
      .limit(1);

    if (duplicate.length > 0) {
      return NextResponse.json({ error: "Ja existe uma caixa com esse email." }, { status: 409 });
    }

    update.email = nextEmail;
  }

  if (parsed.data.isDefault) {
    await db.update(emailMailboxes).set({ isDefault: false, updatedAt: new Date() });
  }

  await db.update(emailMailboxes).set(update).where(eq(emailMailboxes.id, id));

  const mailboxes = await db
    .select()
    .from(emailMailboxes)
    .orderBy(asc(emailMailboxes.order), asc(emailMailboxes.createdAt));

  return NextResponse.json(mailboxes);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !canManageEmails(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const allMailboxes = await db
    .select()
    .from(emailMailboxes)
    .orderBy(asc(emailMailboxes.order), asc(emailMailboxes.createdAt));

  if (allMailboxes.length <= 1) {
    return NextResponse.json({ error: "Mantenha ao menos uma caixa ativa no sistema." }, { status: 400 });
  }

  const current = allMailboxes.find((mailbox) => mailbox.id === id);
  await db.delete(emailMailboxes).where(eq(emailMailboxes.id, id));

  if (current?.isDefault) {
    const nextMailbox = allMailboxes.find((mailbox) => mailbox.id !== id);
    if (nextMailbox) {
      await db
        .update(emailMailboxes)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(emailMailboxes.id, nextMailbox.id));
    }
  }

  return NextResponse.json({ ok: true });
}
