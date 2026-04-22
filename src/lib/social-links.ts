export type SocialPlatform = "instagram" | "facebook" | "youtube" | "tiktok";

export interface SocialLinkConfig {
  platform: SocialPlatform;
  label: string;
  value: string;
  active: boolean;
  order: number;
  placeholder: string;
}

export const SOCIAL_LINK_DEFAULTS: SocialLinkConfig[] = [
  {
    platform: "instagram",
    label: "Instagram",
    value: "https://www.instagram.com/fozemdestaque/",
    active: true,
    order: 0,
    placeholder: "@fozemdestaque ou https://instagram.com/...",
  },
  {
    platform: "facebook",
    label: "Facebook",
    value: "https://www.facebook.com/FozEmDestaque/",
    active: true,
    order: 1,
    placeholder: "@FozEmDestaque ou https://facebook.com/...",
  },
  {
    platform: "youtube",
    label: "YouTube",
    value: "https://www.youtube.com/c/FozemDestaque",
    active: true,
    order: 2,
    placeholder: "@FozemDestaque ou https://youtube.com/...",
  },
  {
    platform: "tiktok",
    label: "TikTok",
    value: "https://www.tiktok.com/@fozemdestaque",
    active: true,
    order: 3,
    placeholder: "@fozemdestaque ou https://tiktok.com/@...",
  },
];

const SOCIAL_BASE_URL: Record<SocialPlatform, string> = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  youtube: "https://www.youtube.com/@",
  tiktok: "https://www.tiktok.com/@",
};

const SOCIAL_PLATFORM_ALIASES: Record<string, SocialPlatform> = {
  x: "tiktok",
};

export function resolveSocialPlatform(value: string | null | undefined): SocialPlatform | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;

  if (SOCIAL_LINK_DEFAULTS.some((item) => item.platform === normalized)) {
    return normalized as SocialPlatform;
  }

  return SOCIAL_PLATFORM_ALIASES[normalized] ?? null;
}

export function isSocialPlatform(value: string): boolean {
  return resolveSocialPlatform(value) !== null;
}

export function normalizeSocialUrl(
  platform: SocialPlatform,
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const username = trimmed.replace(/^@/, "").replace(/^\/+/, "");
  if (!username) return null;
  return `${SOCIAL_BASE_URL[platform]}${username}`;
}

export interface SocialLinkState {
  platform: SocialPlatform;
  label: string;
  value: string;
  active: boolean;
  order: number;
  placeholder: string;
}

export function mergeSocialLinks(
  rows: Array<{
    platform: SocialPlatform;
    value: string | null;
    active: boolean;
    order: number;
  }>
): SocialLinkState[] {
  const byPlatform = new Map(rows.map((row) => [row.platform, row]));
  return SOCIAL_LINK_DEFAULTS
    .map((base) => {
      const current = byPlatform.get(base.platform);
      return {
        platform: base.platform,
        label: base.label,
        placeholder: base.placeholder,
        value: current?.value ?? base.value,
        active: current?.active ?? base.active,
        order: current?.order ?? base.order,
      };
    })
    .sort((a, b) => a.order - b.order);
}

