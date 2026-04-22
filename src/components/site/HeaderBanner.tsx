"use client";

import { BannerCarousel } from "@/components/site/BannerCarousel";

export function HeaderBanner() {
  return (
    <BannerCarousel
      position="header"
      wrapperClassName="border-b border-[#e8ebed] bg-white py-4"
      contentClassName="max-w-7xl"
    />
  );
}
