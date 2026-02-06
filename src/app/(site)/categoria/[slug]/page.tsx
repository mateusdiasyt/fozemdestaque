import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [cat] = await db.select().from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (!cat) return {};
  return {
    title: cat.name,
    description: cat.description || undefined,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category] = await db.select().from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (!category || !category.active) notFound();

  const items = await db.select({
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    excerpt: posts.excerpt,
    featuredImage: posts.featuredImage,
    publishedAt: posts.publishedAt,
  })
    .from(posts)
    .where(eq(posts.categoryId, category.id))
    .orderBy(desc(posts.publishedAt));

  return (
    <div>
      <header className="mb-8">
        <Link href="/" className="text-sm text-[#ff751f] hover:text-[#e56a1a] font-medium mb-2 inline-block">
          ← Voltar ao início
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="h-1 w-12 bg-[#ff751f] rounded" />
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#000000]">
            {category.name}
          </h1>
        </div>
        {category.description && (
          <p className="text-[#4e5b60] mt-1">{category.description}</p>
        )}
      </header>
      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((post) => (
            <Link key={post.id} href={`/post/${post.slug}`} className="block group">
              <article className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all border border-[#e8ebed]">
                {post.featuredImage ? (
                  <div className="aspect-video bg-[#e8ebed]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-[#e8ebed] flex items-center justify-center">
                    <span className="text-[#859eac] font-headline text-2xl">Foz</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-[#859eac] line-clamp-2 mt-1">{post.excerpt}</p>
                  )}
                  {post.publishedAt && (
                    <p className="text-xs text-[#859eac] mt-2">
                      {format(new Date(post.publishedAt), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border-2 border-dashed border-[#859eac] p-12 text-center">
          <p className="text-[#4e5b60]">Nenhuma notícia publicada nesta categoria ainda.</p>
        </div>
      )}
    </div>
  );
}
