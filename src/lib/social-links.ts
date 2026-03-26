export type SocialPlatform = "instagram" | "facebook" | "youtube" | "x";

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
    platform: "x",
    label: "X",
    value: "https://x.com/fozemdestaque",
    active: true,
    order: 3,
    placeholder: "@fozemdestaque ou https://x.com/...",
  },
];

const SOCIAL_BASE_URL: Record<SocialPlatform, string> = {
  instagram: "https://www.instagram.com/",
  facebook: "https://www.facebook.com/",
  youtube: "https://www.youtube.com/@",
  x: "https://x.com/",
};

export function isSocialPlatform(value: string): value is SocialPlatform {
  return SOCIAL_LINK_DEFAULTS.some((item) => item.platform === value);
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

