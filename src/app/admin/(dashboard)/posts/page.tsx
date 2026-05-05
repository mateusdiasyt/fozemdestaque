import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { PostsListClient } from "@/components/admin/PostsListClient";
import { WordPressImportForm } from "@/components/admin/WordPressImportForm";
import { AdminDataWarning } from "@/components/admin/AdminDataWarning";
import { db } from "@/lib/db";
import { categories, posts } from "@/lib/db/schema";
import { safeAdminQuery } from "@/lib/safe-admin-query";

type AdminPostListItem = {
  id: string;
  title: string;
  slug: string;
  status: string;
  featured: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  categoryId: string | null;
  categoryIds: string[] | string | null;
};

type AdminCategoryItem = {
  id: string;
  name: string;
};

export default async function AdminPostsPage() {
  const postsResult = await safeAdminQuery<AdminPostListItem[]>(
    async () =>
      db
        .select({
          id: posts.id,
          title: posts.title,
          slug: posts.slug,
          status: posts.status,
          featured: posts.featured,
          publishedAt: posts.publishedAt,
          createdAt: posts.createdAt,
          categoryId: posts.categoryId,
          categoryIds: posts.categoryIds,
        })
        .from(posts)
        .orderBy(desc(posts.createdAt)),
    [],
    "posts list"
  );

  const categoriesResult = await safeAdminQuery<AdminCategoryItem[]>(
    async () => db.select({ id: categories.id, name: categories.name }).from(categories),
    [],
    "post categories"
  );

  const dataUnavailable = postsResult.unavailable || categoriesResult.unavailable;

  return (
    <div className="space-y-6 text-slate-100">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(165,180,252,0.18),_transparent_30%),linear-gradient(180deg,#0b1020_0%,#060b16_100%)] px-6 py-6 shadow-[0_26px_90px_rgba(2,6,23,0.38)] md:px-8 md:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Admin / Conteudo</p>

        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-headline text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Posts do portal
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
              Controle editorial com filtros mais claros, leitura compacta e visual alinhado ao painel premium de banners.
            </p>
          </div>

          <Link
            href="/admin/posts/novo"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#dfe6ff] px-4 py-2.5 text-sm font-semibold text-[#091122] transition-colors hover:bg-white"
          >
            <Plus className="h-4 w-4" />
            Novo post
          </Link>
        </div>
      </section>

      {dataUnavailable ? <AdminDataWarning /> : null}

      <WordPressImportForm />
      <PostsListClient posts={postsResult.data} categories={categoriesResult.data} />
    </div>
  );
}
