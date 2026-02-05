import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { generateId, slugify } from "@/lib/utils";

const createPostSchema = z.object({
  title: z.string().min(2),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string(),
  featuredImage: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  status: z.enum(["rascunho", "em_analise", "publicado"]).default("rascunho"),
  featured: z.boolean().default(false),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  focusKeyword: z.string().optional().nullable(),
  publishedAt: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "posts")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const categoryId = searchParams.get("categoryId");

  const all = await db.select({
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    excerpt: posts.excerpt,
    featuredImage: posts.featuredImage,
    categoryId: posts.categoryId,
    status: posts.status,
    featured: posts.featured,
    publishedAt: posts.publishedAt,
    createdAt: posts.createdAt,
  })
    .from(posts)
    .orderBy(desc(posts.createdAt));

  const filtered = status
    ? all.filter((p) => p.status === status)
    : categoryId
      ? all.filter((p) => p.categoryId === categoryId)
      : all;

  return NextResponse.json(filtered);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "posts")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json();
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const slug = parsed.data.slug || slugify(parsed.data.title);
  const id = generateId();
  const publishedAt = parsed.data.status === "publicado"
    ? (parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : new Date())
    : null;

  await db.insert(posts).values({
    id,
    title: parsed.data.title,
    slug,
    excerpt: parsed.data.excerpt ?? null,
    content: parsed.data.content,
    featuredImage: parsed.data.featuredImage ?? null,
    categoryId: parsed.data.categoryId ?? null,
    authorId: session.user.id ?? null,
    status: parsed.data.status,
    featured: parsed.data.featured ?? false,
    metaTitle: parsed.data.metaTitle ?? null,
    metaDescription: parsed.data.metaDescription ?? null,
    focusKeyword: parsed.data.focusKeyword ?? null,
    publishedAt,
  });
  return NextResponse.json({ id, title: parsed.data.title, slug });
}
