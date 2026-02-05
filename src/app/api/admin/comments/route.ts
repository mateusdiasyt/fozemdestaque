import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "comments")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  const approved = searchParams.get("approved");

  let all = await db.select({
    id: comments.id,
    postId: comments.postId,
    authorName: comments.authorName,
    authorEmail: comments.authorEmail,
    content: comments.content,
    approved: comments.approved,
    createdAt: comments.createdAt,
  }).from(comments).orderBy(desc(comments.createdAt));

  if (postId) all = all.filter((c) => c.postId === postId);
  if (approved === "true") all = all.filter((c) => c.approved);
  if (approved === "false") all = all.filter((c) => !c.approved);

  return NextResponse.json(all);
}
