import { NextResponse } from "next/server";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { birthdaySubmissions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateSchema = z.object({
  ativo: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (
    !session?.user ||
    !hasPermission(
      (session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador",
      "aniversarios"
    )
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
  await db
    .update(birthdaySubmissions)
    .set({ ativo: parsed.data.ativo })
    .where(eq(birthdaySubmissions.id, id));
  return NextResponse.json({ ok: true });
}
