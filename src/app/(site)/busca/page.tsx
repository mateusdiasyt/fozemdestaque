import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema";
import { eq, desc, ilike, or, and } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Buscar",
  description: "Procurar notícias e destaques em Foz do Iguaçu",
};

async function getSearchResults(q: string) {
  if (!q.trim()) return [];
  const pattern = `%${q.trim()}%`;
  return db.select({
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
        or(
          ilike(posts.title, pattern),
          ilike(posts.excerpt, pattern),
          ilike(posts.content, pattern)
        )
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
        <Link
          href="/"
          className="text-sm text-[#ff751f] hover:text-[#e56a1a] font-medium mb-2 inline-block"
        >
          ← Voltar ao início
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="h-1 w-12 bg-[#ff751f] rounded" />
          <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#000000]">
            Resultados da busca{q ? `: "${q}"` : ""}
          </h1>
        </div>
        {!q && (
          <p className="text-[#4e5b60] mt-1">
            Digite algo na barra de busca acima para procurar conteúdo.
          </p>
        )}
      </header>
      {q && items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((post: { id: string; title: string; slug: string; excerpt: string | null; featuredImage: string | null; publishedAt: string | null }) => (
            <Link key={post.id} href={`/post/${post.slug}`} className="block group">
              <article className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all border border-[#e8ebed]">
                {post.featuredImage ? (
                  <div className="aspect-video bg-[#e8ebed]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-[#e8ebed] flex items-center justify-center">
                    <span className="text-[#859eac] font-headline text-2xl">Foz</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-headline font-bold text-[#4e5b60] group-hover:text-[#ff751f] line-clamp-2 transition-colors">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-sm text-[#859eac] line-clamp-2 mt-1">{post.excerpt}</p>
                  )}
                  {post.publishedAt && (
                    <p className="text-xs text-[#859eac] mt-2">
                      {format(new Date(post.publishedAt), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : q ? (
        <div className="bg-white rounded-lg border-2 border-dashed border-[#859eac] p-12 text-center">
          <p className="text-[#4e5b60]">
            Nenhum resultado encontrado para &quot;{q}&quot;.
          </p>
          <p className="text-sm text-[#859eac] mt-2">
            Tente outros termos de busca.
          </p>
        </div>
      ) : null}
    </div>
  );
}
