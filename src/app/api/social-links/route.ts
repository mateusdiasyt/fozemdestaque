import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";
import {
  mergeSocialLinks,
  normalizeSocialUrl,
  resolveSocialPlatform,
  type SocialPlatform,
} from "@/lib/social-links";

export async function GET() {
  try {
    const rows = await db
      .select({
        platform: contentBlocks.title,
        value: contentBlocks.link,
        active: contentBlocks.active,
        order: contentBlocks.order,
      })
      .from(contentBlocks)
      .where(eq(contentBlocks.type, "social_link"))
      .orderBy(asc(contentBlocks.order));

    const parsedRows = rows
      .map((row) => {
        const platform = resolveSocialPlatform(row.platform);
        if (!platform) return null;

        return {
          platform,
          value: row.value,
          active: row.active,
          order: row.order,
        };
      })
      .filter((row): row is { platform: SocialPlatform; value: string | null; active: boolean; order: number } => !!row);

    const merged = mergeSocialLinks(parsedRows)
      .filter((item) => item.active)
      .map((item) => ({
        platform: item.platform,
        label: item.label,
        href: normalizeSocialUrl(item.platform, item.value),
        order: item.order,
      }))
      .filter((item) => !!item.href)
      .map((item) => ({ ...item, href: item.href as string }))
      .sort((a, b) => a.order - b.order);

    return NextResponse.json(merged);
  } catch {
    const fallback = mergeSocialLinks([])
      .filter((item) => item.active)
      .map((item) => ({
        platform: item.platform,
        label: item.label,
        href: normalizeSocialUrl(item.platform, item.value),
        order: item.order,
      }))
      .filter((item) => !!item.href)
      .map((item) => ({ ...item, href: item.href as string }))
      .sort((a, b) => a.order - b.order);

    return NextResponse.json(fallback);
  }
}

