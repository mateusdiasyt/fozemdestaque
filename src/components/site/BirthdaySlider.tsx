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
      <div className="bg-white rounded-xl shadow-sm border border-[#e8ebed] p-6 text-center text-[#859eac] text-sm">
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
    <article className="rounded-xl overflow-hidden shadow-sm border border-[#e8ebed] bg-white">
      {active.href ? (
        <Link href={active.href} className="block group">
          <SlideContent item={active} />
        </Link>
      ) : (
        <SlideContent item={active} />
      )}

      {canRotate && (
        <div className="border-t border-[#e8ebed] px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => goTo(currentIndex - 1)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#e8ebed] text-[#4e5b60] hover:text-[#ff751f] hover:border-[#ff751f] transition-colors"
            aria-label="Aniversario anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-5 bg-[#ff751f]"
                    : "w-2 bg-[#cbd5e1] hover:bg-[#94a3b8]"
                }`}
                aria-label={`Ir para aniversario ${index + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(currentIndex + 1)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#e8ebed] text-[#4e5b60] hover:text-[#ff751f] hover:border-[#ff751f] transition-colors"
            aria-label="Proximo aniversario"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </article>
  );
}

function SlideContent({ item }: { item: BirthdaySlideItem }) {
  return (
    <div className="flex flex-col min-h-[280px]">
      <div className="w-full h-[180px] bg-[#e8ebed] overflow-hidden">
        {item.image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={item.image}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#859eac] text-sm">Foz</span>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-headline text-lg font-bold text-[#4e5b60] group-hover:text-[#ff751f] transition-colors line-clamp-2">
          {item.title}
        </h3>
        {item.excerpt && <p className="text-sm text-[#859eac] line-clamp-3">{item.excerpt}</p>}
        {item.dateLabel && <p className="text-xs text-[#859eac] mt-auto pt-1">{item.dateLabel}</p>}
      </div>
    </div>
  );
}
