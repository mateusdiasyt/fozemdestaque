import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { posts, categories, contentBlocks } from "@/lib/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { BirthdaySlider, type BirthdaySlideItem } from "@/components/site/BirthdaySlider";

type PostItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: Date | null;
};

async function getPostsByCategory(slug: string, limit: number): Promise<PostItem[]> {
  const [cat] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  if (!cat) return [];

  return db
    .select({
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
  return db
    .select()
    .from(contentBlocks)
    .where(and(eq(contentBlocks.type, "aniversario"), eq(contentBlocks.active, true)))
    .orderBy(asc(contentBlocks.order))
    .limit(limit);
}

function formatPostDate(date: Date | null) {
  if (!date) return null;
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export default async function HomePage() {
  const [aniversariantesBlocks, aniversariosPosts, datas, reflexao, clickSociety, agenda, tiTiTi, merchandising] =
    await Promise.all([
      getAniversariantesDoDia(10),
      getPostsByCategory("aniversariantes", 12),
      getPostsByCategory("datas", 4),
      getPostsByCategory("reflexao-do-dia", 4),
      getPostsByCategory("click-society", 4),
      getPostsByCategory("agenda", 4),
      getPostsByCategory("ti-ti-ti", 3),
      getPostsByCategory("merchandising", 3),
    ]);

  const birthdaySlides: BirthdaySlideItem[] = [
    ...aniversariantesBlocks.map((item) => ({
      id: item.id,
      title: item.title,
      excerpt: item.excerpt,
      image: item.thumbnail,
      href: item.link,
      dateLabel: null,
    })),
    ...aniversariosPosts.map((post) => ({
      id: post.id,
      title: post.title,
      excerpt: post.excerpt,
      image: post.featuredImage,
      href: `/post/${post.slug}`,
      dateLabel: formatPostDate(post.publishedAt),
    })),
  ].filter(
    (item, index, arr) =>
      arr.findIndex((x) => (x.href ?? `id:${x.id}`) === (item.href ?? `id:${item.id}`)) === index
  );

  return (
    <div className="space-y-8 lg:space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-[#ebdfd2] bg-[radial-gradient(circle_at_top_left,_#fff5eb,_#ffffff_45%,_#f4f6f7_100%)] p-5 md:p-8 shadow-[0_26px_80px_rgba(15,23,42,0.08)]">
        <div className="absolute -left-12 top-8 h-28 w-28 rounded-full bg-[#ff751f]/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0f172a]/8 blur-3xl" />

        <div className="relative grid gap-8 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="flex h-full flex-col gap-5">
            <SectionHeading
              title="Aniversários"
              slug="aniversariantes"
              eyebrow="Capa do dia"
              description="Uma vitrine principal para celebrar os destaques e manter a sensação de capa logo na abertura do portal."
            />
            <BirthdaySlider items={birthdaySlides} className="flex-1" />
          </div>

          <FeatureSection
            title="Click Society"
            slug="click-society"
            eyebrow="Vida social"
            description="Eventos, bastidores e personagens da cena social em um bloco editorial mais forte e mais próximo de portal."
            posts={clickSociety}
          />
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-8">
          <EditorialSection
            title="Datas"
            slug="datas"
            eyebrow="Calendário editorial"
            description="Efemérides, datas especiais e contexto rápido para sustentar a coluna da esquerda com ritmo jornalístico."
            posts={datas}
          />

          <EditorialSection
            title="Reflexões"
            slug="reflexao-do-dia"
            eyebrow="Leitura breve"
            description="Uma pausa de leitura com visual mais autoral, sem perder a lógica de portal e de hierarquia de navegação."
            posts={reflexao}
            tone="dark"
          />
        </div>

        <div className="space-y-8">
          <FeatureSection
            title="Agenda"
            slug="agenda"
            eyebrow="Programação"
            description="Eventos, estreias e movimentos da cidade em um módulo com mais respiro e mais cara de home editorial."
            posts={agenda}
            leadHeight="md:min-h-[320px]"
          />

          <div className="grid gap-8 lg:grid-cols-2">
            <CompactSection
              title="Ti-ti-ti"
              slug="ti-ti-ti"
              eyebrow="Bastidores"
              description="Notas rápidas, bastidores e assunto quente em formato de coluna enxuta."
              posts={tiTiTi}
            />

            <CompactSection
              title="Merchandising"
              slug="merchandising"
              eyebrow="Mercado"
              description="Ofertas, lançamentos e presença comercial com leitura mais objetiva e visualmente organizada."
              posts={merchandising}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  slug,
  eyebrow,
  description,
  light = false,
}: {
  title: string;
  slug: string;
  eyebrow: string;
  description: string;
  light?: boolean;
}) {
  const eyebrowColor = light ? "text-[#ffd2b3]" : "text-[#ff751f]";
  const titleColor = light ? "text-white" : "text-[#0f172a]";
  const descriptionColor = light ? "text-slate-300" : "text-[#61717d]";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.28em] ${eyebrowColor}`}>{eyebrow}</p>
        <Link href={`/categoria/${slug}`} className="group inline-flex items-center gap-2">
          <h2 className={`font-headline text-2xl font-semibold tracking-tight ${titleColor}`}>{title}</h2>
          <ArrowUpRight className={`h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${titleColor}`} />
        </Link>
        <p className={`mt-2 max-w-xl text-sm leading-6 ${descriptionColor}`}>{description}</p>
      </div>

      <Link
        href={`/categoria/${slug}`}
        className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${
          light ? "text-white hover:text-[#ffd2b3]" : "text-[#0f172a] hover:text-[#ff751f]"
        }`}
      >
        Ver categoria
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

function FeatureSection({
  title,
  slug,
  eyebrow,
  description,
  posts,
  leadHeight = "md:min-h-[280px]",
}: {
  title: string;
  slug: string;
  eyebrow: string;
  description: string;
  posts: PostItem[];
  leadHeight?: string;
}) {
  const [lead, ...rest] = posts;

  return (
    <section className="rounded-[28px] border border-[#dfe5ea] bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] md:p-6">
      <SectionHeading title={title} slug={slug} eyebrow={eyebrow} description={description} />

      {lead ? (
        <div className="mt-6 space-y-4">
          <Link
            href={`/post/${lead.slug}`}
            className={`group relative block overflow-hidden rounded-[24px] border border-[#101826] bg-[#0b1323] ${leadHeight}`}
          >
            <div className="absolute inset-0">
              {lead.featuredImage ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={lead.featuredImage}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="h-full w-full bg-[linear-gradient(135deg,#111827_0%,#334155_50%,#0f172a_100%)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.82)_65%,rgba(2,6,23,0.94)_100%)]" />
            </div>

            <div className="relative flex h-full min-h-[260px] flex-col justify-end p-5 md:p-6">
              <div className="inline-flex w-fit items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
                Destaque
              </div>
              <h3 className="mt-4 font-headline text-2xl font-semibold leading-tight text-white transition-colors group-hover:text-[#ffd2b3]">
                {lead.title}
              </h3>
              {lead.excerpt && <p className="mt-3 max-w-xl text-sm leading-6 text-slate-200 line-clamp-3">{lead.excerpt}</p>}
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-slate-300">
                {formatPostDate(lead.publishedAt) ?? "Acervo Foz em Destaque"}
              </p>
            </div>
          </Link>

          {rest.length > 0 && (
            <div className="grid gap-3">
              {rest.map((post, index) => (
                <StoryRow key={post.id} post={post} index={index + 2} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptySection title={title} />
      )}
    </section>
  );
}

function EditorialSection({
  title,
  slug,
  eyebrow,
  description,
  posts,
  tone = "light",
}: {
  title: string;
  slug: string;
  eyebrow: string;
  description: string;
  posts: PostItem[];
  tone?: "light" | "dark";
}) {
  const [lead, ...rest] = posts;
  const wrapperClass =
    tone === "dark"
      ? "rounded-[28px] border border-[#1f2937] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-5 shadow-[0_20px_55px_rgba(15,23,42,0.18)] md:p-6"
      : "rounded-[28px] border border-[#dfe5ea] bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] md:p-6";
  const cardClass =
    tone === "dark"
      ? "border border-white/10 bg-white/5 hover:bg-white/8"
      : "border border-[#e8edf1] bg-[#fbfcfd] hover:bg-white";
  const titleClass = tone === "dark" ? "text-white hover:text-[#ffd2b3]" : "text-[#102033] hover:text-[#ff751f]";
  const textClass = tone === "dark" ? "text-slate-300" : "text-[#6a7b87]";
  const indexClass = tone === "dark" ? "text-white/35" : "text-[#c0c9d1]";

  return (
    <section className={wrapperClass}>
      <SectionHeading title={title} slug={slug} eyebrow={eyebrow} description={description} light={tone === "dark"} />

      {lead ? (
        <div className="mt-6 space-y-4">
          <Link
            href={`/post/${lead.slug}`}
            className={`group grid gap-4 rounded-[24px] p-4 transition-colors md:grid-cols-[180px_1fr] ${cardClass}`}
          >
            <ThumbImage
              src={lead.featuredImage}
              alt={lead.title}
              className="h-44 md:h-full md:min-h-[180px]"
              placeholderLabel={title}
            />

            <div className="flex min-w-0 flex-col justify-between">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${tone === "dark" ? "text-[#ffd2b3]" : "text-[#ff751f]"}`}>
                  Em destaque
                </p>
                <h3 className={`mt-2 font-headline text-2xl font-semibold leading-tight transition-colors ${titleClass}`}>
                  {lead.title}
                </h3>
                {lead.excerpt && <p className={`mt-3 text-sm leading-6 line-clamp-4 ${textClass}`}>{lead.excerpt}</p>}
              </div>

              <p className={`mt-4 text-xs font-medium uppercase tracking-[0.18em] ${textClass}`}>
                {formatPostDate(lead.publishedAt) ?? "Acervo editorial"}
              </p>
            </div>
          </Link>

          {rest.length > 0 && (
            <div className={`divide-y ${tone === "dark" ? "divide-white/10" : "divide-[#e8edf1]"}`}>
              {rest.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/post/${post.slug}`}
                  className="group flex gap-4 py-4 first:pt-1 last:pb-1"
                >
                  <span className={`font-headline text-2xl font-semibold tabular-nums ${indexClass}`}>{`${index + 2}`.padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-headline text-base font-semibold leading-snug transition-colors ${titleClass}`}>
                      {post.title}
                    </h4>
                    {post.excerpt && <p className={`mt-1 text-sm line-clamp-2 ${textClass}`}>{post.excerpt}</p>}
                    <p className={`mt-2 text-xs font-medium uppercase tracking-[0.18em] ${textClass}`}>
                      {formatPostDate(post.publishedAt) ?? "Arquivo Foz"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptySection title={title} dark={tone === "dark"} />
      )}
    </section>
  );
}

function CompactSection({
  title,
  slug,
  eyebrow,
  description,
  posts,
}: {
  title: string;
  slug: string;
  eyebrow: string;
  description: string;
  posts: PostItem[];
}) {
  return (
    <section className="rounded-[28px] border border-[#dfe5ea] bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,0.06)] md:p-6">
      <SectionHeading title={title} slug={slug} eyebrow={eyebrow} description={description} />

      {posts.length > 0 ? (
        <div className="mt-6 space-y-3">
          {posts.map((post, index) => (
            <Link
              key={post.id}
              href={`/post/${post.slug}`}
              className="group grid grid-cols-[auto_1fr] gap-4 rounded-[22px] border border-[#e8edf1] bg-[#fbfcfd] p-3.5 transition-colors hover:bg-white"
            >
              <div className="flex items-start gap-3">
                <span className="font-headline text-2xl font-semibold text-[#d1d8df] tabular-nums">{`${index + 1}`.padStart(2, "0")}</span>
                <ThumbImage src={post.featuredImage} alt={post.title} className="h-20 w-20" placeholderLabel={title} />
              </div>

              <div className="min-w-0">
                <h3 className="font-headline text-base font-semibold leading-snug text-[#102033] transition-colors group-hover:text-[#ff751f]">
                  {post.title}
                </h3>
                {post.excerpt && <p className="mt-1 text-sm text-[#6a7b87] line-clamp-2">{post.excerpt}</p>}
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8a9aa5]">
                  {formatPostDate(post.publishedAt) ?? "Arquivo Foz"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptySection title={title} />
      )}
    </section>
  );
}

function StoryRow({ post, index }: { post: PostItem; index: number }) {
  return (
    <Link
      href={`/post/${post.slug}`}
      className="group grid grid-cols-[auto_88px_1fr] items-center gap-3 rounded-[20px] border border-[#e8edf1] bg-[#fbfcfd] p-3 transition-colors hover:bg-white"
    >
      <span className="font-headline text-2xl font-semibold text-[#d1d8df] tabular-nums">{`${index}`.padStart(2, "0")}</span>
      <ThumbImage src={post.featuredImage} alt={post.title} className="h-20 w-[88px]" placeholderLabel="Foz" />
      <div className="min-w-0">
        <h4 className="font-headline text-base font-semibold leading-snug text-[#102033] transition-colors group-hover:text-[#ff751f]">
          {post.title}
        </h4>
        {post.excerpt && <p className="mt-1 text-sm text-[#6a7b87] line-clamp-2">{post.excerpt}</p>}
        <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8a9aa5]">
          {formatPostDate(post.publishedAt) ?? "Arquivo Foz"}
        </p>
      </div>
    </Link>
  );
}

function ThumbImage({
  src,
  alt,
  className,
  placeholderLabel,
}: {
  src: string | null;
  alt: string;
  className: string;
  placeholderLabel: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[18px] bg-[#e7ecef] ${className}`}>
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#dfe6ea_0%,#f6f7f8_100%)]">
          <span className="px-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-[#718391]">
            {placeholderLabel}
          </span>
        </div>
      )}
    </div>
  );
}

function EmptySection({ title, dark = false }: { title: string; dark?: boolean }) {
  return (
    <div
      className={`mt-6 rounded-[24px] border px-4 py-8 text-center text-sm ${
        dark
          ? "border-white/10 bg-white/5 text-slate-300"
          : "border-[#e8edf1] bg-[#fbfcfd] text-[#6a7b87]"
      }`}
    >
      Nenhum conteúdo em {title.toLowerCase()} no momento.
    </div>
  );
}
