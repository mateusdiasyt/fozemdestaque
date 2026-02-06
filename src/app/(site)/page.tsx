import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories, contentBlocks } from "@/lib/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

async function getFeaturedWithCategory() {
  const [row] = await db
    .select({
      post: posts,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.status, "publicado"))
    .orderBy(desc(posts.featured), desc(posts.publishedAt))
    .limit(1);
  return row;
}

async function getRecentPostsWithCategory(limit = 6) {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      featuredImage: posts.featuredImage,
      publishedAt: posts.publishedAt,
      content: posts.content,
      categoryId: posts.categoryId,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(posts)
    .leftJoin(categories, eq(posts.categoryId, categories.id))
    .where(eq(posts.status, "publicado"))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
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

async function getAniversariantesDoDia(limit = 10) {
  return db.select()
    .from(contentBlocks)
    .where(and(eq(contentBlocks.type, "aniversario"), eq(contentBlocks.active, true)))
    .orderBy(asc(contentBlocks.order))
    .limit(limit);
}

function estimateReadTime(content: string | null): number {
  if (!content) return 2;
  const words = content.replace(/<[^>]+>/g, "").split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default async function HomePage() {
  const [featuredRow, recent, reflexao, aniversariantesBlocks, aniversariosPosts, society, tiTiTi, merchandising, agenda, topProfissional] = await Promise.all([
    getFeaturedWithCategory(),
    getRecentPostsWithCategory(8),
    getPostsByCategory("reflexao", 6),
    getAniversariantesDoDia(10),
    getPostsByCategory("aniversarios", 6),
    getPostsByCategory("society", 3),
    getPostsByCategory("ti-ti-ti", 3),
    getPostsByCategory("merchandising", 2),
    getPostsByCategory("agenda", 2),
    getPostsByCategory("top-profissional", 2),
  ]);

  const featured = featuredRow?.post;
  const belowCardzao = featured ? recent.filter((p) => p.id !== featured.id).slice(0, 3) : recent.slice(0, 3);
  const aniversariantes = aniversariantesBlocks.length > 0 ? aniversariantesBlocks : null;

  return (
    <div className="space-y-10">
      {/* Layout 3 colunas: Cardzão (esq) | Aniversariantes (centro) | Reflexão (dir) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Coluna esquerda: Cardzão + outras notícias abaixo */}
        <div className="lg:col-span-6 space-y-6">
          {/* Cardzão - notícia mais recente em destaque */}
          <div className="min-h-[320px]">
            {featured ? (
              <Link href={`/post/${featured.slug}`} className="block group">
                <article className="relative h-full min-h-[320px] rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 bg-[#e8ebed]">
                  {featured.featuredImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={featured.featuredImage}
                      alt={featured.title}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#e8ebed] to-[#859eac]/30 flex items-center justify-center">
                      <span className="text-[#859eac] font-headline text-4xl">Foz</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-3 py-1 bg-black/70 text-white text-xs font-medium rounded-full">
                      {featuredRow?.categoryName ?? "Destaque do Dia"}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <h3 className="font-headline text-xl md:text-2xl font-bold group-hover:text-[#ff751f] transition-colors leading-tight line-clamp-2">
                      {featured.title}
                    </h3>
                    {featured.excerpt && (
                      <p className="mt-2 text-white/90 text-sm line-clamp-2">{featured.excerpt}</p>
                    )}
                    <p className="mt-3 text-[#ff751f] text-sm font-semibold">
                      {featured.publishedAt && format(new Date(featured.publishedAt), "dd 'de' MMMM", { locale: ptBR })}
                      <span className="ml-2">→ Ler mais</span>
                    </p>
                  </div>
                </article>
              </Link>
            ) : (
              <div className="rounded-xl bg-white border-2 border-dashed border-[#859eac] p-12 text-center min-h-[320px] flex flex-col items-center justify-center">
                <p className="text-[#4e5b60]">Nenhuma matéria em destaque no momento.</p>
                <p className="text-sm text-[#859eac] mt-2">Acesse o painel admin para publicar conteúdos.</p>
              </div>
            )}
          </div>

          {/* Outras notícias abaixo do cardzão */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {belowCardzao.map((post) => (
              <Link key={post.id} href={`/post/${post.slug}`} className="block group">
                <article className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-[#e8ebed] bg-white">
                  {post.featuredImage ? (
                    <div className="aspect-video bg-[#e8ebed]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.featuredImage}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-[#e8ebed] flex items-center justify-center">
                      <span className="text-[#859eac] text-sm">Foz</span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs text-[#859eac]">
                      {post.categoryName && (
                        <span className="font-medium text-[#ff751f]">{post.categoryName} · </span>
                      )}
                      {post.publishedAt && format(new Date(post.publishedAt), "dd MMM", { locale: ptBR })}
                    </p>
                    <h3 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors text-sm mt-0.5">
                      {post.title}
                    </h3>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>

        {/* Coluna centro: Aniversariantes do dia */}
        <div className="lg:col-span-3">
          <Link href="/categoria/aniversarios" className="flex items-center gap-3 mb-4 group">
            <span className="h-1 w-8 bg-[#ff751f] rounded group-hover:w-12 transition-all" />
            <h2 className="font-headline text-lg font-bold text-[#000000] uppercase tracking-wide group-hover:text-[#ff751f] transition-colors">
              Aniversariantes do dia
            </h2>
          </Link>
          <div className="bg-white rounded-xl shadow-sm border border-[#e8ebed] overflow-hidden">
            {aniversariantes ? (
              <div className="divide-y divide-[#e8ebed]">
                {aniversariantes.map((item) => (
                  <div key={item.id} className="p-4">
                    {item.link ? (
                      <Link href={item.link} className="block hover:bg-[#f8f9fa] -m-4 p-4 transition-colors group">
                        <h3 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors text-sm">
                          {item.title}
                        </h3>
                        {item.excerpt && (
                          <p className="text-xs text-[#859eac] line-clamp-1 mt-0.5">{item.excerpt}</p>
                        )}
                      </Link>
                    ) : (
                      <div>
                        <h3 className="font-headline font-bold text-[#4e5b60] text-sm">{item.title}</h3>
                        {item.excerpt && (
                          <p className="text-xs text-[#859eac] line-clamp-1 mt-0.5">{item.excerpt}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : aniversariosPosts.length > 0 ? (
              <div className="divide-y divide-[#e8ebed]">
                {aniversariosPosts.map((post) => (
                  <Link key={post.id} href={`/post/${post.slug}`} className="flex gap-4 p-4 hover:bg-[#f8f9fa] transition-colors group">
                    {post.featuredImage ? (
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[#e8ebed]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.featuredImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-[#e8ebed] flex items-center justify-center">
                        <span className="text-[#859eac] text-xs">Foz</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors text-sm">
                        {post.title}
                      </h3>
                      {post.publishedAt && (
                        <p className="text-xs text-[#859eac] mt-0.5">
                          {format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[#859eac] text-sm">
                Nenhum aniversariante hoje. Confira em{" "}
                <Link href="/categoria/aniversarios" className="text-[#ff751f] hover:underline">
                  Aniversários
                </Link>
                .
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita: Reflexão */}
        <div className="lg:col-span-3">
          <Link href="/categoria/reflexao" className="flex items-center gap-3 mb-4 group">
            <span className="h-1 w-8 bg-[#ff751f] rounded group-hover:w-12 transition-all" />
            <h2 className="font-headline text-lg font-bold text-[#000000] uppercase tracking-wide group-hover:text-[#ff751f] transition-colors">
              Reflexão
            </h2>
          </Link>
          <div className="bg-white rounded-xl shadow-sm border border-[#e8ebed] overflow-hidden">
            {reflexao.length > 0 ? (
              <div className="divide-y divide-[#e8ebed]">
                {reflexao.map((post) => (
                  <Link key={post.id} href={`/post/${post.slug}`} className="flex gap-4 p-4 hover:bg-[#f8f9fa] transition-colors group">
                    {post.featuredImage ? (
                      <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-[#e8ebed]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.featuredImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 shrink-0 rounded-lg bg-[#e8ebed] flex items-center justify-center">
                        <span className="text-[#859eac] text-xs">Foz</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors text-sm">
                        {post.title}
                      </h3>
                      {post.publishedAt && (
                        <p className="text-xs text-[#859eac] mt-0.5">
                          {format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-[#859eac] text-sm">
                Nenhuma reflexão no momento.
              </div>
            )}
          </div>
        </div>
      </div>

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
      <div className="bg-white rounded-xl shadow-sm border border-[#e8ebed] overflow-hidden">
        {items.length > 0 ? (
          <div className="divide-y divide-[#e8ebed]">
            {items.map((post) => (
              <Link key={post.id} href={`/post/${post.slug}`} className="flex gap-4 p-4 hover:bg-[#f8f9fa] transition-colors group">
                {post.featuredImage ? (
                  <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-[#e8ebed]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={post.featuredImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ) : (
                  <div className="w-24 h-24 shrink-0 rounded-lg bg-[#e8ebed] flex items-center justify-center">
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
