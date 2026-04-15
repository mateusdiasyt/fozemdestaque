"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
}

const AUTO_ROTATE_MS = 5000;

export function BirthdaySlider({ items }: BirthdaySliderProps) {
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
        Nenhum conteúdo em aniversários no momento.
      </div>
    );
  }

  const active = items[currentIndex];
  const canRotate = items.length > 1;

  function goTo(index: number) {
    setCurrentIndex((index + items.length) % items.length);
  }

  return (
    <article className="overflow-hidden rounded-[28px] border border-[#172132] bg-[#0b1323] shadow-[0_22px_70px_rgba(15,23,42,0.22)]">
      {active.href ? (
        <Link href={active.href} className="group/slide block">
          <SlideContent item={active} />
        </Link>
      ) : (
        <div className="group/slide block">
          <SlideContent item={active} />
        </div>
      )}

      <div className="border-t border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
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
                        : "w-2 bg-white/25 hover:bg-white/50"
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/6 text-white transition-colors hover:border-[#ff751f] hover:text-[#ff751f]"
                aria-label="Aniversario anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => goTo(currentIndex + 1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/6 text-white transition-colors hover:border-[#ff751f] hover:text-[#ff751f]"
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
    <div className="relative min-h-[360px] md:min-h-[430px]">
      <div className="absolute inset-0">
        {item.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.image}
            alt={item.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover/slide:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#111827_0%,#1e293b_55%,#334155_100%)]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.12)_0%,rgba(2,6,23,0.50)_48%,rgba(2,6,23,0.92)_100%)]" />
      </div>

      <div className="relative flex h-full flex-col justify-between p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur">
            HighSocietyClub
          </span>

          {item.dateLabel && (
            <span className="inline-flex items-center rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-100 backdrop-blur">
              {item.dateLabel}
            </span>
          )}
        </div>

        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffd2b3]">Destaque principal</p>
          <h3 className="mt-3 font-headline text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-[1.02] text-white transition-colors group-hover/slide:text-[#ffd2b3]">
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 line-clamp-3">
              {item.excerpt}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
