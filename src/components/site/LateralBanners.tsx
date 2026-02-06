"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Banner {
  id: string;
  imageUrl: string;
  linkUrl: string | null;
  position: string;
}

export function LateralBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/banners?position=lateral_1").then((r) => r.json()),
      fetch("/api/banners?position=lateral_2").then((r) => r.json()),
    ]).then(([b1, b2]) => setBanners([...b1, ...b2])).catch(() => {});
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="space-y-4 sticky top-4">
      {banners.map((b) => (
        <div key={b.id} className="rounded-lg overflow-hidden bg-[#e8ebed] border border-[#e8ebed]">
          {b.linkUrl ? (
            <Link href={b.linkUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt="" className="w-full h-auto block" />
            </Link>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={b.imageUrl} alt="" className="w-full h-auto block" />
          )}
        </div>
      ))}
    </div>
  );
}
