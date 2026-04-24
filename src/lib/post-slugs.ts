import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { slugify } from "@/lib/utils";

export async function getUniquePostSlug(
  rawSlug: string | null | undefined,
  title: string,
  currentPostId?: string
) {
  const preferredSource = rawSlug?.trim() || title.trim();
  const fallbackSource = title.trim() || "post";
  const baseSlug = slugify(preferredSource) || slugify(fallbackSource) || "post";

  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(
        currentPostId
          ? and(eq(posts.slug, candidate), ne(posts.id, currentPostId))
          : eq(posts.slug, candidate)
      )
      .limit(1);

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
