"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteImage } from "@/components/site/SiteImage";

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
    ])
      .then(([b1, b2]) => setBanners([...b1, ...b2]))
      .catch(() => {});
  }, []);

  if (banners.length === 0) return null;

  return (
    <div className="sticky top-4 space-y-4">
      {banners.map((banner) => (
        <div key={banner.id} className="overflow-hidden rounded-lg border border-[#e8ebed] bg-[#e8ebed]">
          {banner.linkUrl ? (
            <Link href={banner.linkUrl} target="_blank" rel="noopener noreferrer">
              <SiteImage
                src={banner.imageUrl}
                alt=""
                className="block h-auto w-full"
                fallback={<div className="aspect-[300/600] w-full bg-[#e8ebed]" />}
              />
            </Link>
          ) : (
            <SiteImage
              src={banner.imageUrl}
              alt=""
              className="block h-auto w-full"
              fallback={<div className="aspect-[300/600] w-full bg-[#e8ebed]" />}
            />
          )}
        </div>
      ))}
    </div>
  );
}
