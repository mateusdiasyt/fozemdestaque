import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Metadata } from "next";
import { PostComments } from "@/components/site/PostComments";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [post] = await db.select().from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);
  if (!post || post.status !== "publicado") return {};
  return {
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
      images: post.featuredImage ? [post.featuredImage] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post] = await db.select().from(posts)
    .where(eq(posts.slug, slug))
    .limit(1);
  if (!post || post.status !== "publicado") notFound();

  const [category] = post.categoryId
    ? await db.select().from(categories).where(eq(categories.id, post.categoryId)).limit(1)
    : [null];

  return (
    <article className="bg-white rounded-xl shadow-sm overflow-hidden">
      <header className="p-6 md:p-8">
        {category && (
          <span className="text-sm text-blue-600 font-medium">{category.name}</span>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
          {post.title}
        </h1>
        <time
          dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}
          className="block text-slate-500 text-sm mt-2"
        >
          {post.publishedAt
            ? format(new Date(post.publishedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            : format(new Date(post.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </time>
      </header>
      {post.featuredImage && (
        <div className="aspect-video md:aspect-[21/9] bg-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.featuredImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div
        className="p-6 md:p-8 prose prose-slate max-w-none"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <PostComments postId={post.id} />
    </article>
  );
}
