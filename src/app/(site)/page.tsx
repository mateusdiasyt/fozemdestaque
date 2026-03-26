import Link from "next/link";
import { db } from "@/lib/db";
import { posts, categories, contentBlocks } from "@/lib/db/schema";
import { eq, desc, and, asc } from "drizzle-orm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";

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
  const [aniversariantesBlocks, aniversariosPosts, datas, reflexao, society, agenda, tiTiTi, merchandising] =
    await Promise.all([
      getAniversariantesDoDia(10),
      getPostsByCategory("aniversariantes", 3),
      getPostsByCategory("datas", 3),
      getPostsByCategory("reflexao", 3),
      getPostsByCategory("society", 3),
      getPostsByCategory("agenda", 3),
      getPostsByCategory("ti-ti-ti", 3),
      getPostsByCategory("merchandising", 3),
    ]);

  const aniversariantes = aniversariantesBlocks.length > 0 ? aniversariantesBlocks : null;

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
          <div className="grid grid-cols-1 gap-4">
            {aniversariantes ? (
              aniversariantes.map((item) => (
                <AniversarianteCard
                  key={item.id}
                  title={item.title}
                  excerpt={item.excerpt}
                  image={item.thumbnail}
                  href={item.link}
                />
              ))
            ) : aniversariosPosts.length > 0 ? (
              aniversariosPosts.map((post) => (
                <AniversarianteCard
                  key={post.id}
                  title={post.title}
                  excerpt={post.excerpt}
                  image={post.featuredImage}
                  href={`/post/${post.slug}`}
                  date={post.publishedAt}
                />
              ))
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-[#e8ebed] p-6 text-center text-[#859eac] text-sm">
                Nenhum conteúdo em aniversários no momento.
              </div>
            )}
          </div>
        </section>

        <ContentSection title="Datas" slug="datas" posts={datas} />
        <ContentSection title="Reflexões" slug="reflexao" posts={reflexao} />
      </div>

      <div className="space-y-8">
        <ContentSection title="Society" slug="society" posts={society} />
        <ContentSection title="Agenda" slug="agenda" posts={agenda} />
        <ContentSection title="Ti-ti-ti" slug="ti-ti-ti" posts={tiTiTi} />
        <ContentSection title="Merchandising" slug="merchandising" posts={merchandising} />
      </div>
    </div>
  );
}

function AniversarianteCard({
  title,
  excerpt,
  image,
  href,
  date,
  placeholderIcon = "🎂",
}: {
  title: string;
  excerpt: string | null;
  image: string | null;
  href: string | null;
  date?: Date | string | null;
  placeholderIcon?: string;
}) {
  const content = (
    <article className="flex flex-col h-full min-h-[220px] rounded-xl overflow-hidden shadow-sm border border-[#e8ebed] bg-white hover:shadow-md transition-shadow group">
      <div className="w-full h-[120px] min-h-[120px] shrink-0 bg-[#e8ebed] overflow-hidden">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#859eac] text-2xl">{placeholderIcon}</span>
          </div>
        )}
      </div>
      <div className="p-3 min-h-[100px] flex flex-col gap-1 box-border flex-1">
        <h3 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors text-sm leading-snug">
          {title}
        </h3>
        {excerpt && <p className="text-xs text-[#859eac] line-clamp-1">{excerpt}</p>}
        {date && (
          <p className="text-xs text-[#859eac] mt-auto pt-1">
            {format(new Date(date), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
      </div>
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
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
