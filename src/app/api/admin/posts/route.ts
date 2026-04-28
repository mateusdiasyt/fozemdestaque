import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { coercePostCategoryState, parseCategoryIds, postHasCategory } from "@/lib/post-categories";
import { generateId } from "@/lib/utils";
import { getUniquePostSlug } from "@/lib/post-slugs";

const createPostSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string(),
  featuredImage: z.string().optional().nullable(),
  featuredImageAlt: z.string().optional().nullable(),
  featuredImageTitle: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional().nullable(),
  status: z.enum(["rascunho", "em_analise", "publicado"]).default("rascunho"),
  featured: z.boolean().default(false),
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

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !isAllowed(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");

  const all = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      featuredImage: posts.featuredImage,
      featuredImageTitle: posts.featuredImageTitle,
      categoryId: posts.categoryId,
      categoryIds: posts.categoryIds,
      status: posts.status,
      featured: posts.featured,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .orderBy(desc(posts.createdAt));

  const filtered = all.filter((post) => {
    const matchesStatus = status ? post.status === status : true;
    const matchesCategory = categoryId ? postHasCategory(post, categoryId) : true;
    return matchesStatus && matchesCategory;
  });

  const withParsedCategories = filtered.map((post) => ({
    ...post,
    categoryIds: parseCategoryIds(post.categoryIds, post.categoryId),
  }));

  return NextResponse.json(withParsedCategories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !isAllowed(session.user.role)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const id = generateId();
  const slug = await getUniquePostSlug(parsed.data.slug, parsed.data.title);
  const categoryState = coercePostCategoryState({
    categoryId: parsed.data.categoryId ?? null,
    categoryIds: parsed.data.categoryIds ?? null,
  });
  const publishedAt =
    parsed.data.status === "publicado"
      ? parsed.data.publishedAt
        ? new Date(parsed.data.publishedAt)
        : new Date()
      : null;

  await db.insert(posts).values({
    id,
    title: parsed.data.title,
    slug,
    excerpt: parsed.data.excerpt ?? null,
    content: parsed.data.content,
    featuredImage: parsed.data.featuredImage ?? null,
    featuredImageAlt: parsed.data.featuredImageAlt ?? null,
    featuredImageTitle: parsed.data.featuredImageTitle ?? null,
    categoryId: categoryState.categoryId,
    categoryIds: categoryState.categoryIdsJson,
    tags: parsed.data.tags ?? null,
    scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
    canonicalUrl: parsed.data.canonicalUrl ?? null,
    faqJson: parsed.data.faqJson ?? null,
    authorId: session.user.id ?? null,
    status: parsed.data.status,
    featured: parsed.data.featured ?? false,
    metaTitle: parsed.data.metaTitle ?? null,
    metaDescription: parsed.data.metaDescription ?? null,
    focusKeyword: parsed.data.focusKeyword ?? null,
    publishedAt,
  });

  return NextResponse.json({ id, title: parsed.data.title, slug });
}
