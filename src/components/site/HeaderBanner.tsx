"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Banner {
  id: string;
  title: string | null;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
}

export function HeaderBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch("/api/banners?position=header")
      .then((r) => r.json())
      .then(setBanners)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const b = banners[current];
  const content = (
    <div className="relative h-24 md:h-32 bg-[#e8ebed] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.imageUrl} alt={b.title ?? ""} className="w-full h-full object-cover" />
    </div>
  );

  return b.linkUrl ? (
    <Link href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
