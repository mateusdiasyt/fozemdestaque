import Link from "next/link";
import { SiteImage } from "@/components/site/SiteImage";

export interface HomeBannerAd {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
}

function BannerCard({ banner, mobile = false }: { banner: HomeBannerAd; mobile?: boolean }) {
  const card = (
    <article className="overflow-hidden rounded-[24px] border border-[#d8dee4] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className={`relative overflow-hidden bg-[#e8ebed] ${mobile ? "aspect-[4/5] sm:aspect-[300/600]" : "aspect-[300/600]"}`}>
        <SiteImage
          src={banner.imageUrl}
          alt={banner.title ?? "Publicidade"}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          fallback={<div className="h-full w-full bg-[linear-gradient(135deg,#e8edf1_0%,#f5f7f8_100%)]" />}
        />
      </div>
    </article>
  );

  return banner.linkUrl ? (
    <Link href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export function HomeAdsRail({ banners }: { banners: HomeBannerAd[] }) {
  if (banners.length === 0) return null;

  return (
    <aside className="space-y-4 xl:sticky xl:top-24">
      {banners.map((banner) => (
        <BannerCard key={banner.id} banner={banner} />
      ))}
    </aside>
  );
}

export function HomeAdsMobile({
  leftBanners,
  rightBanners,
}: {
  leftBanners: HomeBannerAd[];
  rightBanners: HomeBannerAd[];
}) {
  const banners = [...leftBanners, ...rightBanners];
  if (banners.length === 0) return null;

  return (
    <section className="xl:hidden rounded-[28px] border border-[#e6ddcf] bg-[linear-gradient(180deg,#fff8f2_0%,#ffffff_100%)] p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#ff751f]">Publicidade</p>
          <h2 className="mt-2 font-headline text-2xl font-semibold text-[#102033]">Destaques comerciais</h2>
          <p className="mt-2 text-sm leading-6 text-[#5f707d]">
            No mobile e tablet, os banners laterais entram em grade para manter a home organizada.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <BannerCard key={banner.id} banner={banner} mobile />
        ))}
      </div>
    </section>
  );
}
