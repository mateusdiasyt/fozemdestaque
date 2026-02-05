import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) notFound();
  const allCategories = await db.select().from(categories);
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Editar Post</h1>
      <PostEditor post={post} categories={allCategories} />
    </div>
  );
}
