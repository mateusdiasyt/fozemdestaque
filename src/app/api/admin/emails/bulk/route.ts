import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailMailboxes, emailMessages } from "@/lib/db/schema";
import { normalizeMailboxEmail } from "@/lib/email-mailboxes";

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(200),
  action: z.enum(["delete", "mark_read", "mark_unread", "move"]),
  mailboxEmail: z.string().email().optional(),
});

function canManageEmails(role?: string) {
  return hasPermission(
    (role as "administrador" | "editor" | "colaborador") ?? "colaborador",
    "emails"
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageEmails(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const parsed = bulkSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const ids = Array.from(new Set(parsed.data.ids));
  const action = parsed.data.action;

  if (action === "delete") {
    await db.delete(emailMessages).where(inArray(emailMessages.id, ids));
    return NextResponse.json({ ok: true });
  }

  if (action === "mark_read" || action === "mark_unread") {
    await db
      .update(emailMessages)
      .set({
        read: action === "mark_read",
        updatedAt: new Date(),
      })
      .where(inArray(emailMessages.id, ids));

    return NextResponse.json({ ok: true });
  }

  const normalizedMailboxEmail = parsed.data.mailboxEmail
    ? normalizeMailboxEmail(parsed.data.mailboxEmail)
    : null;

  if (!normalizedMailboxEmail) {
    return NextResponse.json({ error: "Informe a caixa de destino." }, { status: 400 });
  }

  const [targetMailbox] = await db
    .select()
    .from(emailMailboxes)
    .where(eq(emailMailboxes.email, normalizedMailboxEmail))
    .limit(1);

  if (!targetMailbox) {
    return NextResponse.json({ error: "Caixa de destino nao encontrada." }, { status: 404 });
  }

  await db
    .update(emailMessages)
    .set({
      mailboxEmail: targetMailbox.email,
      updatedAt: new Date(),
    })
    .where(inArray(emailMessages.id, ids));

  return NextResponse.json({ ok: true });
}
