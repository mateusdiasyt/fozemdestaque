import { AdminDataWarning } from "@/components/admin/AdminDataWarning";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { safeAdminQuery } from "@/lib/safe-admin-query";

type AdminCategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default async function AdminCategoriesPage() {
  const categoriesResult = await safeAdminQuery<AdminCategoryRow[]>(
    async () => db.select().from(categories) as Promise<AdminCategoryRow[]>,
    [],
    "categories"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-100">Categorias</h1>
        <p className="text-sm text-slate-400">Organizacao das editorias do portal.</p>
      </div>

      {categoriesResult.unavailable ? <AdminDataWarning /> : null}

      <CategoriesManager categories={categoriesResult.data} />
    </div>
  );
}
