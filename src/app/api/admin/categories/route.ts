import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateId, slugify } from "@/lib/utils";

const createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "categories")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const all = await db.select().from(categories);
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "categories")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const slug = parsed.data.slug || slugify(parsed.data.name);
  const id = generateId();
  await db.insert(categories).values({
    id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description ?? null,
    active: parsed.data.active ?? true,
  });
  return NextResponse.json({ id, name: parsed.data.name, slug });
}
