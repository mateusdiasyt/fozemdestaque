"use client";

import { useEffect, useState } from "react";
import { Instagram, Facebook, Youtube } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  normalizeSocialUrl,
  SOCIAL_LINK_DEFAULTS,
  type SocialPlatform,
} from "@/lib/social-links";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M14.5 3c.48 1.95 1.74 3.5 3.57 4.32.96.43 1.99.65 3.04.66v3.17a9.4 9.4 0 0 1-3.61-.73v5.16c0 3.98-3.23 7.2-7.2 7.2S3.1 19.54 3.1 15.56s3.23-7.2 7.2-7.2c.39 0 .77.03 1.14.09v3.31a3.9 3.9 0 0 0-1.14-.17 3.98 3.98 0 1 0 0 7.95c2.2 0 4.01-1.78 4.01-3.98V3h3.19Z" />
    </svg>
  );
}

type SocialIcon = LucideIcon | typeof TikTokIcon;

interface SocialLinkItem {
  platform: SocialPlatform;
  label: string;
  href: string;
  order: number;
}

const ICON_BY_PLATFORM: Record<SocialPlatform, SocialIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  tiktok: TikTokIcon,
};

const FALLBACK_LINKS: SocialLinkItem[] = SOCIAL_LINK_DEFAULTS.map((item) => ({
  platform: item.platform,
  label: item.label,
  href: normalizeSocialUrl(item.platform, item.value) ?? "",
  order: item.order,
}))
  .filter((item) => !!item.href)
  .sort((a, b) => a.order - b.order);

export function PresentationBar() {
  const [socialLinks, setSocialLinks] = useState<SocialLinkItem[]>(FALLBACK_LINKS);

  useEffect(() => {
    let active = true;

    async function loadLinks() {
      try {
        const res = await fetch("/api/social-links");
        const data = (await res.json()) as SocialLinkItem[];

        if (!active || !Array.isArray(data) || data.length === 0) return;

        const filtered = data
          .filter((item) => item?.platform && item?.href)
          .sort((a, b) => a.order - b.order);

        if (filtered.length > 0) {
          setSocialLinks(filtered);
        }
      } catch {
        // fallback local links
      }
    }

    loadLinks();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="bg-[#fafbfc] border-b border-[#e8ebed] py-6 md:py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          <span className="inline-block h-1 w-12 bg-[#ff751f] rounded-full mb-4" />
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-[#1a1a1a] tracking-tight leading-tight">
            Foz em Destaque
          </h2>
          <p className="mt-2 text-[#4e5b60] text-sm md:text-base font-medium">
            🇦🇷 Argentina · 🇧🇷 Brasil · 🇵🇾 Paraguai
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            {socialLinks.map(({ platform, href, label }) => {
              const Icon = ICON_BY_PLATFORM[platform];
              return (
                <a
                  key={platform}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-[#4e5b60] hover:text-[#ff751f] transition-colors rounded-lg hover:bg-[#e8ebed]/50"
                  aria-label={label}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" {...(Icon !== TikTokIcon && { strokeWidth: 1.5 })} />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
