import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  if (slug) {
    const [post] = await db.select().from(posts)
      .where(eq(posts.slug, slug))
      .limit(1);
    if (!post || post.status !== "publicado") {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    return NextResponse.json(post);
  }

  let all = await db.select({
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
    .where(eq(posts.status, "publicado"))
    .orderBy(desc(posts.publishedAt), desc(posts.createdAt));

  if (category) {
    all = all.filter((p) => p.categoryId === category);
  }
  if (featured === "true") {
    all = all.filter((p) => p.featured);
  }
  const paginated = all.slice(offset, offset + limit);
  return NextResponse.json(paginated);
}
