"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
}

interface BannerCarouselProps {
  position: "header" | "rodape";
  wrapperClassName?: string;
  contentClassName?: string;
  cardClassName?: string;
  aspectClassName?: string;
}

const AUTO_ROTATE_MS = 5000;

export function BannerCarousel({
  position,
  wrapperClassName,
  contentClassName,
  cardClassName,
  aspectClassName = "aspect-[460/150]",
}: BannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let active = true;

    fetch(`/api/banners?position=${position}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active || !Array.isArray(data)) return;
        setBanners(data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [position]);

  const visibleCount = Math.min(3, banners.length);
  const canRotate = banners.length > visibleCount;

  useEffect(() => {
    if (!canRotate) return;

    const timer = window.setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [banners.length, canRotate]);

  useEffect(() => {
    setCurrent(0);
  }, [banners.length]);

  const visibleBanners = useMemo(() => {
    if (visibleCount === 0) return [];

    return Array.from({ length: visibleCount }, (_, index) => {
      const bannerIndex = (current + index) % banners.length;
      return banners[bannerIndex];
    });
  }, [banners, current, visibleCount]);

  if (visibleBanners.length === 0) return null;

  function goTo(nextIndex: number) {
    setCurrent((nextIndex + banners.length) % banners.length);
  }

  const gridColsClass =
    visibleCount === 1 ? "grid-cols-1" : visibleCount === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3";

  return (
    <section className={cn("w-full", wrapperClassName)}>
      <div className={cn("mx-auto max-w-7xl px-4", contentClassName)}>
        <div className={cn("grid gap-3", gridColsClass)}>
          {visibleBanners.map((banner) => {
            const card = (
              <article
                className={cn(
                  "group relative overflow-hidden rounded-[20px] border border-[#dfe5ea] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.08)]",
                  cardClassName
                )}
              >
                <div className={cn("relative w-full overflow-hidden bg-[#e8ebed]", aspectClassName)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={banner.imageUrl}
                    alt={banner.title ?? "Publicidade"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              </article>
            );

            return banner.linkUrl ? (
              <Link
                key={banner.id}
                href={banner.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {card}
              </Link>
            ) : (
              <div key={banner.id}>{card}</div>
            );
          })}
        </div>

        {canRotate && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e0e7] bg-white text-[#102033] transition-colors hover:border-[#ff751f] hover:text-[#ff751f]"
              aria-label="Banner anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => goTo(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === current ? "w-8 bg-[#ff751f]" : "w-2 bg-[#cfd8df] hover:bg-[#95a5b2]"
                  )}
                  aria-label={`Ir para o grupo ${index + 1} de banners`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => goTo(current + 1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e0e7] bg-white text-[#102033] transition-colors hover:border-[#ff751f] hover:text-[#ff751f]"
              aria-label="Próximo banner"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
