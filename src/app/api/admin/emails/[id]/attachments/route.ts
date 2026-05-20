import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailMessages } from "@/lib/db/schema";
import {
  listReceivedEmailAttachments,
  listSentEmailAttachments,
} from "@/lib/email";
import { normalizeStoredAttachments } from "@/lib/email-storage-policy";

function canManageEmails(role?: string) {
  return hasPermission(
    (role as "administrador" | "editor" | "colaborador") ?? "colaborador",
    "emails"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<Record<string, string | string[] | undefined>> }
) {
  const session = await auth();
  if (!session?.user || !canManageEmails(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const rawParams = await params;
  const id =
    typeof rawParams.id === "string"
      ? rawParams.id
      : Array.isArray(rawParams.id)
        ? rawParams.id[0]
        : "";

  const [message] = await db
    .select()
    .from(emailMessages)
    .where(eq(emailMessages.id, id))
    .limit(1);

  if (!message) {
    return NextResponse.json({ error: "Email nao encontrado" }, { status: 404 });
  }

  const storedAttachments = parseStoredAttachments(message.attachments);
  if (message.provider !== "resend" || !message.providerId) {
    return NextResponse.json({ attachments: storedAttachments });
  }

  const attachments =
    message.direction === "inbound"
      ? await listReceivedEmailAttachments(message.providerId)
      : await listSentEmailAttachments(message.providerId);

  return NextResponse.json({ attachments: attachments.length > 0 ? attachments : storedAttachments });
}

function parseStoredAttachments(value: string | null) {
  if (!value) return [];
  try {
    return normalizeStoredAttachments(JSON.parse(value));
  } catch {
    return [];
  }
}
