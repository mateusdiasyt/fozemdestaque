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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{category.name}</h1>
        {category.description && (
          <p className="text-slate-600 mt-1">{category.description}</p>
        )}
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((post) => (
          <Link key={post.id} href={`/post/${post.slug}`} className="block group">
            <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {post.featuredImage && (
                <div className="aspect-video bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <h2 className="font-bold text-slate-800 group-hover:text-blue-600 line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.excerpt}</p>
                )}
                {post.publishedAt && (
                  <p className="text-xs text-slate-400 mt-2">
                    {format(new Date(post.publishedAt), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
