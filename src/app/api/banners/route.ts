import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const position = searchParams.get("position"); // header, lateral_1, lateral_2, rodape

  const all = await db.select().from(banners)
    .where(eq(banners.active, true))
    .orderBy(asc(banners.order));

  if (position) {
    const filtered = all.filter((b) => b.position === position);
    return NextResponse.json(filtered);
  }
  return NextResponse.json(all);
}
