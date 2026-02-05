import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["administrador", "editor", "colaborador"]).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "users")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    active: users.active,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, id)).limit(1);
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  return NextResponse.json(user);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "users")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { password, ...rest } = parsed.data;
  const updates: { email?: string; name?: string; password?: string; role?: "administrador" | "editor" | "colaborador"; active?: boolean; updatedAt: Date } = {
    ...rest,
    updatedAt: new Date(),
  };
  if (password) {
    updates.password = await bcrypt.hash(password, 10);
  }
  await db.update(users).set(updates).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "users")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await params;
  if (session.user.id === id) {
    return NextResponse.json({ error: "Não pode remover a si mesmo" }, { status: 400 });
  }
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
