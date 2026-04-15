import Link from "next/link";
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

export default async function HomePage() {
  const [aniversariantesBlocks, aniversariosPosts, datas, reflexao, clickSociety, agenda, tiTiTi, merchandising] =
    await Promise.all([
      getAniversariantesDoDia(10),
      getPostsByCategory("aniversariantes", 12),
      getPostsByCategory("datas", 3),
      getPostsByCategory("reflexao-do-dia", 3),
      getPostsByCategory("click-society", 3),
      getPostsByCategory("agenda", 3),
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
      dateLabel: post.publishedAt
        ? format(new Date(post.publishedAt), "dd/MM/yyyy", { locale: ptBR })
        : null,
    })),
  ].filter(
    (item, index, arr) =>
      arr.findIndex((x) => (x.href ?? `id:${x.id}`) === (item.href ?? `id:${item.id}`)) === index
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
      <div className="space-y-8">
        <section>
          <Link href="/categoria/aniversariantes" className="flex items-center gap-3 mb-4 group">
            <span className="h-1 w-8 bg-[#ff751f] rounded group-hover:w-12 transition-all" />
            <h2 className="font-headline text-lg font-bold text-[#000000] uppercase tracking-wide group-hover:text-[#ff751f] transition-colors">
              Aniversários
            </h2>
          </Link>
          <BirthdaySlider items={birthdaySlides} />
        </section>

        <ContentSection title="Datas" slug="datas" posts={datas} />
        <ContentSection title="Reflexões" slug="reflexao-do-dia" posts={reflexao} />
      </div>

      <div className="space-y-8">
        <ContentSection title="Click Society" slug="click-society" posts={clickSociety} />
        <ContentSection title="Agenda" slug="agenda" posts={agenda} />
        <ContentSection title="Ti-ti-ti" slug="ti-ti-ti" posts={tiTiTi} />
        <ContentSection title="Merchandising" slug="merchandising" posts={merchandising} />
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
  posts: PostItem[];
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
              <Link
                key={post.id}
                href={`/post/${post.slug}`}
                className="flex gap-4 p-4 hover:bg-[#f8f9fa] transition-colors group"
              >
                {post.featuredImage ? (
                  <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-[#e8ebed]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.featuredImage}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
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
          <div className="p-6 text-center text-[#859eac] text-sm">Nenhuma notícia em {title.toLowerCase()}.</div>
        )}
      </div>
    </section>
  );
}
