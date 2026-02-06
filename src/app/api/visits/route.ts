import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { siteStats } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

const STATS_ID = "main";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const inc = searchParams.get("inc") === "1";

  try {
    let [row] = await db
      .select({ totalVisits: siteStats.totalVisits })
      .from(siteStats)
      .where(eq(siteStats.id, STATS_ID))
      .limit(1);

    if (!row) {
      await db.insert(siteStats).values({ id: STATS_ID, totalVisits: 5095 });
      row = { totalVisits: 5095 };
    }

    if (inc) {
      await db
        .update(siteStats)
        .set({
          totalVisits: sql`${siteStats.totalVisits} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(siteStats.id, STATS_ID));
      const [updated] = await db
        .select({ totalVisits: siteStats.totalVisits })
        .from(siteStats)
        .where(eq(siteStats.id, STATS_ID))
        .limit(1);
      row = updated ?? row;
    }

    const total = row?.totalVisits ?? 0;
    return NextResponse.json({ total });
  } catch {
    return NextResponse.json({ total: 5095 });
  }
}
