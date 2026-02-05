import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

async function getFeaturedPost() {
  const [post] = await db.select().from(posts)
    .where(eq(posts.status, "publicado"))
    .orderBy(desc(posts.featured), desc(posts.publishedAt))
    .limit(1);
  return post;
}

async function getPostsByCategory(slug: string, limit: number) {
  const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!cat) return [];
  return db.select({
    id: posts.id,
    title: posts.title,
    slug: posts.slug,
    excerpt: posts.excerpt,
    featuredImage: posts.featuredImage,
    publishedAt: posts.publishedAt,
  })
    .from(posts)
    .where(eq(posts.categoryId, cat.id))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
}

export default async function HomePage() {
  const [featured, society, tiTiTi, merchandising, agenda, topProfissional] = await Promise.all([
    getFeaturedPost(),
    getPostsByCategory("society", 3),
    getPostsByCategory("ti-ti-ti", 3),
    getPostsByCategory("merchandising", 2),
    getPostsByCategory("agenda", 2),
    getPostsByCategory("top-profissional", 2),
  ]);

  return (
    <div className="space-y-8">
      {/* Destaque do Dia */}
      {featured && (
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">
            Destaque do Dia
          </h2>
          <Link href={`/post/${featured.slug}`} className="block group">
            <article className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row">
              {featured.featuredImage && (
                <div className="md:w-80 shrink-0 aspect-video md:aspect-square bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={featured.featuredImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 flex-1">
                <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {featured.title}
                </h3>
                {featured.excerpt && (
                  <p className="mt-2 text-slate-600 line-clamp-2">{featured.excerpt}</p>
                )}
                <p className="mt-2 text-sm text-slate-500">
                  {featured.publishedAt && format(new Date(featured.publishedAt), "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            </article>
          </Link>
        </section>
      )}

      {/* Society, Ti-ti-ti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ContentSection title="Society" posts={society} />
        <ContentSection title="Ti-ti-ti" posts={tiTiTi} />
      </div>

      {/* Bloco Inferior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ContentSection title="Merchandising" posts={merchandising} />
        <ContentSection title="Agenda" posts={agenda} />
        <ContentSection title="Top Profissional" posts={topProfissional} />
      </div>
    </div>
  );
}

function ContentSection({
  title,
  posts: items,
}: {
  title: string;
  posts: { id: string; title: string; slug: string; excerpt: string | null; featuredImage: string | null; publishedAt: Date | null }[];
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-200 pb-2">
        {title}
      </h2>
      <div className="space-y-4">
        {items.map((post) => (
          <Link key={post.id} href={`/post/${post.slug}`} className="block group">
            <article className="flex gap-3">
              {post.featuredImage && (
                <div className="w-20 h-20 shrink-0 rounded overflow-hidden bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.featuredImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-medium text-slate-800 group-hover:text-blue-600 line-clamp-2">
                  {post.title}
                </h3>
                {post.excerpt && <p className="text-sm text-slate-500 line-clamp-1">{post.excerpt}</p>}
                {post.publishedAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    {format(new Date(post.publishedAt), "dd/MM", { locale: ptBR })}
                  </p>
                )}
              </div>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
