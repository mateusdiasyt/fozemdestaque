import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const [cat] = await db.select().from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    if (!cat || !cat.active) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json(cat);
  }

  const all = await db.select().from(categories)
    .where(eq(categories.active, true))
    .orderBy(asc(categories.name));
  return NextResponse.json(all);
}
