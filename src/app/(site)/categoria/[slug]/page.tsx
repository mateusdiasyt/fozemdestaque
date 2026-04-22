import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";

const PAGE_SIZE = 13;

function formatCategoryDate(date: Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);

  if (!category) return {};

  return {
    title: category.name,
    description: category.description || undefined,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const requestedPage = Number.parseInt(resolvedSearch.page ?? "1", 10);

  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!category || !category.active) notFound();

  const [{ totalItems }] = await db
    .select({ totalItems: count() })
    .from(posts)
    .where(eq(posts.categoryId, category.id));

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  const items = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      featuredImage: posts.featuredImage,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(eq(posts.categoryId, category.id))
    .orderBy(desc(posts.publishedAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const [lead, ...rest] = items;
  const sidebarStories = rest.slice(0, 4);
  const gridStories = rest.slice(4);

  function pageHref(page: number) {
    return page <= 1 ? `/categoria/${category.slug}` : `/categoria/${category.slug}?page=${page}`;
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      <header className="relative overflow-hidden rounded-[30px] border border-[#e6ddcf] bg-[radial-gradient(circle_at_top_left,_#fff4ea,_#ffffff_52%,_#f4f6f7_100%)] px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:px-8 md:py-10">
        <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-[#ff751f]/10 blur-3xl" />

        <Link href="/" className="inline-flex text-sm font-medium text-[#ff751f] transition-colors hover:text-[#e56a1a]">
          ← Voltar ao início
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff751f]">Editoria</p>
            <h1 className="mt-2 font-headline text-3xl font-semibold tracking-tight text-[#102033] md:text-5xl">
              {category.name}
            </h1>
            {category.description && <p className="mt-3 text-base leading-7 text-[#5f707d]">{category.description}</p>}
          </div>

          <div className="rounded-[22px] border border-[#eadfd2] bg-white/80 px-5 py-4 text-sm text-[#5f707d] shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a9aa5]">Navegação</p>
            <p className="mt-2 font-medium text-[#102033]">
              Página {currentPage} de {totalPages}
            </p>
            <p className="mt-1">{totalItems} conteúdos publicados nesta editoria.</p>
          </div>
        </div>
      </header>

      {lead ? (
        <>
          <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <Link href={`/post/${lead.slug}`} className="group block">
              <article className="overflow-hidden rounded-[30px] border border-[#dfe5ea] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-[#e8ebed]">
                  {lead.featuredImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lead.featuredImage}
                        alt={lead.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.7)_100%)]" />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)]">
                      <span className="font-headline text-3xl text-[#8fa0ad]">Foz em Destaque</span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-5 md:p-7">
                    <span className="inline-flex rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
                      Destaque da editoria
                    </span>
                    <h2 className="mt-4 max-w-3xl font-headline text-2xl font-semibold leading-tight text-white md:text-4xl">
                      {lead.title}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 md:px-7">
                  <div className="min-w-0 flex-1">
                    {lead.excerpt && <p className="text-sm leading-7 text-[#5f707d] line-clamp-3">{lead.excerpt}</p>}
                    {lead.publishedAt && (
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8a9aa5]">
                        {formatCategoryDate(lead.publishedAt)}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center text-sm font-semibold text-[#102033] transition-colors group-hover:text-[#ff751f]">
                    Ler matéria →
                  </span>
                </div>
              </article>
            </Link>

            <div className="grid gap-4">
              {sidebarStories.map((post, index) => (
                <Link key={post.id} href={`/post/${post.slug}`} className="group block">
                  <article className="grid gap-4 rounded-[24px] border border-[#dfe5ea] bg-white p-4 shadow-[0_14px_35px_rgba(15,23,42,0.05)] transition-colors hover:bg-[#fffaf6] md:grid-cols-[112px_1fr]">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-[#eef2f4]">
                      {post.featuredImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={post.featuredImage} alt={post.title} className="h-full w-full object-cover" />
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)] text-sm font-medium text-[#8fa0ad]">
                          Foz em Destaque
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ff751f]">
                        {`${index + 2}`.padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 font-headline text-[1.15rem] font-semibold leading-snug text-[#102033] transition-colors group-hover:text-[#ff751f] line-clamp-3">
                        {post.title}
                      </h3>
                      {post.excerpt && <p className="mt-2 text-sm leading-6 text-[#5f707d] line-clamp-2">{post.excerpt}</p>}
                      {post.publishedAt && (
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a9aa5]">
                          {formatCategoryDate(post.publishedAt)}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>

          {gridStories.length > 0 && (
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {gridStories.map((post) => (
                <Link key={post.id} href={`/post/${post.slug}`} className="group block">
                  <article className="overflow-hidden rounded-[24px] border border-[#dfe5ea] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)] transition-transform hover:-translate-y-0.5">
                    <div className="aspect-[16/10] overflow-hidden bg-[#eef2f4]">
                      {post.featuredImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={post.featuredImage}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)] text-base font-medium text-[#8fa0ad]">
                          Foz em Destaque
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="font-headline text-[1.15rem] font-semibold leading-snug text-[#102033] transition-colors group-hover:text-[#ff751f] line-clamp-3">
                        {post.title}
                      </h3>
                      {post.excerpt && <p className="mt-2 text-sm leading-6 text-[#5f707d] line-clamp-3">{post.excerpt}</p>}
                      {post.publishedAt && (
                        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a9aa5]">
                          {formatCategoryDate(post.publishedAt)}
                        </p>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </section>
          )}
        </>
      ) : (
        <div className="rounded-[24px] border border-dashed border-[#d8e0e7] bg-white px-6 py-16 text-center text-[#5f707d]">
          Nenhum conteúdo publicado nesta editoria ainda.
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2 rounded-[24px] border border-[#e6ebef] bg-white px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
          <Link
            href={pageHref(Math.max(1, currentPage - 1))}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              currentPage === 1 ? "pointer-events-none bg-[#f4f6f7] text-[#9aabb7]" : "bg-[#fff4ea] text-[#ff751f] hover:bg-[#ffe9d6]"
            }`}
          >
            Página anterior
          </Link>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={pageHref(pageNumber)}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
                pageNumber === currentPage
                  ? "bg-[#102033] text-white"
                  : "bg-[#f4f6f7] text-[#5f707d] hover:bg-[#ffe9d6] hover:text-[#ff751f]"
              }`}
            >
              {pageNumber}
            </Link>
          ))}

          <Link
            href={pageHref(Math.min(totalPages, currentPage + 1))}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? "pointer-events-none bg-[#f4f6f7] text-[#9aabb7]"
                : "bg-[#fff4ea] text-[#ff751f] hover:bg-[#ffe9d6]"
            }`}
          >
            Próxima página
          </Link>
        </nav>
      )}
    </div>
  );
}
