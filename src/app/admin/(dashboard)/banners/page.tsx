import { db } from "@/lib/db";
import { banners } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { BannersManager } from "@/components/admin/BannersManager";

export default async function AdminBannersPage() {
  const all = await db.select().from(banners).orderBy(asc(banners.order));

  return (
    <div className="space-y-6 text-slate-100">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(165,180,252,0.18),_transparent_30%),linear-gradient(180deg,#0b1020_0%,#060b16_100%)] px-6 py-6 shadow-[0_26px_90px_rgba(2,6,23,0.38)] md:px-8 md:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Admin / Publicidade</p>

        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-headline text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Banners de publicidade
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400 md:text-base">
              Um painel mais premium para distribuir topo, rodape e laterais com menos ruido visual e mais controle de exibicao.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Zonas monitoradas</p>
            <p className="mt-2 font-headline text-3xl font-semibold text-white">4</p>
          </div>
        </div>
      </section>

      <BannersManager banners={all} />
    </div>
  );
}
