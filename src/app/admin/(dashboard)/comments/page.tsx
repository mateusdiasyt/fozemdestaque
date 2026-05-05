import { desc } from "drizzle-orm";
import { AdminDataWarning } from "@/components/admin/AdminDataWarning";
import { CommentsManager } from "@/components/admin/CommentsManager";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { safeAdminQuery } from "@/lib/safe-admin-query";

type AdminCommentRow = {
  id: string;
  postId: string;
  authorName: string;
  authorEmail: string;
  content: string;
  approved: boolean;
  createdAt: Date;
};

export default async function AdminCommentsPage() {
  const commentsResult = await safeAdminQuery<AdminCommentRow[]>(
    async () => db.select().from(comments).orderBy(desc(comments.createdAt)) as Promise<AdminCommentRow[]>,
    [],
    "comments"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-100">Comentarios</h1>
        <p className="text-sm text-slate-400">Aprovacao e moderacao das mensagens do portal.</p>
      </div>

      {commentsResult.unavailable ? <AdminDataWarning /> : null}

      <CommentsManager comments={commentsResult.data} />
    </div>
  );
}
