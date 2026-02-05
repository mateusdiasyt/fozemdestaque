import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const all = await db.select().from(contentBlocks)
    .where(eq(contentBlocks.active, true))
    .orderBy(asc(contentBlocks.order));

  const filtered = type ? all.filter((b) => b.type === type) : all;
  const result = limit > 0 ? filtered.slice(0, limit) : filtered;
  return NextResponse.json(result);
}
