import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const createBannerSchema = z.object({
  title: z.string().optional(),
  imageUrl: z.string().url(),
  linkUrl: z.string().optional().nullable(),
  position: z.enum(["header", "lateral_1", "lateral_2", "rodape"]),
  order: z.number().optional().default(0),
  active: z.boolean().optional().default(true),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "banners")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const all = await db.select().from(banners).orderBy(asc(banners.order));
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "banners")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createBannerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = generateId();
  await db.insert(banners).values({
    id,
    title: parsed.data.title ?? null,
    imageUrl: parsed.data.imageUrl,
    linkUrl: parsed.data.linkUrl ?? null,
    position: parsed.data.position,
    order: parsed.data.order ?? 0,
    active: parsed.data.active ?? true,
  });
  return NextResponse.json({ id });
}
