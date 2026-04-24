import { NextResponse } from "next/server";
import { and, eq, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const q = searchParams.get("q")?.trim();
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const now = new Date();

  if (slug) {
    const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);

    if (!post || post.status !== "publicado" || (post.publishedAt && new Date(post.publishedAt) > now)) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }

    return NextResponse.json(post);
  }

  const baseWhere = and(eq(posts.status, "publicado"), or(isNull(posts.publishedAt), lte(posts.publishedAt, now)));
  const whereClause = q
    ? and(
        baseWhere,
        or(ilike(posts.title, `%${q}%`), ilike(posts.excerpt, `%${q}%`), ilike(posts.content, `%${q}%`))
      )
    : baseWhere;

  let all = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      featuredImage: posts.featuredImage,
      categoryId: posts.categoryId,
      featured: posts.featured,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(whereClause)
    .orderBy(sql`coalesce(${posts.publishedAt}, ${posts.createdAt}) desc`);

  if (category) {
    all = all.filter((post) => post.categoryId === category);
  }

  if (featured === "true") {
    all = all.filter((post) => post.featured);
  }

  return NextResponse.json(all.slice(offset, offset + limit));
}
