import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";
import { generateId } from "@/lib/utils";
import {
  mergeSocialLinks,
  resolveSocialPlatform,
  SOCIAL_LINK_DEFAULTS,
  type SocialPlatform,
} from "@/lib/social-links";

const socialLinkSchema = z.object({
  platform: z.enum(["instagram", "facebook", "youtube", "tiktok"]),
  value: z.string().optional().nullable(),
  active: z.boolean(),
  order: z.number().int().min(0).max(99),
});

const updateSchema = z.object({
  links: z.array(socialLinkSchema),
});

export async function GET() {
  const session = await auth();
  const role =
    (session?.user?.role as "administrador" | "editor" | "colaborador") ??
    "colaborador";

  if (!session?.user || !hasPermission(role, "settings")) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

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

    return NextResponse.json({ links: mergeSocialLinks(parsedRows) });
  } catch {
    return NextResponse.json({ links: mergeSocialLinks([]) });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  const role =
    (session?.user?.role as "administrador" | "editor" | "colaborador") ??
    "colaborador";

  if (!session?.user || !hasPermission(role, "settings")) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const existing = await db
      .select({
        id: contentBlocks.id,
        platform: contentBlocks.title,
      })
      .from(contentBlocks)
      .where(eq(contentBlocks.type, "social_link"));

    const firstByPlatform = new Map<string, string>();
    for (const row of existing) {
      const platform = resolveSocialPlatform(row.platform);
      if (platform && !firstByPlatform.has(platform)) {
        firstByPlatform.set(platform, row.id);
      }
    }

    for (const link of parsed.data.links) {
      const existingId = firstByPlatform.get(link.platform);
      const value = link.value?.trim() ? link.value.trim() : null;

      if (existingId) {
        await db
          .update(contentBlocks)
          .set({
            title: link.platform,
            excerpt: SOCIAL_LINK_DEFAULTS.find((item) => item.platform === link.platform)?.label ?? link.platform,
            link: value,
            active: link.active,
            order: link.order,
            updatedAt: new Date(),
          })
          .where(eq(contentBlocks.id, existingId));
      } else {
        const base = SOCIAL_LINK_DEFAULTS.find((item) => item.platform === link.platform);
        await db.insert(contentBlocks).values({
          id: generateId(),
          type: "social_link",
          title: link.platform,
          excerpt: base?.label ?? link.platform,
          link: value,
          order: link.order,
          active: link.active,
        });
      }
    }

    const stale = existing.filter(
      (row) => {
        const platform = resolveSocialPlatform(row.platform);
        return platform && !parsed.data.links.some((item) => item.platform === platform);
      }
    );

    if (stale.length > 0) {
      for (const row of stale) {
        await db
          .update(contentBlocks)
          .set({ active: false, updatedAt: new Date() })
          .where(and(eq(contentBlocks.id, row.id), eq(contentBlocks.type, "social_link")));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao salvar redes sociais";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

