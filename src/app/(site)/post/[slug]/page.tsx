import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, like, or } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { SiteImage } from "@/components/site/SiteImage";
import { PostComments } from "@/components/site/PostComments";
import { db } from "@/lib/db";
import { categories, contentBlocks, posts } from "@/lib/db/schema";
import { enhanceContentHtml } from "@/lib/media";

const BLOCK_CATEGORY_MAP: Record<string, { slug: string; label: string }> = {
  aniversario: { slug: "aniversariantes", label: "Aniversários" },
  data: { slug: "datas", label: "Datas" },
  reflexao: { slug: "reflexao-do-dia", label: "Reflexões" },
  agenda: { slug: "agenda", label: "Agenda" },
  merchandising: { slug: "merchandising", label: "Merchandising" },
  society: { slug: "click-society", label: "Click Society" },
  ti_ti_ti: { slug: "ti-ti-ti", label: "Ti-ti-ti" },
  "ti-ti-ti": { slug: "ti-ti-ti", label: "Ti-ti-ti" },
};

async function getPostBySlug(slug: string) {
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  if (!post || post.status !== "publicado") return null;

  const [category] = post.categoryId
    ? await db.select().from(categories).where(eq(categories.id, post.categoryId)).limit(1)
    : [null];

  return { kind: "post" as const, post, category };
}

async function getContentBlockBySlug(slug: string) {
  const [block] = await db
    .select()
    .from(contentBlocks)
    .where(
      and(
        eq(contentBlocks.active, true),
        or(
          eq(contentBlocks.slug, slug),
          eq(contentBlocks.link, slug),
          eq(contentBlocks.link, `/post/${slug}`),
          like(contentBlocks.link, `%/post/${slug}%`)
        )
      )
    )
    .limit(1);

  if (!block) return null;

  return {
    kind: "block" as const,
    block,
    category: block.type ? BLOCK_CATEGORY_MAP[block.type] ?? null : null,
  };
}

async function getEntryBySlug(slug: string) {
  return (await getPostBySlug(slug)) ?? (await getContentBlockBySlug(slug));
}

function formatDisplayDate(date: Date | null | undefined) {
  if (!date) return null;
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  if (!entry) return {};

  if (entry.kind === "post") {
    return {
      title: entry.post.metaTitle || entry.post.title,
      description: entry.post.metaDescription || entry.post.excerpt || undefined,
      openGraph: {
        title: entry.post.metaTitle || entry.post.title,
        description: entry.post.metaDescription || entry.post.excerpt || undefined,
        images: entry.post.featuredImage ? [entry.post.featuredImage] : undefined,
      },
    };
  }

  return {
    title: entry.block.title,
    description: entry.block.excerpt || undefined,
    openGraph: {
      title: entry.block.title,
      description: entry.block.excerpt || undefined,
      images: entry.block.thumbnail ? [entry.block.thumbnail] : undefined,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = await getEntryBySlug(slug);

  if (!entry) notFound();

  const isPost = entry.kind === "post";
  const title = isPost ? entry.post.title : entry.block.title;
  const image = isPost ? entry.post.featuredImage : entry.block.thumbnail;
  const category = isPost
    ? entry.category
      ? { slug: entry.category.slug, label: entry.category.name }
      : null
    : entry.category;
  const displayDate = isPost
    ? formatDisplayDate(entry.post.publishedAt ?? entry.post.createdAt)
    : formatDisplayDate(entry.block.updatedAt ?? entry.block.createdAt);
  const contentHtmlRaw = isPost
    ? entry.post.content
    : entry.block.content?.trim()
      ? entry.block.content
      : entry.block.excerpt
        ? `<p>${entry.block.excerpt}</p>`
        : "<p>Conteúdo disponível em breve.</p>";
  const contentHtml = enhanceContentHtml(contentHtmlRaw);

  return (
    <article className="overflow-hidden rounded-[38px] border border-[#e5dccd] bg-[linear-gradient(180deg,#fffdf9_0%,#f7f2ea_100%)] shadow-[0_32px_90px_rgba(15,23,42,0.10)]">
      <header className="border-b border-[#ece2d3] px-6 py-8 md:px-12 md:py-14">
        <div className="mx-auto max-w-4xl">
          <Link
            href={category ? `/categoria/${category.slug}` : "/"}
            className="inline-flex text-sm font-medium text-[#8d5f33] transition-colors hover:text-[#102033]"
          >
            Voltar
          </Link>

          {category && (
            <Link
              href={`/categoria/${category.slug}`}
              className="mt-6 inline-flex rounded-full border border-[#dbc6ab] bg-[#f7efe2] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8d5f33]"
            >
              {category.label}
            </Link>
          )}

          <h1 className="mt-6 max-w-4xl font-headline text-[clamp(2.4rem,5vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[#102033]">
            {title}
          </h1>

          {displayDate && <time className="mt-6 block font-medium text-[#5f707d]">{displayDate}</time>}
        </div>
      </header>

      {image && (
        <div className="px-6 pt-6 md:px-12 md:pt-10">
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[34px] border border-[#e5dccd] bg-[#f1eadf] shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
            <div className="aspect-[16/9] md:aspect-[21/9]">
              <SiteImage src={image} alt={title} className="h-full w-full object-cover" loading="eager" fallback={<div className="h-full w-full bg-[linear-gradient(135deg,#fff1e5_0%,#f4f6f7_100%)]" />} />
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-10 md:px-12 md:py-14">
        <div
          className="editorial-prose mx-auto max-w-[820px]"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </div>

      {isPost && <PostComments postId={entry.post.id} />}
    </article>
  );
}
