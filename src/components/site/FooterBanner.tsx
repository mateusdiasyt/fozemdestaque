"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
}

export function FooterBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/banners?position=rodape")
      .then((r) => r.json())
      .then(setBanners)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % banners.length), 6000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const b = banners[current];
  const content = (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <div className="h-20 md:h-24 bg-slate-200 rounded-lg overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    </div>
  );

  return (
    <div className="bg-slate-100 border-t border-slate-200">
      {b.linkUrl ? (
        <Link href={b.linkUrl} target="_blank" rel="noopener noreferrer">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}
