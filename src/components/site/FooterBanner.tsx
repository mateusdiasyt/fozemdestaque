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

  useEffect(() => {
    fetch("/api/banners?position=rodape")
      .then((r) => r.json())
      .then((data) => setBanners((data as Banner[]).slice(0, 6)))
      .catch(() => {});
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="bg-[#c8ced4] py-6">
      <div className="max-w-[1420px] mx-auto px-4">
        <div className="grid grid-cols-3 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow w-full">
              {b.linkUrl ? (
                <Link href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="w-full aspect-[460/150] bg-[#b8bec4] flex items-center justify-center p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                </Link>
              ) : (
                <div className="w-full aspect-[460/150] bg-[#b8bec4] flex items-center justify-center p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
