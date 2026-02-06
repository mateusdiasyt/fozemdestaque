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
    <div className="bg-[#e8ebed] border-t border-[#859eac]/30 py-6">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-3 gap-4">
          {banners.map((b) => (
            <div key={b.id} className="rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
              {b.linkUrl ? (
                <Link href={b.linkUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="aspect-[2/1] bg-[#f5f6f7] flex items-center justify-center p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.imageUrl} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                </Link>
              ) : (
                <div className="aspect-[2/1] bg-[#f5f6f7] flex items-center justify-center p-1">
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
