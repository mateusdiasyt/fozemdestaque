"use client";

import { BannerCarousel } from "@/components/site/BannerCarousel";

export function FooterBanner() {
  return (
    <BannerCarousel
      position="rodape"
      fallbackPosition="header"
      wrapperClassName="border-t border-[#dfe5ea] bg-[#eef2f4] py-8"
      contentClassName="max-w-7xl"
    />
  );
}
