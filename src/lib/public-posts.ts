import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { parseCategoryIds, postHasCategory } from "@/lib/post-categories";

export type PublishedPostCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string | null;
  featuredImage: string | null;
  featuredImageAlt?: string | null;
  featuredImageTitle?: string | null;
  categoryId: string | null;
  categoryIds: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  featured?: boolean;
};

export async function getPublishedPostsBase() {
  const now = new Date();

  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      content: posts.content,
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
    .where(and(eq(posts.status, "publicado"), or(isNull(posts.publishedAt), lte(posts.publishedAt, now))))
    .orderBy(sql`coalesce(${posts.publishedAt}, ${posts.createdAt}) desc`, desc(posts.createdAt));
}

export function withParsedCategoryIds<T extends { categoryId: string | null; categoryIds: string | null }>(
  items: T[]
) {
  return items.map((item) => ({
    ...item,
    parsedCategoryIds: parseCategoryIds(item.categoryIds, item.categoryId),
  }));
}

export function filterPublishedPostsByCategory<
  T extends { categoryId: string | null; categoryIds: string | null }
>(items: T[], categoryId: string) {
  return items.filter((item) => postHasCategory(item, categoryId));
}
