import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { PostEditor } from "@/components/admin/PostEditor";

export default async function NewPostPage() {
  const allCategories = await db.select().from(categories);
  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <h1 className="text-2xl font-bold text-slate-800 mb-4 shrink-0">Novo Post</h1>
      <div className="flex-1 min-h-0">
        <PostEditor categories={allCategories} />
      </div>
    </div>
  );
}
