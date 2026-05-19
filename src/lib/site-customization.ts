import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { contentBlocks } from "@/lib/db/schema";

export const DEFAULT_SITE_CUSTOMIZATION = {
  pageTitle: "Foz em Destaque",
  faviconUrl: "",
};

type SiteCustomization = typeof DEFAULT_SITE_CUSTOMIZATION;

const SETTING_TYPE = "site_setting";
const PAGE_TITLE_KEY = "page_title";
const FAVICON_URL_KEY = "favicon_url";

export async function getSiteCustomization(): Promise<SiteCustomization> {
  try {
    const rows = await db
      .select({
        key: contentBlocks.slug,
        value: contentBlocks.content,
        link: contentBlocks.link,
      })
      .from(contentBlocks)
      .where(
        and(
          eq(contentBlocks.type, SETTING_TYPE),
          inArray(contentBlocks.slug, [PAGE_TITLE_KEY, FAVICON_URL_KEY])
        )
      );

    const pageTitle =
      rows.find((row) => row.key === PAGE_TITLE_KEY)?.value?.trim() ||
      DEFAULT_SITE_CUSTOMIZATION.pageTitle;
    const faviconUrl =
      rows.find((row) => row.key === FAVICON_URL_KEY)?.link?.trim() ||
      rows.find((row) => row.key === FAVICON_URL_KEY)?.value?.trim() ||
      DEFAULT_SITE_CUSTOMIZATION.faviconUrl;

    return { pageTitle, faviconUrl };
  } catch {
    return DEFAULT_SITE_CUSTOMIZATION;
  }
}

export const siteCustomizationKeys = {
  type: SETTING_TYPE,
  pageTitle: PAGE_TITLE_KEY,
  faviconUrl: FAVICON_URL_KEY,
} as const;
