import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { PostsListClient } from "@/components/admin/PostsListClient";

export default async function AdminPostsPage() {
  const allPosts = await db.select({
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    status: posts.status,
    featured: posts.featured,
    publishedAt: posts.publishedAt,
    createdAt: posts.createdAt,
    categoryId: posts.categoryId,
  }).from(posts).orderBy(desc(posts.createdAt));
  const allCategories = await db.select().from(categories);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Posts</h1>
        <Link
          href="/admin/posts/novo"
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Novo Post
        </Link>
      </div>
      <PostsListClient posts={allPosts} categories={allCategories} />
    </div>
  );
}
