import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { coercePostCategoryState, parseCategoryIds } from "@/lib/post-categories";
import { getUniquePostSlug } from "@/lib/post-slugs";

const updatePostSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional().nullable(),
  content: z.string().optional(),
  featuredImage: z.string().optional().nullable(),
  featuredImageAlt: z.string().optional().nullable(),
  featuredImageTitle: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional().nullable(),
  status: z.enum(["rascunho", "em_analise", "publicado"]).optional(),
  featured: z.boolean().optional(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  canonicalUrl: z.string().optional().nullable(),
  faqJson: z.string().optional().nullable(),
  tags: z.string().optional().nullable(),
  scheduledAt: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
});

function isAllowed(role: string | null | undefined) {
  return hasPermission((role as "administrador" | "editor" | "colaborador") ?? "colaborador", "posts");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAllowed(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  return NextResponse.json({
    ...post,
    categoryIds: parseCategoryIds(post.categoryIds, post.categoryId),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAllowed(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updatePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [current] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!current) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });

  const updates: Record<string, unknown> = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  if (parsed.data.categoryId !== undefined || parsed.data.categoryIds !== undefined) {
    const categoryState = coercePostCategoryState({
      categoryId:
        parsed.data.categoryId !== undefined ? parsed.data.categoryId : current.categoryId,
      categoryIds:
        parsed.data.categoryIds !== undefined
          ? parsed.data.categoryIds
          : parseCategoryIds(current.categoryIds, current.categoryId),
    });
    updates.categoryId = categoryState.categoryId;
    updates.categoryIds = categoryState.categoryIdsJson;
  }

  if (parsed.data.scheduledAt !== undefined) {
    updates.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
  }

  if (parsed.data.slug !== undefined || parsed.data.title !== undefined) {
    updates.slug = await getUniquePostSlug(
      parsed.data.slug ?? current.slug,
      parsed.data.title ?? current.title,
      id
    );
  }

  if (parsed.data.status === "publicado") {
    if (parsed.data.publishedAt !== undefined) {
      updates.publishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date();
    } else if (!current.publishedAt) {
      updates.publishedAt = new Date();
    }
  }

  await db.update(posts).set(updates).where(eq(posts.id, id));
  return NextResponse.json({ ok: true, slug: updates.slug ?? current.slug });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !isAllowed(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await db.delete(posts).where(eq(posts.id, id));
  return NextResponse.json({ ok: true });
}
