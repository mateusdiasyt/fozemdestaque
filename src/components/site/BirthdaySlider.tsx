"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SiteImage } from "@/components/site/SiteImage";

export type BirthdaySlideItem = {
  id: string;
  title: string;
  excerpt: string | null;
  image: string | null;
  href: string | null;
  dateLabel: string | null;
};

interface BirthdaySliderProps {
  items: BirthdaySlideItem[];
  className?: string;
}

const AUTO_ROTATE_MS = 5000;

export function BirthdaySlider({ items, className }: BirthdaySliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;

    const interval = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, AUTO_ROTATE_MS);

    return () => window.clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) {
    return (
      <div className="rounded-[26px] border border-[#dbe5ef] bg-white px-6 py-10 text-center text-sm text-[#6a7b87] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        Nenhum conteudo em aniversarios no momento.
      </div>
    );
  }

  const active = items[currentIndex];
  const canRotate = items.length > 1;

  function goTo(index: number) {
    setCurrentIndex((index + items.length) % items.length);
  }

  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[28px] border border-[#d8e0e7] bg-[linear-gradient(180deg,#fffaf5_0%,#ffffff_100%)] shadow-[0_22px_70px_rgba(15,23,42,0.14)]",
        className
      )}
    >
      {active.href ? (
        <Link href={active.href} className="group/slide block flex-1">
          <SlideContent item={active} />
        </Link>
      ) : (
        <div className="group/slide block flex-1">
          <SlideContent item={active} />
        </div>
      )}

      <div className="border-t border-[#e7d7ca] bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6b7b88]">
              {String(currentIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </span>

            {canRotate && (
              <div className="flex items-center gap-1.5">
                {items.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentIndex
                        ? "w-8 bg-[#ff751f]"
                        : "w-2 bg-[#cfd8df] hover:bg-[#95a5b2]"
                    }`}
                    aria-label={`Ir para aniversario ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {canRotate && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(currentIndex - 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8e0e7] bg-white text-[#102033] transition-colors hover:border-[#ff751f] hover:text-[#ff751f]"
                aria-label="Aniversario anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => goTo(currentIndex + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d8e0e7] bg-white text-[#102033] transition-colors hover:border-[#ff751f] hover:text-[#ff751f]"
                aria-label="Proximo aniversario"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function SlideContent({ item }: { item: BirthdaySlideItem }) {
  return (
    <div className="relative">
      <div className="relative overflow-hidden bg-[linear-gradient(135deg,#111827_0%,#1e293b_55%,#334155_100%)]">
        {item.image ? (
          <SiteImage
            src={item.image}
            alt={item.title}
            className="mx-auto block h-auto max-h-[780px] w-full bg-transparent object-contain transition-transform duration-700 group-hover/slide:scale-[1.01]"
            loading="eager"
            fallback={<div className="h-[400px] w-full bg-[linear-gradient(135deg,#111827_0%,#1e293b_55%,#334155_100%)] md:h-[520px] xl:h-[660px]" />}
          />
        ) : (
          <div className="h-[400px] w-full bg-[linear-gradient(135deg,#111827_0%,#1e293b_55%,#334155_100%)] md:h-[520px] xl:h-[660px]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,15,28,0.22)_0%,rgba(8,15,28,0.36)_38%,rgba(8,15,28,0.74)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,117,31,0.16),transparent_38%)]" />

        <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className="inline-flex items-center rounded-full border border-white/30 bg-[rgba(255,248,241,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#102033] shadow-sm backdrop-blur">
              {"Anivers\u00e1rios"}
            </span>

            {item.dateLabel && (
              <span className="inline-flex items-center rounded-full border border-white/20 bg-[rgba(16,32,51,0.52)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 backdrop-blur">
                {item.dateLabel}
              </span>
            )}
          </div>

          <div className="max-w-[500px] rounded-[28px] border border-white/30 bg-[rgba(255,249,243,0.46)] p-5 shadow-[0_22px_45px_rgba(15,23,42,0.14)] backdrop-blur-xl md:p-6">
            <div className="flex items-center gap-3">
              <span className="h-[3px] w-9 rounded-full bg-[#ff751f]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ff751f]">Destaque principal</p>
            </div>

            <h3 className="mt-4 max-w-[11ch] font-headline text-[clamp(1.3rem,2.25vw,2rem)] font-semibold leading-[1.08] text-[#102033] transition-colors group-hover/slide:text-[#ff751f]">
              {item.title}
            </h3>

            {item.excerpt && (
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#43515d] line-clamp-3">
                {item.excerpt}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#61707d]">
                Foz em Destaque
              </span>

              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#102033] transition-colors group-hover/slide:text-[#ff751f]">
                Ver conteudo
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
