import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { CommentsManager } from "@/components/admin/CommentsManager";

export default async function AdminCommentsPage() {
  const all = await db.select().from(comments).orderBy(desc(comments.createdAt));
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Comentários</h1>
      <CommentsManager comments={all} />
    </div>
  );
}
