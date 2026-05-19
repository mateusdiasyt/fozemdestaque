import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";
import {
  DEFAULT_SITE_CUSTOMIZATION,
  getSiteCustomization,
  siteCustomizationKeys,
} from "@/lib/site-customization";
import { generateId } from "@/lib/utils";

const customizationSchema = z.object({
  pageTitle: z.string().trim().min(2).max(80),
  faviconUrl: z.string().trim().url().or(z.literal("")),
});

function canManageSettings(role: string | null | undefined) {
  return hasPermission(
    (role as "administrador" | "editor" | "colaborador") ?? "colaborador",
    "settings"
  );
}

async function upsertSetting(key: string, value: string) {
  const [existing] = await db
    .select({ id: contentBlocks.id })
    .from(contentBlocks)
    .where(and(eq(contentBlocks.type, siteCustomizationKeys.type), eq(contentBlocks.slug, key)))
    .limit(1);

  const payload = {
    title: key,
    slug: key,
    excerpt: key === siteCustomizationKeys.pageTitle ? "Page title" : "Favicon URL",
    content: value,
    link: key === siteCustomizationKeys.faviconUrl ? value : null,
    active: true,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(contentBlocks).set(payload).where(eq(contentBlocks.id, existing.id));
    return;
  }

  await db.insert(contentBlocks).values({
    id: generateId(),
    type: siteCustomizationKeys.type,
    order: key === siteCustomizationKeys.pageTitle ? 0 : 1,
    ...payload,
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !canManageSettings(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const settings = await getSiteCustomization();
  return NextResponse.json({
    pageTitle: settings.pageTitle || DEFAULT_SITE_CUSTOMIZATION.pageTitle,
    faviconUrl: settings.faviconUrl || DEFAULT_SITE_CUSTOMIZATION.faviconUrl,
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || !canManageSettings(session.user.role)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = customizationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await upsertSetting(siteCustomizationKeys.pageTitle, parsed.data.pageTitle);
  await upsertSetting(siteCustomizationKeys.faviconUrl, parsed.data.faviconUrl);

  return NextResponse.json({ ok: true });
}
