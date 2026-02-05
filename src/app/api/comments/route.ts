import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { generateId } from "@/lib/utils";

const createCommentSchema = z.object({
  postId: z.string(),
  authorName: z.string().min(2),
  authorEmail: z.string().email(),
  content: z.string().min(5),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const postId = searchParams.get("postId");
  if (!postId) {
    return NextResponse.json({ error: "postId obrigatório" }, { status: 400 });
  }
  const all = await db.select({
    id: comments.id,
    authorName: comments.authorName,
    content: comments.content,
    createdAt: comments.createdAt,
  })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.approved, true)))
    .orderBy(desc(comments.createdAt));
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const id = generateId();
  await db.insert(comments).values({
    id,
    postId: parsed.data.postId,
    authorName: parsed.data.authorName,
    authorEmail: parsed.data.authorEmail,
    content: parsed.data.content,
    approved: false,
  });
  return NextResponse.json({ id, message: "Comentário enviado para moderação" });
}
