import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Metadata } from "next";
import { eq, desc, ilike, or, and } from "drizzle-orm";
import { SiteImage } from "@/components/site/SiteImage";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Procurar notícias e destaques em Foz do Iguaçu",
};

async function getSearchResults(q: string) {
  if (!q.trim()) return [];

  const pattern = `%${q.trim()}%`;

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
    .where(
      and(
        eq(posts.status, "publicado"),
        or(ilike(posts.title, pattern), ilike(posts.excerpt, pattern), ilike(posts.content, pattern))
      )
    )
    .orderBy(desc(posts.publishedAt))
    .limit(50);
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const items = q ? await getSearchResults(q) : [];

  return (
    <div>
      <header className="mb-8">
        <Link href="/" className="mb-2 inline-block text-sm font-medium text-[#ff751f] hover:text-[#e56a1a]">
          ← Voltar ao início
        </Link>
        <div className="mb-2 flex items-center gap-3">
          <span className="h-1 w-12 rounded bg-[#ff751f]" />
          <h1 className="font-headline text-2xl font-bold text-[#000000] md:text-3xl">
            Resultados da busca{q ? `: "${q}"` : ""}
          </h1>
        </div>
        {!q && <p className="mt-1 text-[#4e5b60]">Digite algo na barra de busca acima para procurar conteúdo.</p>}
      </header>

      {q && items.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {items.map((post) => (
            <Link key={post.id} href={`/post/${post.slug}`} className="group block">
              <article className="overflow-hidden rounded-lg border border-[#e8ebed] bg-white shadow-md transition-all hover:shadow-lg">
                {post.featuredImage ? (
                  <div className="aspect-video bg-[#e8ebed]">
                    <SiteImage
                      src={post.featuredImage}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      fallback={<div className="h-full w-full bg-[linear-gradient(135deg,#e8edf1_0%,#f5f7f8_100%)]" />}
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-[#e8ebed]">
                    <span className="font-headline text-2xl text-[#859eac]">Foz</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="line-clamp-2 font-headline font-bold text-[#4e5b60] transition-colors group-hover:text-[#ff751f]">
                    {post.title}
                  </h2>
                  {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-[#859eac]">{post.excerpt}</p>}
                  {post.publishedAt && (
                    <p className="mt-2 text-xs text-[#859eac]">
                      {format(new Date(post.publishedAt), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : q ? (
        <div className="rounded-lg border-2 border-dashed border-[#859eac] bg-white p-12 text-center">
          <p className="text-[#4e5b60]">Nenhum resultado encontrado para &quot;{q}&quot;.</p>
          <p className="mt-2 text-sm text-[#859eac]">Tente outros termos de busca.</p>
        </div>
      ) : null}
    </div>
  );
}
