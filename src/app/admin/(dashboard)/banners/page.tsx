import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { BannersManager } from "@/components/admin/BannersManager";

export default async function AdminBannersPage() {
  const all = await db.select().from(banners).orderBy(asc(banners.order));
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Banners de Publicidade</h1>
      <BannersManager banners={all} />
    </div>
  );
}
