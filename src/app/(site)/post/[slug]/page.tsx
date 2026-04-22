import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, like, or } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import { PostComments } from "@/components/site/PostComments";
import { db } from "@/lib/db";
import { categories, contentBlocks, posts } from "@/lib/db/schema";

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
  const contentHtml = isPost
    ? entry.post.content
    : entry.block.content?.trim()
      ? entry.block.content
      : entry.block.excerpt
        ? `<p>${entry.block.excerpt}</p>`
        : "<p>Conteúdo disponível em breve.</p>";

  return (
    <article className="overflow-hidden rounded-[30px] border border-[#e6ebef] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <header className="border-b border-[#edf2f5] bg-[linear-gradient(180deg,#fff8f2_0%,#ffffff_100%)] px-6 py-8 md:px-10 md:py-12">
        <Link
          href={category ? `/categoria/${category.slug}` : "/"}
          className="inline-flex text-sm font-medium text-[#ff751f] transition-colors hover:text-[#e56a1a]"
        >
          ← Voltar
        </Link>

        {category && (
          <Link
            href={`/categoria/${category.slug}`}
            className="mt-4 inline-flex rounded-full border border-[#ffd9bf] bg-[#fff4ea] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#ff751f]"
          >
            {category.label}
          </Link>
        )}

        <h1 className="mt-4 max-w-4xl font-headline text-3xl font-semibold leading-tight text-[#102033] md:text-5xl">
          {title}
        </h1>

        {displayDate && <time className="mt-4 block text-sm text-[#5f707d]">{displayDate}</time>}
      </header>

      {image && (
        <div className="aspect-[16/9] bg-[#eef2f4] md:aspect-[21/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={title} className="h-full w-full object-cover" />
        </div>
      )}

      <div
        className="prose prose-lg max-w-none px-6 py-8 font-sans text-[#42515d] md:px-10 md:py-12 [&_a]:text-[#ff751f] [&_a]:transition-colors [&_a]:hover:text-[#e56a1a] [&_blockquote]:border-l-4 [&_blockquote]:border-[#ff751f] [&_blockquote]:bg-[#fff7f0] [&_blockquote]:px-4 [&_blockquote]:py-1 [&_h2]:font-headline [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-[#102033] [&_h3]:font-headline [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[#102033] [&_img]:rounded-[22px] [&_img]:shadow-[0_16px_40px_rgba(15,23,42,0.12)] [&_p]:leading-8"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {isPost && <PostComments postId={entry.post.id} />}
    </article>
  );
}
