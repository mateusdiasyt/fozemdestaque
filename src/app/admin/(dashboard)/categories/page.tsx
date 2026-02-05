import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export default async function AdminCategoriesPage() {
  const all = await db.select().from(categories);
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Categorias</h1>
      <CategoriesManager categories={all} />
    </div>
  );
}
