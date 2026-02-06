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
    <div className="space-y-10">
      {/* Destaque do Dia - Hero */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="h-1 w-12 bg-[#ff751f] rounded" />
          <h2 className="font-headline text-xl font-bold text-[#000000] uppercase tracking-wide">
            Destaque do Dia
          </h2>
        </div>
        {featured ? (
          <Link href={`/post/${featured.slug}`} className="block group">
            <article className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-[#e8ebed]">
              <div className="flex flex-col md:flex-row">
                <div className="md:w-2/5 aspect-video md:aspect-square bg-[#e8ebed]">
                  {featured.featuredImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={featured.featuredImage}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#e8ebed] to-[#859eac]/30 flex items-center justify-center">
                      <span className="text-[#859eac] font-headline text-4xl">Foz</span>
                    </div>
                  )}
                </div>
                <div className="p-6 md:p-8 flex-1 flex flex-col justify-center">
                  <h3 className="font-headline text-2xl md:text-3xl font-bold text-[#000000] group-hover:text-[#ff751f] transition-colors leading-tight">
                    {featured.title}
                  </h3>
                  {featured.excerpt && (
                    <p className="mt-3 text-[#4e5b60] line-clamp-3 text-lg">{featured.excerpt}</p>
                  )}
                  <p className="mt-4 text-sm text-[#ff751f] font-semibold">
                    {featured.publishedAt && format(new Date(featured.publishedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    <span className="ml-2">→ Ler mais</span>
                  </p>
                </div>
              </div>
            </article>
          </Link>
        ) : (
          <div className="bg-white rounded-lg border-2 border-dashed border-[#859eac] p-12 text-center">
            <p className="text-[#4e5b60]">Nenhuma matéria em destaque no momento.</p>
            <p className="text-sm text-[#859eac] mt-2">Acesse o painel admin para publicar conteúdos.</p>
          </div>
        )}
      </section>

      {/* Society e Ti-ti-ti */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ContentSection title="Society" slug="society" posts={society} />
        <ContentSection title="Ti-ti-ti" slug="ti-ti-ti" posts={tiTiTi} />
      </div>

      {/* Bloco Inferior */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ContentSection title="Merchandising" slug="merchandising" posts={merchandising} />
        <ContentSection title="Agenda" slug="agenda" posts={agenda} />
        <ContentSection title="Top Profissional" slug="top-profissional" posts={topProfissional} />
      </div>
    </div>
  );
}

function ContentSection({
  title,
  slug,
  posts: items,
}: {
  title: string;
  slug: string;
  posts: { id: string; title: string; slug: string; excerpt: string | null; featuredImage: string | null; publishedAt: Date | null }[];
}) {
  return (
    <section>
      <Link href={`/categoria/${slug}`} className="flex items-center gap-3 mb-4 group">
        <span className="h-1 w-8 bg-[#ff751f] rounded group-hover:w-12 transition-all" />
        <h2 className="font-headline text-lg font-bold text-[#000000] uppercase tracking-wide group-hover:text-[#ff751f] transition-colors">
          {title}
        </h2>
      </Link>
      <div className="bg-white rounded-lg shadow-md border border-[#e8ebed] overflow-hidden">
        {items.length > 0 ? (
          <div className="divide-y divide-[#e8ebed]">
            {items.map((post) => (
              <Link key={post.id} href={`/post/${post.slug}`} className="flex gap-4 p-4 hover:bg-[#f5f6f7] transition-colors group">
                {post.featuredImage ? (
                  <div className="w-24 h-24 shrink-0 rounded overflow-hidden bg-[#e8ebed]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.featuredImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                ) : (
                  <div className="w-24 h-24 shrink-0 rounded bg-[#e8ebed] flex items-center justify-center">
                    <span className="text-[#859eac] text-xs">Foz</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors">
                    {post.title}
                  </h3>
                  {post.excerpt && <p className="text-sm text-[#859eac] line-clamp-1 mt-0.5">{post.excerpt}</p>}
                  {post.publishedAt && (
                    <p className="text-xs text-[#859eac] mt-1">
                      {format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-[#859eac] text-sm">
            Nenhuma notícia em {title.toLowerCase()}.
          </div>
        )}
      </div>
    </section>
  );
}
