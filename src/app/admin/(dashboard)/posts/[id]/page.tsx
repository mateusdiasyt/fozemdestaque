import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { parseCategoryIds } from "@/lib/post-categories";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) notFound();
  const allCategories = await db.select().from(categories);
  const postForEditor = {
    ...post,
    categoryIds: parseCategoryIds(post.categoryIds, post.categoryId),
  };

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_32%),linear-gradient(135deg,#111a2b,#070b14)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Admin / Conteudo</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Editar Post</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Ajuste texto, imagens, publicacao e SEO de forma centralizada, com uma area de escrita mais clara e moderna.
            </p>
          </div>
          <div className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
            <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Editando</span>
            <span className="line-clamp-1 font-semibold text-slate-100">{post.title}</span>
          </div>
        </div>
      </section>

      <PostEditor post={postForEditor} categories={allCategories} />
    </div>
  );
}
