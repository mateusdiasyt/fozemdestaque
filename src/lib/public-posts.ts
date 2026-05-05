import { and, desc, eq, isNull, like, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { parseCategoryIds, postHasCategory } from "@/lib/post-categories";
import { safeSiteQuery } from "@/lib/safe-site-query";

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

type PublishedPostsOptions = {
  includeContent?: boolean;
  limit?: number;
  offset?: number;
};

type PublishedPostsByCategoryOptions = PublishedPostsOptions & {
  featured?: boolean;
};

function buildPublishedPostsWhere(now: Date) {
  return and(eq(posts.status, "publicado"), or(isNull(posts.publishedAt), lte(posts.publishedAt, now)));
}

function buildCategoryWhere(categoryId: string, now: Date, featured = false) {
  const conditions = [
    buildPublishedPostsWhere(now),
    or(eq(posts.categoryId, categoryId), like(posts.categoryIds, `%\"${categoryId}\"%`)),
  ];

  if (featured) {
    conditions.push(eq(posts.featured, true));
  }

  return and(...conditions);
}

function buildPublishedSummaryQuery(whereClause: ReturnType<typeof and>) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      content: sql<string | null>`null`,
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
    .where(whereClause)
    .orderBy(sql`coalesce(${posts.publishedAt}, ${posts.createdAt}) desc`, desc(posts.createdAt));
}

function buildPublishedContentQuery(whereClause: ReturnType<typeof and>) {
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
    .where(whereClause)
    .orderBy(sql`coalesce(${posts.publishedAt}, ${posts.createdAt}) desc`, desc(posts.createdAt));
}

function applyPublishedPostsPagination(query: any, options: PublishedPostsOptions) {
  const { limit, offset } = options;

  if (typeof limit === "number" && typeof offset === "number" && offset > 0) {
    return query.limit(limit).offset(offset);
  }

  if (typeof limit === "number") {
    return query.limit(limit);
  }

  if (typeof offset === "number" && offset > 0) {
    return query.offset(offset);
  }

  return query;
}

export async function getPublishedPostsBase(
  options: PublishedPostsOptions = {}
): Promise<PublishedPostCard[]> {
  const now = new Date();
  const { includeContent = false } = options;

  return safeSiteQuery(
    async () => {
      const whereClause = buildPublishedPostsWhere(now);

      if (includeContent) {
        return applyPublishedPostsPagination(buildPublishedContentQuery(whereClause), options);
      }

      return applyPublishedPostsPagination(buildPublishedSummaryQuery(whereClause), options);
    },
    [],
    includeContent ? "published posts with content" : "published posts summary"
  );
}

export async function getPublishedPostsByCategory(
  categoryId: string,
  options: PublishedPostsByCategoryOptions = {}
): Promise<PublishedPostCard[]> {
  const now = new Date();
  const { includeContent = false, featured = false } = options;

  return safeSiteQuery(
    async () => {
      const whereClause = buildCategoryWhere(categoryId, now, featured);

      if (includeContent) {
        return applyPublishedPostsPagination(buildPublishedContentQuery(whereClause), options);
      }

      return applyPublishedPostsPagination(buildPublishedSummaryQuery(whereClause), options);
    },
    [],
    `published posts by category:${categoryId}`
  );
}

export async function countPublishedPostsByCategory(categoryId: string): Promise<number> {
  const now = new Date();

  return safeSiteQuery(
    async () => {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(buildCategoryWhere(categoryId, now));

      return result?.count ?? 0;
    },
    0,
    `published posts count by category:${categoryId}`
  );
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
