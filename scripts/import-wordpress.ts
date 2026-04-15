/**
 * Importa posts do WordPress direto no banco (sem API, sem Vercel).
 *
 * Exemplos:
 * - npx tsx scripts/import-wordpress.ts C:\caminho\export.xml
 * - npx tsx scripts/import-wordpress.ts C:\caminho\export.xml --dry-run
 * - npx tsx scripts/import-wordpress.ts C:\caminho\export.xml --dry-run --report tmp\import-report.json
 * - npx tsx scripts/import-wordpress.ts C:\caminho\export.xml --include-drafts --limit 50
 *
 * Requer DATABASE_URL no .env.local apenas para importar no banco.
 * Em --dry-run, o script consegue gerar relatório mesmo sem DATABASE_URL.
 *
 * Regras:
 * - Importa "post", "aniversarios" e "artigos-foz-em-desta"
 * - Mantém as URLs originais das imagens do WordPress
 * - Só grava no banco quando a categoria mapeada existe no site
 * - Gera relatório com itens ignorados/sem categoria para revisão manual
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { generateId, slugify } from "../src/lib/utils";
import { XMLParser } from "fast-xml-parser";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

const DATABASE_URL = process.env.DATABASE_URL;

const SUPPORTED_POST_TYPES = new Set(["post", "aniversarios", "artigos-foz-em-desta", "reflexao-do-dia"]);
const IMPORTABLE_STATUSES = new Set(["publish"]);
const OPTIONAL_STATUSES = new Set(["draft"]);
const THUMB_META_KEYS = ["_thumbnail_id", "thumb-do-aniversariante", "thumb-do-artigo", "thumb-da-reflexao"];
const EXCERPT_META_KEYS = ["pequeno-resumo"];

const CATEGORY_FALLBACKS: Record<string, string[]> = {
  "aniversarios": ["aniversariantes", "aniversarios"],
  "click-society": ["click-society", "society"],
  "society": ["society", "click-society"],
  "beleza-saude": ["beleza-saude", "beleza-amp-saude"],
  "beleza-amp-saude": ["beleza-amp-saude", "beleza-saude"],
  "reflexao-do-dia": ["reflexao-do-dia", "reflexao"],
  "reflexao": ["reflexao", "reflexao-do-dia"],
};

type CliOptions = {
  xmlPath: string;
  dryRun: boolean;
  includeDrafts: boolean;
  reportPath: string | null;
  limit: number | null;
};

type PreparedPost = {
  wpPostId: string;
  title: string;
  status: "publicado" | "rascunho";
  wpStatus: string;
  postType: string;
  slug: string;
  link: string | null;
  excerpt: string | null;
  content: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  categorySlugs: string[];
  mappedCategorySlug: string | null;
  tags: string[];
  canonicalUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  focusKeyword: string | null;
  publishedAt: Date | null;
  skipReason: string | null;
};

type ReportItem = {
  wpPostId: string;
  title: string;
  slug: string;
  link: string | null;
  postType: string;
  wpStatus: string;
  xmlCategories: string[];
  mappedCategorySlug: string | null;
  reason: string;
};

function normalizeItem<T>(item: T | T[] | null | undefined): T[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function getText(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object" && "#text" in (val as object)) {
    return String((val as { "#text": string })["#text"] || "").trim();
  }
  return String(val).trim();
}

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  let xmlPath = "";
  let dryRun = false;
  let includeDrafts = false;
  let reportPath: string | null = null;
  let limit: number | null = null;

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) continue;

    if (!arg.startsWith("--") && !xmlPath) {
      xmlPath = arg;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--include-drafts") {
      includeDrafts = true;
      continue;
    }

    if (arg === "--report") {
      reportPath = args.shift() ?? null;
      continue;
    }

    if (arg === "--limit") {
      const rawLimit = args.shift() ?? "";
      const parsedLimit = Number(rawLimit);
      if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
        throw new Error(`Valor inválido para --limit: ${rawLimit}`);
      }
      limit = parsedLimit;
      continue;
    }

    throw new Error(`Argumento não reconhecido: ${arg}`);
  }

  if (!xmlPath) {
    throw new Error(
      "Uso: npx tsx scripts/import-wordpress.ts caminho/para/export.xml [--dry-run] [--report caminho.json] [--include-drafts] [--limit N]"
    );
  }

  return { xmlPath, dryRun, includeDrafts, reportPath, limit };
}

function buildMetaMap(obj: Record<string, unknown>): Map<string, string> {
  const postmeta = normalizeItem(obj["wp:postmeta"] ?? obj.postmeta ?? []);
  const meta = new Map<string, string>();

  for (const pm of postmeta) {
    const p = pm as Record<string, unknown>;
    const key = getText(p["wp:meta_key"] ?? p.meta_key);
    if (!key) continue;
    meta.set(key, getText(p["wp:meta_value"] ?? p.meta_value));
  }

  return meta;
}

function extractCategorySlugs(obj: Record<string, unknown>): string[] {
  const categoryRefs = normalizeItem(obj.category ?? []);
  const slugs = new Set<string>();

  for (const cr of categoryRefs) {
    const category = cr as Record<string, unknown>;
    const domain = getText(category["@_domain"] ?? category.domain);
    if (domain !== "category" && domain !== "categorias-artigos") continue;

    const rawSlug =
      getText(category["@_nicename"]) ||
      getText(category.nicename) ||
      getText(category["#text"]) ||
      getText(category);

    const normalized = slugify(rawSlug);
    if (normalized) slugs.add(normalized);
  }

  return [...slugs];
}

function getCategoryCandidates(rawSlug: string): string[] {
  const normalized = slugify(rawSlug);
  if (!normalized) return [];
  return CATEGORY_FALLBACKS[normalized] ?? [normalized];
}

function resolveCategorySlug(rawSlugs: string[], availableCategorySlugs?: Set<string>): string | null {
  for (const rawSlug of rawSlugs) {
    const candidates = getCategoryCandidates(rawSlug);
    if (!availableCategorySlugs || availableCategorySlugs.size === 0) {
      return candidates[0] ?? null;
    }

    const matched = candidates.find((candidate) => availableCategorySlugs.has(candidate));
    if (matched) return matched;
  }

  if (rawSlugs.length === 0) return null;
  return getCategoryCandidates(rawSlugs[0])[0] ?? null;
}

function extractTags(obj: Record<string, unknown>): string[] {
  const categoryRefs = normalizeItem(obj.category ?? []);
  const tags = new Set<string>();

  for (const cr of categoryRefs) {
    const category = cr as Record<string, unknown>;
    const domain = getText(category["@_domain"] ?? category.domain);
    if (domain !== "post_tag" && domain !== "tags-artigos") continue;

    const tagName = getText(category["#text"] ?? category);
    if (tagName) tags.add(tagName);
  }

  return [...tags];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatDateLabel(rawDate: string): string | null {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;

  const day = `${parsed.getDate()}`.padStart(2, "0");
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildReflectionTitle(meta: Map<string, string>, obj: Record<string, unknown>): string {
  const explicitTitle = getText(obj.title);
  if (explicitTitle) return explicitTitle;

  const dateLabel =
    formatDateLabel(meta.get("data-da-reflexao") ?? "") ||
    formatDateLabel(getText(obj["wp:post_date"] ?? obj.post_date));

  if (dateLabel) return `Reflexão do Dia - ${dateLabel}`;

  const reflectionText = (meta.get("texto-da-reflexao") ?? "").trim();
  if (reflectionText) return truncateText(reflectionText, 70);

  const postId = getText(obj["wp:post_id"] ?? obj.post_id);
  return postId ? `Reflexão do Dia #${postId}` : "";
}

function getPreferredDate(meta: Map<string, string>, obj: Record<string, unknown>, status: string): Date | null {
  if (status !== "publicado") return null;

  const rawDate =
    meta.get("data-da-reflexao") ||
    meta.get("data-do-artigo") ||
    getText(obj["wp:post_date"] ?? obj.post_date) ||
    getText(obj.pubDate);

  if (!rawDate) return null;

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildPreparedPost(
  obj: Record<string, unknown>,
  attachmentMap: Map<string, string>,
  includeDrafts: boolean
): PreparedPost | null {
  const postType = getText(obj["wp:post_type"] ?? obj.post_type);
  if (!SUPPORTED_POST_TYPES.has(postType)) return null;

  const wpStatus = getText(obj["wp:status"] ?? obj.status);
  const shouldImport =
    IMPORTABLE_STATUSES.has(wpStatus) || (includeDrafts && OPTIONAL_STATUSES.has(wpStatus));
  if (!shouldImport) return null;

  const meta = buildMetaMap(obj);
  const reflectionText = (meta.get("texto-da-reflexao") ?? "").trim();
  const title =
    postType === "reflexao-do-dia"
      ? buildReflectionTitle(meta, obj)
      : getText(obj.title);
  if (!title) {
    return null;
  }

  const wpSlug = getText(obj["wp:post_name"] ?? obj.post_name);
  const slug = wpSlug ? slugify(wpSlug) : slugify(title);
  const categorySlugs = extractCategorySlugs(obj);
  const mappedCategorySlug =
    resolveCategorySlug(categorySlugs) ??
    (
      postType === "aniversarios"
        ? resolveCategorySlug(["aniversarios"])
        : postType === "reflexao-do-dia"
          ? resolveCategorySlug(["reflexao-do-dia"])
          : null
    );

  let featuredImageUrl: string | null = null;
  for (const key of THUMB_META_KEYS) {
    const thumbId = meta.get(key) ?? "";
    if (!thumbId) continue;
    featuredImageUrl = attachmentMap.get(thumbId) ?? null;
    if (featuredImageUrl) break;
  }
  if (!featuredImageUrl) {
    featuredImageUrl = meta.get("_yoast_wpseo_opengraph-image") || null;
  }

  let content = getText(obj["content:encoded"] ?? obj.content ?? "");
  if (!content && reflectionText) {
    content = `<p>${escapeHtml(reflectionText)}</p>`;
  }

  let excerpt =
    getText(obj["excerpt:encoded"] ?? obj.excerpt ?? "") ||
    EXCERPT_META_KEYS.map((key) => meta.get(key) ?? "").find(Boolean) ||
    "";
  if (!excerpt && reflectionText) {
    excerpt = truncateText(reflectionText, 160);
  }
  excerpt = excerpt.trim();

  const status = wpStatus === "publish" ? "publicado" : "rascunho";
  const link = getText(obj.link) || null;
  const canonicalUrl = link ?? null;

  return {
    wpPostId: getText(obj["wp:post_id"] ?? obj.post_id),
    title,
    status,
    wpStatus,
    postType,
    slug,
    link,
    excerpt: excerpt || null,
    content,
    featuredImageUrl,
    featuredImageAlt: title,
    categorySlugs,
    mappedCategorySlug,
    tags: extractTags(obj),
    canonicalUrl,
    metaTitle: (meta.get("_yoast_wpseo_title") || title || "").slice(0, 70) || null,
    metaDescription:
      (meta.get("_yoast_wpseo_metadesc") || excerpt || "").slice(0, 160) || null,
    focusKeyword: (meta.get("_yoast_wpseo_focuskw") || "").slice(0, 100) || null,
    publishedAt: getPreferredDate(meta, obj, status),
    skipReason: mappedCategorySlug ? null : "sem-categoria-no-xml",
  };
}

function incrementCounter(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function writeReport(reportPath: string, payload: unknown) {
  const absolutePath = resolve(process.cwd(), reportPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`Relatório salvo em: ${absolutePath}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const absolutePath = resolve(process.cwd(), options.xmlPath);

  console.log("Lendo XML:", absolutePath);
  console.log(
    options.dryRun
      ? "Modo: dry-run (não grava no banco)"
      : "Modo: importação real (grava no banco)"
  );

  let xmlText: string;
  try {
    xmlText = readFileSync(absolutePath, "utf-8");
  } catch (err) {
    console.error("Erro ao ler arquivo:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
  });
  const parsed = parser.parse(xmlText);
  const channel = parsed?.rss?.channel ?? parsed?.channel;
  if (!channel) {
    console.error("Formato XML inválido (sem channel)");
    process.exit(1);
  }

  const rawItems = normalizeItem<Record<string, unknown>>(channel.item ?? []);

  const attachmentMap = new Map<string, string>();
  const byType = new Map<string, number>();
  const byTypeStatus = new Map<string, number>();

  for (const item of rawItems) {
    const postType = getText(item["wp:post_type"] ?? item.post_type) || "(sem-tipo)";
    const wpStatus = getText(item["wp:status"] ?? item.status) || "(sem-status)";
    incrementCounter(byType, postType);
    incrementCounter(byTypeStatus, `${postType}|||${wpStatus}`);

    if (postType !== "attachment") continue;

    const postId = getText(item["wp:post_id"] ?? item.post_id);
    const guid = getText(item.guid);
    const attUrl = getText(item["wp:attachment_url"] ?? item.attachment_url) || guid;
    if (postId && attUrl && attUrl.startsWith("http")) {
      attachmentMap.set(postId, attUrl);
    }
  }

  const preparedPosts = rawItems
    .map((item) => buildPreparedPost(item, attachmentMap, options.includeDrafts))
    .filter((item): item is PreparedPost => Boolean(item));

  const limitedPosts =
    options.limit != null ? preparedPosts.slice(0, options.limit) : preparedPosts;

  let db:
    | ReturnType<typeof drizzle<typeof schema>>
    | null = null;
  let authorId: string | null = null;
  const categoryMap = new Map<string, string>();
  const existingCategorySlugs = new Set<string>();
  const existingCanonicalUrls = new Set<string>();
  const usedSlugs = new Set<string>();

  if (DATABASE_URL) {
    const sql = neon(DATABASE_URL);
    db = drizzle(sql, { schema });

    const [admin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "administrador"))
      .limit(1);
    authorId = admin?.id ?? null;

    const existingCats = await db.select().from(schema.categories);
    for (const category of existingCats) {
      categoryMap.set(category.slug, category.id);
      existingCategorySlugs.add(category.slug);
    }

    const existingPosts = await db.select({
      slug: schema.posts.slug,
      canonicalUrl: schema.posts.canonicalUrl,
    }).from(schema.posts);

    for (const post of existingPosts) {
      usedSlugs.add(post.slug);
      if (post.canonicalUrl) existingCanonicalUrls.add(post.canonicalUrl);
    }
  } else if (!options.dryRun) {
    console.error("DATABASE_URL não definida no .env.local");
    process.exit(1);
  }

  const reportSkipped: ReportItem[] = [];
  const reportReady: ReportItem[] = [];
  const byMappedCategory = new Map<string, number>();
  const missingSiteCategories = new Set<string>();

  let imported = 0;
  let skipped = 0;

  for (const prepared of limitedPosts) {
    if (prepared.skipReason) {
      skipped++;
      reportSkipped.push({
        wpPostId: prepared.wpPostId,
        title: prepared.title,
        slug: prepared.slug,
        link: prepared.link,
        postType: prepared.postType,
        wpStatus: prepared.wpStatus,
        xmlCategories: prepared.categorySlugs,
        mappedCategorySlug: prepared.mappedCategorySlug,
        reason: prepared.skipReason,
      });
      continue;
    }

    const resolvedCategorySlug =
      resolveCategorySlug(prepared.categorySlugs, existingCategorySlugs) ??
      (prepared.postType === "aniversarios"
        ? resolveCategorySlug(["aniversarios"], existingCategorySlugs)
        : prepared.mappedCategorySlug);

    if (resolvedCategorySlug) {
      incrementCounter(byMappedCategory, resolvedCategorySlug);
    }

    let categoryId: string | null = null;
    if (resolvedCategorySlug && categoryMap.size > 0) {
      categoryId = categoryMap.get(resolvedCategorySlug) ?? null;
      if (!categoryId) {
        missingSiteCategories.add(resolvedCategorySlug);
      }
    }

    if (categoryMap.size > 0 && !categoryId) {
      skipped++;
      reportSkipped.push({
        wpPostId: prepared.wpPostId,
        title: prepared.title,
        slug: prepared.slug,
        link: prepared.link,
        postType: prepared.postType,
        wpStatus: prepared.wpStatus,
        xmlCategories: prepared.categorySlugs,
        mappedCategorySlug: resolvedCategorySlug,
        reason: "categoria-nao-existe-no-site",
      });
      continue;
    }

    if (prepared.canonicalUrl && existingCanonicalUrls.has(prepared.canonicalUrl)) {
      skipped++;
      reportSkipped.push({
        wpPostId: prepared.wpPostId,
        title: prepared.title,
        slug: prepared.slug,
        link: prepared.link,
        postType: prepared.postType,
        wpStatus: prepared.wpStatus,
        xmlCategories: prepared.categorySlugs,
        mappedCategorySlug: resolvedCategorySlug,
        reason: "ja-importado-pelo-canonical",
      });
      continue;
    }

    let finalSlug = prepared.slug;
    let suffix = 1;
    while (usedSlugs.has(finalSlug)) {
      finalSlug = `${prepared.slug}-${suffix}`;
      suffix++;
    }
    usedSlugs.add(finalSlug);

    reportReady.push({
      wpPostId: prepared.wpPostId,
      title: prepared.title,
      slug: finalSlug,
      link: prepared.link,
      postType: prepared.postType,
      wpStatus: prepared.wpStatus,
      xmlCategories: prepared.categorySlugs,
      mappedCategorySlug: resolvedCategorySlug,
      reason: options.dryRun ? "pronto-para-importar" : "importado",
    });

    if (options.dryRun) continue;
    if (!db) continue;

    await db.insert(schema.posts).values({
      id: generateId(),
      title: prepared.title,
      slug: finalSlug,
      excerpt: prepared.excerpt,
      content: prepared.content,
      featuredImage: prepared.featuredImageUrl,
      featuredImageAlt: prepared.featuredImageAlt,
      categoryId,
      tags: prepared.tags.length > 0 ? JSON.stringify(prepared.tags) : null,
      canonicalUrl: prepared.canonicalUrl,
      authorId,
      status: prepared.status,
      featured: false,
      metaTitle: prepared.metaTitle,
      metaDescription: prepared.metaDescription,
      focusKeyword: prepared.focusKeyword,
      publishedAt: prepared.publishedAt,
    });

    imported++;
    if (prepared.canonicalUrl) {
      existingCanonicalUrls.add(prepared.canonicalUrl);
    }

    if (imported % 25 === 0) {
      console.log(`  ${imported} posts importados...`);
    }
  }

  const reportPayload = {
    sourceXml: absolutePath,
    dryRun: options.dryRun,
    includeDrafts: options.includeDrafts,
    limit: options.limit,
    totals: {
      xmlItems: rawItems.length,
      attachments: attachmentMap.size,
      preparedPosts: limitedPosts.length,
      readyToImport: reportReady.length,
      imported,
      skipped,
    },
    byType: Object.fromEntries([...byType.entries()].sort()),
    byTypeStatus: Object.fromEntries([...byTypeStatus.entries()].sort()),
    byMappedCategory: Object.fromEntries([...byMappedCategory.entries()].sort()),
    missingSiteCategories: [...missingSiteCategories].sort(),
    ready: reportReady,
    skippedItems: reportSkipped,
  };

  if (options.reportPath) {
    writeReport(options.reportPath, reportPayload);
  }

  console.log("");
  console.log(`Posts preparados: ${limitedPosts.length}`);
  console.log(`Prontos para importar: ${reportReady.length}`);
  console.log(`Ignorados: ${skipped}`);
  if (!options.dryRun) {
    console.log(`Importados no banco: ${imported}`);
  }

  if (missingSiteCategories.size > 0) {
    console.log(
      `Categorias faltando no site: ${[...missingSiteCategories].sort().join(", ")}`
    );
  }

  console.log(
    options.dryRun
      ? "Dry-run concluído. Nenhum post foi gravado."
      : "Importação concluída com sucesso."
  );
  console.log(
    "As imagens continuam apontando para as URLs originais do WordPress. Se quiser hospedar localmente depois, isso pode ser feito em uma segunda etapa."
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
