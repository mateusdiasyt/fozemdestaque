import type { NextApiRequest, NextApiResponse } from "next";
import { auth, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { posts, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateId, slugify } from "@/lib/utils";
import { XMLParser } from "fast-xml-parser";
import { put } from "@vercel/blob";

function normalizeItem(item: unknown): unknown[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function getText(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object" && "#text" in (val as object)) return String((val as { "#text": string })["#text"] || "").trim();
  return String(val).trim();
}

function extractImgUrls(html: string): string[] {
  const urls: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) urls.push(m[1]);
  return urls;
}

async function downloadAndUploadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "FozEmDestaque-Import/1.0" } });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : contentType.includes("gif") ? "gif" : "jpg";
    const pathname = `imports/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const blob = await put(pathname, Buffer.from(buffer), { access: "public", contentType });
    return blob.url;
  } catch {
    return null;
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Método não permitido" });
  }

  try {
    const session = await auth(req, res);
    if (!session?.user || !hasPermission((session.user.role as "administrador" | "editor" | "colaborador") ?? "colaborador", "posts")) {
      return res.status(401).json({ ok: false, error: "Não autorizado" });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return res.status(500).json({ ok: false, error: "BLOB_READ_WRITE_TOKEN não configurado" });
    }

    const body = req.body as { url?: string; offset?: number; limit?: number; skipImages?: boolean };
    const url = body?.url;
    const offset = Math.max(0, Number(body?.offset) || 0);
    const limit = Math.min(20, Math.max(1, Number(body?.limit) || 2));
    const skipImages = !!body?.skipImages;

    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      return res.status(400).json({ ok: false, error: "URL do arquivo XML inválida" });
    }

    const fetchRes = await fetch(url, { headers: { "User-Agent": "FozEmDestaque-Import/1.0" } });
    if (!fetchRes.ok) return res.status(400).json({ ok: false, error: "Falha ao baixar o XML" });
    const xmlText = await fetchRes.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseTagValue: true,
      trimValues: true,
    });
    const parsed = parser.parse(xmlText);

    const channel = parsed?.rss?.channel ?? parsed?.channel;
    if (!channel) {
      return res.status(400).json({ ok: false, error: "Formato XML inválido (sem channel)" });
    }

    const rawItems = channel.item ?? [];
    const items = normalizeItem(rawItems);

    const attachmentMap = new Map<string, string>();
    for (const it of items) {
      const obj = it as Record<string, unknown>;
      const postType = getText(obj["wp:post_type"] ?? obj.post_type);
      if (postType !== "attachment") continue;
      const postId = getText(obj["wp:post_id"] ?? obj.post_id);
      const guid = getText(obj.guid);
      const attUrl = getText(obj["wp:attachment_url"] ?? obj.attachment_url) || guid;
      if (postId && attUrl && attUrl.startsWith("http")) attachmentMap.set(postId, attUrl);
    }

    const wpCategories = normalizeItem(channel["wp:category"] ?? channel.category ?? []);
    const categoryMap = new Map<string, string>();
    const existingCats = await db.select().from(categories);

    for (const cat of wpCategories) {
      const c = cat as Record<string, unknown>;
      const name = getText(c["wp:cat_name"] ?? c.name);
      const slug = getText(c["wp:category_nicename"] ?? c.slug ?? c["@_nicename"]) || slugify(name) || "sem-categoria";
      if (categoryMap.has(slug)) continue;
      const existing = existingCats.find((ec) => ec.slug === slug);
      if (existing) {
        categoryMap.set(slug, existing.id);
        continue;
      }
      const catId = generateId();
      await db.insert(categories).values({ id: catId, name: name || slug, slug, active: true });
      categoryMap.set(slug, catId);
    }

    const postItems = items.filter((it) => getText((it as Record<string, unknown>)["wp:post_type"] ?? (it as Record<string, unknown>).post_type) === "post");
    const total = postItems.length;
    const batch = postItems.slice(offset, offset + limit);

    const authorId = session.user.id ?? null;
    let imported = 0;
    let skipped = 0;
    const imageCache = new Map<string, string>();

    for (const it of batch) {
      const obj = it as Record<string, unknown>;
      const title = getText(obj.title);
      if (!title) { skipped++; continue; }

      const wpStatus = getText(obj["wp:status"] ?? obj.status);
      const status = wpStatus === "publish" ? "publicado" : "rascunho";
      const content = getText(obj["content:encoded"] ?? obj["content:encoded"] ?? obj.content ?? "");
      const excerpt = getText(obj["excerpt:encoded"] ?? obj["excerpt:encoded"] ?? obj.excerpt ?? "");
      const wpSlug = getText(obj["wp:post_name"] ?? obj.post_name);
      const slug = wpSlug ? slugify(wpSlug) : slugify(title);

      const catRef = normalizeItem(obj.category ?? []);
      let categoryId: string | null = null;
      for (const cr of catRef) {
        const c = cr as Record<string, unknown>;
        const domain = getText(c["@_domain"] ?? c.domain);
        if (domain === "category") {
          const catSlug = slugify(getText(c["#text"] ?? c["@_nicename"] ?? c));
          categoryId = categoryMap.get(catSlug) ?? existingCats.find((ec) => ec.slug === catSlug)?.id ?? null;
          if (categoryId) break;
        }
      }

      const postmeta = normalizeItem(obj["wp:postmeta"] ?? obj.postmeta ?? []);
      let featuredImageUrl: string | null = null;
      for (const pm of postmeta) {
        const p = pm as Record<string, unknown>;
        if (getText(p["wp:meta_key"] ?? p.meta_key) === "_thumbnail_id") {
          const thumbId = getText(p["wp:meta_value"] ?? p.meta_value);
          featuredImageUrl = attachmentMap.get(thumbId) ?? null;
          break;
        }
      }

      let finalContent = content;
      let finalFeaturedImage = featuredImageUrl;
      if (!skipImages) {
        const contentImgUrls = extractImgUrls(content);
        const allImgUrls = [...new Set([featuredImageUrl, ...contentImgUrls].filter(Boolean) as string[])];
        for (const oldUrl of allImgUrls) {
          if (!oldUrl.startsWith("http")) continue;
          let newUrl = imageCache.get(oldUrl);
          if (!newUrl) {
            newUrl = (await downloadAndUploadImage(oldUrl)) ?? oldUrl;
            imageCache.set(oldUrl, newUrl);
          }
          finalContent = finalContent.split(oldUrl).join(newUrl);
          if (oldUrl === featuredImageUrl) finalFeaturedImage = newUrl;
        }
      } else {
        finalFeaturedImage = featuredImageUrl;
      }

      let finalSlug = slug;
      let suffix = 1;
      while (true) {
        const [existing] = await db.select().from(posts).where(eq(posts.slug, finalSlug)).limit(1);
        if (!existing) break;
        finalSlug = `${slug}-${suffix}`;
        suffix++;
      }

      const postId = generateId();
      const pubDate = getText(obj["wp:post_date"] ?? obj.post_date);
      const publishedAt = status === "publicado" && pubDate ? new Date(pubDate) : null;

      await db.insert(posts).values({
        id: postId,
        title,
        slug: finalSlug,
        excerpt: excerpt || null,
        content: finalContent,
        featuredImage: skipImages ? featuredImageUrl : finalFeaturedImage,
        featuredImageAlt: null,
        categoryId: categoryId ?? null,
        status,
        featured: false,
        authorId,
        publishedAt,
      });
      imported++;
    }

    const nextOffset = offset + batch.length;
    const hasMore = nextOffset < total;

    return res.status(200).json({
      ok: true,
      imported,
      skipped,
      total,
      hasMore,
      nextOffset: hasMore ? nextOffset : undefined,
      categoriesCreated: categoryMap.size,
    });
  } catch (err) {
    console.error("[import wordpress]", err);
    const message = err instanceof Error ? err.message : "Erro na importação";
    return res.status(500).json({ ok: false, error: message });
  }
}
