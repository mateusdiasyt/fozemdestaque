import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { PostEditor } from "@/components/admin/PostEditor";

export default async function NewPostPage() {
  const allCategories = await db.select().from(categories);
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Novo Post</h1>
      <PostEditor categories={allCategories} />
    </div>
  );
}
