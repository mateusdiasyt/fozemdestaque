import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(6),
  role: z.enum(["administrador", "editor", "colaborador"]),
});

const updateUserSchema = createUserSchema.partial().extend({
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "users")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const all = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    active: users.active,
    createdAt: users.createdAt,
  }).from(users);
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "users")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { email, name, password, role } = parsed.data;
  const hashed = await bcrypt.hash(password, 10);
  const id = generateId();
  await db.insert(users).values({
    id,
    email,
    name,
    password: hashed,
    role,
  });
  return NextResponse.json({ id, email, name, role });
}
