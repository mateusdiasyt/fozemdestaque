import { notFound } from "next/navigation";
import Link from "next/link";
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
    <article className="bg-white rounded-lg shadow-lg border border-[#e8ebed] overflow-hidden">
      <header className="p-6 md:p-10">
        <Link href="/" className="text-sm text-[#ff751f] hover:text-[#e56a1a] font-medium mb-2 inline-block">
          ← Voltar ao início
        </Link>
        {category && (
          <Link
            href={`/categoria/${category.slug}`}
            className="inline-block text-sm text-[#ff751f] font-bold uppercase tracking-wide hover:underline"
          >
            {category.name}
          </Link>
        )}
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-[#000000] mt-2 leading-tight">
          {post.title}
        </h1>
        <time
          dateTime={post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined}
          className="block text-[#4e5b60] text-sm mt-3"
        >
          {post.publishedAt
            ? format(new Date(post.publishedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            : format(new Date(post.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </time>
      </header>
      {post.featuredImage && (
        <div className="aspect-video md:aspect-[21/9] bg-[#e8ebed]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.featuredImage}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div
        className="p-6 md:p-10 prose prose-lg max-w-none font-headline [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-[#000000] [&_h2]:mt-8 [&_h2]:mb-4 [&_p]:text-[#4e5b60] [&_p]:leading-relaxed [&_a]:text-[#ff751f] [&_a]:hover:text-[#e56a1a]"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      <PostComments postId={post.id} />
    </article>
  );
}
