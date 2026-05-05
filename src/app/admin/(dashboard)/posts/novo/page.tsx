import { AdminDataWarning } from "@/components/admin/AdminDataWarning";
import { PostEditor } from "@/components/admin/PostEditor";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { safeAdminQuery } from "@/lib/safe-admin-query";

type EditorCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default async function NewPostPage() {
  const categoriesResult = await safeAdminQuery<EditorCategory[]>(
    async () => db.select().from(categories) as Promise<EditorCategory[]>,
    [],
    "editor categories"
  );

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.18),transparent_32%),linear-gradient(135deg,#111a2b,#070b14)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.28)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Admin / Conteudo</p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Novo Post</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Um estudio editorial mais limpo para escrever, inserir imagens, organizar publicacao e revisar SEO com conforto.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
            Criacao de conteudo para o portal Foz em Destaque
          </div>
        </div>
      </section>

      {categoriesResult.unavailable ? <AdminDataWarning /> : null}

      <PostEditor categories={categoriesResult.data} />
    </div>
  );
}
