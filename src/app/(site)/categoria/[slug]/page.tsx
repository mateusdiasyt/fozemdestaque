import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { SiteImage } from "@/components/site/SiteImage";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";

const PAGE_SIZE = 13;
const MONTHS_PT: Record<string, number> = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};

type CategoryPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: Date | null;
};

type ReflectionDateParts = {
  day: number;
  month: number;
  year: number | null;
};

function getPáginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sortedPages = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];

    if (previousPage && page - previousPage > 1) {
      items.push("ellipsis");
    }

    items.push(page);
  });

  return items;
}

function formatCategoryDate(date: Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function extractReflectionDateParts(value: string): ReflectionDateParts | null {
  const normalized = normalizeText(value);

  const numericMatch = normalized.match(/\b(\d{1,2})[./-](\d{1,2})[./-](\d{4})\b/);
  if (numericMatch) {
    return {
      day: Number.parseInt(numericMatch[1], 10),
      month: Number.parseInt(numericMatch[2], 10),
      year: Number.parseInt(numericMatch[3], 10),
    };
  }

  const monthWithYearMatch = normalized.match(/\b(\d{1,2})\s+de\s+([a-z]+)(?:\s+de)?\s+(\d{4})\b/);
  if (monthWithYearMatch) {
    const month = MONTHS_PT[monthWithYearMatch[2]];
    if (month) {
      return {
        day: Number.parseInt(monthWithYearMatch[1], 10),
        month,
        year: Number.parseInt(monthWithYearMatch[3], 10),
      };
    }
  }

  const monthMatch = normalized.match(/\b(\d{1,2})\s+de\s+([a-z]+)\b/);
  if (monthMatch) {
    const month = MONTHS_PT[monthMatch[2]];
    if (month) {
      return {
        day: Number.parseInt(monthMatch[1], 10),
        month,
        year: null,
      };
    }
  }

  const compactMonthMatch = normalized.match(/\b(\d{1,2})\s+([a-z]+)\s+(\d{4})\b/);
  if (compactMonthMatch) {
    const month = MONTHS_PT[compactMonthMatch[2]];
    if (month) {
      return {
        day: Number.parseInt(compactMonthMatch[1], 10),
        month,
        year: Number.parseInt(compactMonthMatch[3], 10),
      };
    }
  }

  return null;
}

function isSameCalendarDate(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  );
}

function getReflectionDateMatchType(post: CategoryPost, target: Date) {
  if (post.publishedAt && isSameCalendarDate(new Date(post.publishedAt), target)) {
    return "exact" as const;
  }

  const parsedFromTitle = extractReflectionDateParts(`${post.title} ${post.excerpt ?? ""}`);
  if (!parsedFromTitle) return null;

  const targetDay = target.getDate();
  const targetMonth = target.getMonth() + 1;
  const targetYear = target.getFullYear();

  if (parsedFromTitle.day !== targetDay || parsedFromTitle.month !== targetMonth) {
    return null;
  }

  if (parsedFromTitle.year == null) {
    return "fallback" as const;
  }

  return parsedFromTitle.year === targetYear ? ("exact" as const) : null;
}

function getReflectionSortValue(post: CategoryPost) {
  if (post.publishedAt) return new Date(post.publishedAt).getTime();

  const parsedFromTitle = extractReflectionDateParts(`${post.title} ${post.excerpt ?? ""}`);
  if (!parsedFromTitle) return 0;

  return Date.UTC(parsedFromTitle.year ?? 0, parsedFromTitle.month - 1, parsedFromTitle.day);
}

function parseDateFilter(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const start = new Date(`${value}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { raw: value, start, end };
}

function formatFilterLabel(value: string | null) {
  if (!value) return null;
  return format(new Date(`${value}T00:00:00`), "dd/MM/yyyy");
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
  searchParams: Promise<{ page?: string; date?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const requestedPage = Number.parseInt(resolvedSearch.page ?? "1", 10);
  const supportsDateFilter = slug === "reflexão-do-dia";
  const activeDateFilter = supportsDateFilter ? parseDateFilter(resolvedSearch.date) : null;
  const activeDateLabel = formatFilterLabel(activeDateFilter?.raw ?? null);
  const todayFilter = format(new Date(), "yyyy-MM-dd");

  const [category] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!category || !category.active) notFound();

  let totalItems = 0;
  let items: CategoryPost[] = [];

  if (supportsDateFilter && activeDateFilter) {
    const allReflectionPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        featuredImage: posts.featuredImage,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .where(eq(posts.categoryId, category.id));

    const reflectionMatches = allReflectionPosts
      .map((post) => ({
        post,
        matchType: getReflectionDateMatchType(post, activeDateFilter.start),
      }))
      .filter((entry) => entry.matchType !== null);

    const hasExactReflectionMatch = reflectionMatches.some((entry) => entry.matchType === "exact");

    const filteredReflectionPosts = reflectionMatches
      .filter((entry) => (hasExactReflectionMatch ? entry.matchType === "exact" : true))
      .map((entry) => entry.post)
      .sort((a, b) => getReflectionSortValue(b) - getReflectionSortValue(a));

    totalItems = filteredReflectionPosts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const currentPage =
      Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
    const offset = (currentPage - 1) * PAGE_SIZE;

    items = filteredReflectionPosts.slice(offset, offset + PAGE_SIZE);

    return renderCategoryPage({
      category: {
        slug: category.slug,
        name: category.name,
        description: category.description,
      },
      supportsDateFilter,
      activeDateFilterRaw: activeDateFilter.raw,
      activeDateLabel,
      todayFilter,
      totalItems,
      currentPage,
      totalPages,
      items,
    });
  }

  const [{ totalItems: countedItems }] = await db
    .select({ totalItems: count() })
    .from(posts)
    .where(eq(posts.categoryId, category.id));

  totalItems = countedItems;

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, totalPages) : 1;
  const offset = (currentPage - 1) * PAGE_SIZE;

  items = await db
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

  return renderCategoryPage({
    category: {
      slug: category.slug,
      name: category.name,
      description: category.description,
    },
    supportsDateFilter,
    activeDateFilterRaw: activeDateFilter?.raw ?? null,
    activeDateLabel,
    todayFilter,
    totalItems,
    currentPage,
    totalPages,
    items,
  });
}

function renderCategoryPage({
  category,
  supportsDateFilter,
  activeDateFilterRaw,
  activeDateLabel,
  todayFilter,
  totalItems,
  currentPage,
  totalPages,
  items,
}: {
  category: {
    slug: string;
    name: string;
    description: string | null;
  };
  supportsDateFilter: boolean;
  activeDateFilterRaw: string | null;
  activeDateLabel: string | null;
  todayFilter: string;
  totalItems: number;
  currentPage: number;
  totalPages: number;
  items: CategoryPost[];
}) {
  const [lead, ...rest] = items;
  const sidebarStories = rest.slice(0, 4);
  const gridStories = rest.slice(4);
  const paginationItems = getPáginationItems(currentPage, totalPages);

  function pageHref(page: number) {
    const query = new URLSearchParams();

    if (activeDateFilterRaw) {
      query.set("date", activeDateFilterRaw);
    }

    if (page > 1) {
      query.set("page", String(page));
    }

    const serialized = query.toString();
    return serialized ? `/categoria/${category.slug}?${serialized}` : `/categoria/${category.slug}`;
  }

  return (
    <div className="space-y-8 lg:space-y-10">
      <header className="relative overflow-hidden rounded-[30px] border border-[#e6ddcf] bg-[radial-gradient(circle_at_top_left,_#fff4ea,_#ffffff_52%,_#f4f6f7_100%)] px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] md:px-8 md:py-10">
        <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-[#ff751f]/10 blur-3xl" />
        <div className="absolute left-0 top-10 h-32 w-32 rounded-full bg-[#102033]/[0.04] blur-3xl" />

        <Link href="/" className="inline-flex text-sm font-medium text-[#ff751f] transition-colors hover:text-[#e56a1a]">
          Voltar ao inicio
        </Link>

        <div className="mt-8 flex flex-col items-center text-center">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff751f]">Editoria</p>
            <h1 className="mt-2 font-headline text-3xl font-semibold tracking-tight text-[#102033] md:text-5xl">
              {category.name}
            </h1>
            {category.description && <p className="mt-3 text-base leading-7 text-[#5f707d]">{category.description}</p>}
          </div>

          {supportsDateFilter && (
            <div className="mt-8 w-full max-w-3xl rounded-[26px] border border-[#eadfd2] bg-white/88 px-5 py-5 text-sm text-[#5f707d] shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur md:px-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="max-w-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8a9aa5]">Buscar por data</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f707d]">
                    Escolha uma data para localizar a reflexão correspondente pelo titulo ou pela data salva no post.
                  </p>
                </div>
                {activeDateLabel && (
                  <span className="inline-flex rounded-full bg-[#fff4ea] px-3 py-1.5 text-xs font-semibold text-[#ff751f]">
                    {activeDateLabel}
                  </span>
                )}
              </div>

              <form className="mt-5 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
                <input
                  type="date"
                  name="date"
                  defaultValue={activeDateFilterRaw ?? ""}
                  className="min-w-0 flex-1 rounded-full border border-[#d8e0e7] bg-white px-4 py-2.5 text-sm text-[#102033] outline-none transition-colors focus:border-[#ff751f] sm:max-w-[260px]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-[#102033] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#ff751f]"
                >
                  Buscar reflexão
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={`/categoria/${category.slug}?date=${todayFilter}`}
                  className="inline-flex rounded-full bg-[#fff4ea] px-3 py-1.5 text-xs font-semibold text-[#ff751f] transition-colors hover:bg-[#ffe9d6]"
                >
                  Hoje
                </Link>
                {activeDateFilterRaw && (
                  <Link
                    href={`/categoria/${category.slug}`}
                    className="inline-flex rounded-full bg-[#f4f6f7] px-3 py-1.5 text-xs font-semibold text-[#5f707d] transition-colors hover:bg-[#e8edf1]"
                  >
                    Limpar filtro
                  </Link>
                )}
              </div>
            </div>
          )}
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
                      <SiteImage
                        src={lead.featuredImage}
                        alt={lead.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        fallback={<div className="h-full w-full bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)]" />}
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
                    {lead.excerpt && <p className="line-clamp-3 text-sm leading-7 text-[#5f707d]">{lead.excerpt}</p>}
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
                          <SiteImage
                            src={post.featuredImage}
                            alt={post.title}
                            className="h-full w-full object-cover"
                            fallback={<div className="h-full w-full bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)]" />}
                          />
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
                      <h3 className="mt-2 line-clamp-3 font-headline text-[1.15rem] font-semibold leading-snug text-[#102033] transition-colors group-hover:text-[#ff751f]">
                        {post.title}
                      </h3>
                      {post.excerpt && <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5f707d]">{post.excerpt}</p>}
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
                          <SiteImage
                            src={post.featuredImage}
                            alt={post.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            fallback={<div className="h-full w-full bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)]" />}
                          />
                        </>
                      ) : (
                        <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)] text-base font-medium text-[#8fa0ad]">
                          Foz em Destaque
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <h3 className="line-clamp-3 font-headline text-[1.15rem] font-semibold leading-snug text-[#102033] transition-colors group-hover:text-[#ff751f]">
                        {post.title}
                      </h3>
                      {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5f707d]">{post.excerpt}</p>}
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
          <p>
            {activeDateLabel
              ? `Nenhuma reflexão encontrada em ${activeDateLabel}.`
              : "Nenhum conteúdo publicado nesta editoria ainda."}
          </p>
          {activeDateFilterRaw && (
            <Link
              href={`/categoria/${category.slug}`}
              className="mt-4 inline-flex rounded-full bg-[#fff4ea] px-4 py-2 text-sm font-semibold text-[#ff751f] transition-colors hover:bg-[#ffe9d6]"
            >
              Limpar filtro
            </Link>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2 rounded-[24px] border border-[#e6ebef] bg-white px-4 py-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]">
          <Link
            href={pageHref(Math.max(1, currentPage - 1))}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              currentPage === 1
                ? "pointer-events-none bg-[#f4f6f7] text-[#9aabb7]"
                : "bg-[#fff4ea] text-[#ff751f] hover:bg-[#ffe9d6]"
            }`}
          >
            Página anterior
          </Link>

          {paginationItems.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-sm font-semibold text-[#9aabb7]"
              >
                …
              </span>
            ) : (
              <Link
                key={item}
                href={pageHref(item)}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors ${
                  item === currentPage
                    ? "bg-[#102033] text-white"
                    : "bg-[#f4f6f7] text-[#5f707d] hover:bg-[#ffe9d6] hover:text-[#ff751f]"
                }`}
              >
                {item}
              </Link>
            )
          )}

          <Link
            href={pageHref(Math.min(totalPages, currentPage + 1))}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              currentPage === totalPages
                ? "pointer-events-none bg-[#f4f6f7] text-[#9aabb7]"
                : "bg-[#fff4ea] text-[#ff751f] hover:bg-[#ffe9d6]"
            }`}
          >
            Proxima pagina
          </Link>
        </nav>
      )}
    </div>
  );
}
