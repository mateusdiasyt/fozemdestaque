import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { getPublishedPostsBase } from "@/lib/public-posts";
import { parseCategoryIds, postHasCategory } from "@/lib/post-categories";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const featured = searchParams.get("featured");
  const q = searchParams.get("q")?.trim().toLowerCase();
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

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

  let all = await getPublishedPostsBase();

  if (q) {
    all = all.filter((post) =>
      [post.title, post.excerpt, post.content]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  if (category) {
    all = all.filter((post) => postHasCategory(post, category));
  }

  if (featured === "true") {
    all = all.filter((post) => post.featured);
  }

  return NextResponse.json(
    all.slice(offset, offset + limit).map((post) => ({
      ...post,
      categoryIds: parseCategoryIds(post.categoryIds, post.categoryId),
    }))
  );
}

