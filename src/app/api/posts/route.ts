import { NextResponse } from "next/server";
import { and, eq, ilike, isNull, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { parseCategoryIds } from "@/lib/post-categories";
import { safeSiteQuery } from "@/lib/safe-site-query";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const q = searchParams.get("q")?.trim().toLowerCase();
  const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

  if (slug) {
    const now = new Date();
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);

    if (!post || post.status !== "publicado" || (post.publishedAt && new Date(post.publishedAt) > now)) {
      return NextResponse.json({ error: "Nao encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      ...post,
      categoryIds: parseCategoryIds(post.categoryIds, post.categoryId),
    });
  }

  const now = new Date();
  const conditions = [
    eq(posts.status, "publicado"),
    or(isNull(posts.publishedAt), lte(posts.publishedAt, now)),
  ];

  if (category) {
    conditions.push(or(eq(posts.categoryId, category), like(posts.categoryIds, `%\"${category}\"%`)));
  }

  if (featured === "true") {
    conditions.push(eq(posts.featured, true));
  }

  if (q) {
    const pattern = `%${q}%`;
    conditions.push(or(ilike(posts.title, pattern), ilike(posts.excerpt, pattern), ilike(posts.content, pattern)));
  }

  const rows = await safeSiteQuery(
    () =>
      db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          excerpt: posts.excerpt,
          content: q ? posts.content : sql<string | null>`null`,
          featuredImage: posts.featuredImage,
          featuredImageAlt: posts.featuredImageAlt,
          featuredImageTitle: posts.featuredImageTitle,
          categoryId: posts.categoryId,
          categoryIds: posts.categoryIds,
          publishedAt: posts.publishedAt,
          createdAt: posts.createdAt,
          featured: posts.featured,
        })
        .from(posts)
        .where(and(...conditions))
        .orderBy(sql`coalesce(${posts.publishedAt}, ${posts.createdAt}) desc`, sql`${posts.createdAt} desc`)
        .limit(limit)
        .offset(offset),
    [],
    `api posts:${category ?? "all"}:${q ?? ""}:${featured ?? "false"}`
  );

  return NextResponse.json(
    rows.map((post) => ({
      ...post,
      categoryIds: parseCategoryIds(post.categoryIds, post.categoryId),
    }))
  );
}
