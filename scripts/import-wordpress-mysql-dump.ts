import { config } from "dotenv";
config({ path: ".env.local" });

import { createReadStream, mkdirSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import * as readline from "readline";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { normalizeDatabaseUrl } from "../src/lib/db/url";
import { coercePostCategoryState } from "../src/lib/post-categories";
import { generateId, slugify } from "../src/lib/utils";

const DATABASE_URL = process.env.DATABASE_URL;

const SUPPORTED_POST_TYPES = new Set([
  "post",
  "aniversarios",
  "artigos-foz-em-desta",
  "reflexao-do-dia",
  "datas-comemorativas",
]);

const IMPORTABLE_STATUSES = new Set(["publish"]);
const OPTIONAL_STATUSES = new Set(["draft", "future", "pending"]);
const THUMB_META_KEYS = [
  "_thumbnail_id",
  "thumb-do-aniversariante",
  "thumb-do-artigo",
  "thumb-da-reflexao",
  "thumb-da-data",
];
const EXCERPT_META_KEYS = ["pequeno-resumo"];
const RELEVANT_POST_META_KEYS = new Set([
  ...THUMB_META_KEYS,
  ...EXCERPT_META_KEYS,
  "_yoast_wpseo_opengraph-image",
  "_yoast_wpseo_title",
  "_yoast_wpseo_metadesc",
  "_yoast_wpseo_focuskw",
  "_wp_attachment_image_alt",
  "_wp_attached_file",
  "texto-da-reflexao",
  "descricao-sobre-a-data",
  "nome-da-data",
  "data",
  "data-da-reflexao",
  "data-do-artigo",
]);

const CATEGORY_FALLBACKS: Record<string, string[]> = {
  aniversarios: ["aniversariantes", "aniversarios"],
  "click-society": ["click-society", "society"],
  society: ["society", "click-society"],
  "beleza-saude": ["beleza-saude", "beleza-amp-saude"],
  "beleza-amp-saude": ["beleza-amp-saude", "beleza-saude"],
  "reflexao-do-dia": ["reflexao-do-dia", "reflexao"],
  reflexao: ["reflexao", "reflexao-do-dia"],
  "datas-comemorativas": ["datas", "datas-comemorativas"],
  datas: ["datas", "datas-comemorativas"],
  agenda: ["agenda"],
  "coluna-social": ["coluna-social"],
  mailing: ["mailing"],
  inaugura: ["inaugura"],
  merchandising: ["merchandising"],
  "ti-ti-ti": ["ti-ti-ti"],
  "par-perfeito": ["par-perfeito"],
  "bela-da-sociedade": ["bela-da-sociedade"],
  equipe: ["equipe"],
  "top-mirim": ["top-mirim"],
  "top-profissional": ["top-profissional"],
  "foz-em-destaque-tv": ["foz-em-destaque-tv"],
  "programa-foz-em-destaque-tv": ["programa-foz-em-destaque-tv"],
};

type CliOptions = {
  dumpPath: string;
  dryRun: boolean;
  includeDrafts: boolean;
  reportPath: string | null;
  limit: number | null;
};

type SqlScalar = string | null;

type RawPost = {
  id: string;
  authorId: string | null;
  postDate: string | null;
  postContent: string;
  postTitle: string;
  postExcerpt: string;
  postStatus: string;
  postName: string;
  postType: string;
  guid: string | null;
};

type AttachmentInfo = {
  id: string;
  url: string | null;
  title: string | null;
  alt: string | null;
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
  postType: string;
  wpStatus: string;
  xmlCategories: string[];
  mappedCategorySlug: string | null;
  reason: string;
};

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  let dumpPath = "";
  let dryRun = false;
  let includeDrafts = false;
  let reportPath: string | null = null;
  let limit: number | null = null;

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) continue;

    if (!arg.startsWith("--") && !dumpPath) {
      dumpPath = arg;
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

  if (!dumpPath) {
    throw new Error(
      "Uso: npx tsx scripts/import-wordpress-mysql-dump.ts caminho/para/localhost.sql [--dry-run] [--report caminho.json] [--include-drafts] [--limit N]"
    );
  }

  return { dumpPath, dryRun, includeDrafts, reportPath, limit };
}

function decodeMySqlString(value: string) {
  let result = "";
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char !== "\\") {
      result += char;
      continue;
    }

    const next = value[i + 1];
    if (next == null) {
      result += "\\";
      continue;
    }

    switch (next) {
      case "0":
        result += "\0";
        break;
      case "b":
        result += "\b";
        break;
      case "n":
        result += "\n";
        break;
      case "r":
        result += "\r";
        break;
      case "t":
        result += "\t";
        break;
      case "Z":
        result += "\x1A";
        break;
      case "'":
      case '"':
      case "\\":
        result += next;
        break;
      default:
        result += next;
        break;
    }

    i += 1;
  }

  return result;
}

function parseScalar(token: string, quoted: boolean): SqlScalar {
  if (quoted) return decodeMySqlString(token);
  const trimmed = token.trim();
  if (!trimmed || /^null$/i.test(trimmed)) return null;
  return trimmed;
}

function parseValuesBlock(input: string): SqlScalar[][] {
  const rows: SqlScalar[][] = [];
  let i = 0;

  while (i < input.length) {
    while (i < input.length && /\s|,/.test(input[i]!)) i += 1;
    if (i >= input.length) break;
    if (input[i] !== "(") {
      i += 1;
      continue;
    }

    i += 1;
    const row: SqlScalar[] = [];
    let token = "";
    let inString = false;
    let quoted = false;

    while (i < input.length) {
      const char = input[i]!;

      if (inString) {
        if (char === "\\") {
          token += char;
          if (i + 1 < input.length) {
            token += input[i + 1]!;
            i += 2;
            continue;
          }
        }

        if (char === "'") {
          if (input[i + 1] === "'") {
            token += "'";
            i += 2;
            continue;
          }

          inString = false;
          i += 1;
          continue;
        }

        token += char;
        i += 1;
        continue;
      }

      if (char === "'") {
        inString = true;
        quoted = true;
        i += 1;
        continue;
      }

      if (!quoted && token.length === 0 && /\s/.test(char)) {
        i += 1;
        continue;
      }

      if (char === ",") {
        row.push(parseScalar(token, quoted));
        token = "";
        quoted = false;
        i += 1;
        continue;
      }

      if (char === ")") {
        row.push(parseScalar(token, quoted));
        rows.push(row);
        token = "";
        quoted = false;
        i += 1;
        break;
      }

      token += char;
      i += 1;
    }
  }

  return rows;
}

function parseInsertStatement(statement: string) {
  const match = statement.match(/^INSERT INTO `([^`]+)` \(([\s\S]*?)\) VALUES\s*/);
  if (!match) return null;

  const table = match[1]!;
  const columns = match[2]!
    .split(",")
    .map((column) => column.trim().replace(/^`|`$/g, ""));
  const valuesPart = statement.slice(match[0].length).replace(/;\s*$/, "");
  const rows = parseValuesBlock(valuesPart);

  return { table, columns, rows };
}

function rowToObject(columns: string[], row: SqlScalar[]) {
  const obj: Record<string, SqlScalar> = {};
  for (let index = 0; index < columns.length; index += 1) {
    obj[columns[index]!] = row[index] ?? null;
  }
  return obj;
}

function getCategoryCandidates(rawSlug: string) {
  const normalized = slugify(rawSlug);
  if (!normalized) return [];
  return CATEGORY_FALLBACKS[normalized] ?? [normalized];
}

function resolveCategorySlug(rawSlugs: string[], availableCategorySlugs?: Set<string>) {
  for (const rawSlug of rawSlugs) {
    const candidates = getCategoryCandidates(rawSlug);
    if (!availableCategorySlugs || availableCategorySlugs.size === 0) {
      return candidates[0] ?? null;
    }

    const matched = candidates.find((candidate) => availableCategorySlugs.has(candidate));
    if (matched) return matched;
  }

  if (rawSlugs.length === 0) return null;
  return getCategoryCandidates(rawSlugs[0]!)[0] ?? null;
}

function stripHtml(text: string) {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatDateLabel(rawDate: string) {
  if (!rawDate) return null;
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function getPreferredDate(meta: Map<string, string>, rawPost: RawPost, status: "publicado" | "rascunho") {
  if (status !== "publicado") return null;

  const rawDate =
    meta.get("data") ||
    meta.get("data-da-reflexao") ||
    meta.get("data-do-artigo") ||
    rawPost.postDate ||
    null;

  if (!rawDate) return null;

  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildReflectionTitle(meta: Map<string, string>, rawPost: RawPost) {
  const explicitTitle = (rawPost.postTitle || "").trim();
  if (explicitTitle) return explicitTitle;

  const dateLabel =
    formatDateLabel(meta.get("data-da-reflexao") ?? "") ||
    formatDateLabel(rawPost.postDate ?? "");
  if (dateLabel) return `Reflexão do Dia - ${dateLabel}`;

  const reflectionText = (meta.get("texto-da-reflexao") ?? "").trim();
  if (reflectionText) return truncateText(reflectionText, 70);

  return rawPost.id ? `Reflexão do Dia #${rawPost.id}` : "";
}

function buildCommemorativeDateTitle(meta: Map<string, string>, rawPost: RawPost) {
  const explicitTitle = (rawPost.postTitle || "").trim();
  if (explicitTitle) return explicitTitle;

  const metaTitle = (meta.get("nome-da-data") ?? "").trim();
  if (metaTitle) return metaTitle;

  const dateLabel =
    formatDateLabel(meta.get("data") ?? "") ||
    formatDateLabel(rawPost.postDate ?? "");
  if (dateLabel) return `Data Comemorativa - ${dateLabel}`;

  return rawPost.id ? `Data Comemorativa #${rawPost.id}` : "";
}

function writeReport(reportPath: string, payload: unknown) {
  const absolutePath = resolve(process.cwd(), reportPath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`Relatório salvo em: ${absolutePath}`);
}

async function iterateDumpStatements(
  absolutePath: string,
  targetTables: Set<string>,
  onStatement: (
    parsed: { table: string; columns: string[]; rows: SqlScalar[][] }
  ) => Promise<void> | void
) {
  const rl = readline.createInterface({
    input: createReadStream(absolutePath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let currentInsert: string | null = null;
  let currentTargetTable: string | null = null;
  let processedStatements = 0;

  async function flushInsert() {
    if (!currentInsert || !currentTargetTable) return;
    const parsed = parseInsertStatement(currentInsert);
    currentInsert = null;
    currentTargetTable = null;
    if (!parsed) return;
    processedStatements += 1;
    await onStatement(parsed);
  }

  for await (const line of rl) {
    if (currentInsert) {
      currentInsert += `\n${line}`;
      if (line.trimEnd().endsWith(";")) {
        await flushInsert();
      }
      continue;
    }

    if (!line.startsWith("INSERT INTO `wpb5_")) continue;
    const tableMatch = line.match(/^INSERT INTO `([^`]+)`/);
    const table = tableMatch?.[1] ?? null;
    if (!table || !targetTables.has(table)) continue;

    currentInsert = line;
    currentTargetTable = table;
    if (line.trimEnd().endsWith(";")) {
      await flushInsert();
    }
  }

  await flushInsert();
  return processedStatements;
}

function buildPreparedPost(args: {
  rawPost: RawPost;
  postMeta: Map<string, string>;
  attachmentById: Map<string, AttachmentInfo>;
  categorySlugs: string[];
  tagNames: string[];
  availableCategorySlugs?: Set<string>;
  includeDrafts: boolean;
}): PreparedPost | null {
  const { rawPost, postMeta, attachmentById, categorySlugs, tagNames, availableCategorySlugs, includeDrafts } = args;
  if (!SUPPORTED_POST_TYPES.has(rawPost.postType)) return null;

  const shouldImport =
    IMPORTABLE_STATUSES.has(rawPost.postStatus) ||
    (includeDrafts && OPTIONAL_STATUSES.has(rawPost.postStatus));
  if (!shouldImport) return null;

  const reflectionText = (postMeta.get("texto-da-reflexao") ?? "").trim();
  const commemorativeDescription = (postMeta.get("descricao-sobre-a-data") ?? "").trim();
  const title =
    rawPost.postType === "reflexao-do-dia"
      ? buildReflectionTitle(postMeta, rawPost)
      : rawPost.postType === "datas-comemorativas"
        ? buildCommemorativeDateTitle(postMeta, rawPost)
        : (rawPost.postTitle || "").trim();
  if (!title) return null;

  const slug = slugify(rawPost.postName || rawPost.postTitle || title);
  const mappedCategorySlug =
    resolveCategorySlug(categorySlugs, availableCategorySlugs) ??
    (rawPost.postType === "aniversarios"
      ? resolveCategorySlug(["aniversarios"], availableCategorySlugs)
      : rawPost.postType === "reflexao-do-dia"
        ? resolveCategorySlug(["reflexao-do-dia"], availableCategorySlugs)
        : rawPost.postType === "datas-comemorativas"
          ? resolveCategorySlug(["datas-comemorativas"], availableCategorySlugs)
          : null);

  let featuredImageUrl: string | null = null;
  let featuredImageAlt: string | null = null;
  for (const key of THUMB_META_KEYS) {
    const thumbId = postMeta.get(key) ?? "";
    if (!thumbId) continue;
    const attachment = attachmentById.get(thumbId);
    if (!attachment?.url) continue;
    featuredImageUrl = attachment.url;
    featuredImageAlt = attachment.alt || attachment.title || title;
    break;
  }
  if (!featuredImageUrl) {
    featuredImageUrl = postMeta.get("_yoast_wpseo_opengraph-image") || null;
  }

  let content = (rawPost.postContent || "").trim();
  if (!content && reflectionText) {
    content = `<p>${reflectionText}</p>`;
  }
  if (!content && commemorativeDescription) {
    content = `<p>${commemorativeDescription}</p>`;
  }

  let excerpt =
    (rawPost.postExcerpt || "").trim() ||
    EXCERPT_META_KEYS.map((key) => postMeta.get(key) ?? "").find(Boolean) ||
    "";
  if (!excerpt && reflectionText) excerpt = truncateText(reflectionText, 160);
  if (!excerpt && commemorativeDescription) excerpt = truncateText(commemorativeDescription, 160);
  if (!excerpt) excerpt = truncateText(stripHtml(content), 160);
  excerpt = excerpt.trim();

  const status = rawPost.postStatus === "publish" ? "publicado" : "rascunho";
  const canonicalUrl = rawPost.guid && rawPost.guid.startsWith("http") ? rawPost.guid : null;

  return {
    wpPostId: rawPost.id,
    title,
    status,
    wpStatus: rawPost.postStatus,
    postType: rawPost.postType,
    slug,
    link: canonicalUrl,
    excerpt: excerpt || null,
    content,
    featuredImageUrl,
    featuredImageAlt: featuredImageAlt || title,
    categorySlugs,
    mappedCategorySlug,
    tags: tagNames,
    canonicalUrl,
    metaTitle: (postMeta.get("_yoast_wpseo_title") || title || "").slice(0, 70) || null,
    metaDescription: (postMeta.get("_yoast_wpseo_metadesc") || excerpt || "").slice(0, 160) || null,
    focusKeyword: (postMeta.get("_yoast_wpseo_focuskw") || "").slice(0, 100) || null,
    publishedAt: getPreferredDate(postMeta, rawPost, status),
    skipReason: mappedCategorySlug ? null : "sem-categoria-no-dump",
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const absolutePath = resolve(process.cwd(), options.dumpPath);

  console.log("Lendo dump SQL:", absolutePath);
  console.log(
    options.dryRun
      ? "Modo: dry-run (não grava no banco)"
      : "Modo: importação real (grava no banco)"
  );

  const termById = new Map<string, { name: string; slug: string }>();
  const taxonomyById = new Map<string, { termId: string; taxonomy: string }>();
  const relationshipByObjectId = new Map<string, string[]>();
  const postMetaByPostId = new Map<string, Map<string, string>>();
  const attachmentById = new Map<string, AttachmentInfo>();

  const passOneStatements = await iterateDumpStatements(
    absolutePath,
    new Set([
      "wpb5_terms",
      "wpb5_term_taxonomy",
      "wpb5_term_relationships",
      "wpb5_postmeta",
      "wpb5_posts",
    ]),
    (parsed) => {
      const { table, columns, rows } = parsed;

      if (table === "wpb5_terms") {
        for (const row of rows) {
          const obj = rowToObject(columns, row);
          const termId = obj.term_id;
          const slug = obj.slug;
          if (!termId || !slug) continue;
          termById.set(termId, {
            name: obj.name ?? slug,
            slug: slugify(slug),
          });
        }
        return;
      }

      if (table === "wpb5_term_taxonomy") {
        for (const row of rows) {
          const obj = rowToObject(columns, row);
          if (!obj.term_taxonomy_id || !obj.term_id || !obj.taxonomy) continue;
          taxonomyById.set(obj.term_taxonomy_id, {
            termId: obj.term_id,
            taxonomy: obj.taxonomy,
          });
        }
        return;
      }

      if (table === "wpb5_term_relationships") {
        for (const row of rows) {
          const obj = rowToObject(columns, row);
          if (!obj.object_id || !obj.term_taxonomy_id) continue;
          const entries = relationshipByObjectId.get(obj.object_id) ?? [];
          entries.push(obj.term_taxonomy_id);
          relationshipByObjectId.set(obj.object_id, entries);
        }
        return;
      }

      if (table === "wpb5_postmeta") {
        for (const row of rows) {
          const obj = rowToObject(columns, row);
          if (!obj.post_id || !obj.meta_key || !RELEVANT_POST_META_KEYS.has(obj.meta_key)) continue;
          const meta = postMetaByPostId.get(obj.post_id) ?? new Map<string, string>();
          meta.set(obj.meta_key, obj.meta_value ?? "");
          postMetaByPostId.set(obj.post_id, meta);
        }
        return;
      }

      if (table === "wpb5_posts") {
        for (const row of rows) {
          const obj = rowToObject(columns, row);
          if (!obj.ID || obj.post_type !== "attachment") continue;
          const attachmentMeta = postMetaByPostId.get(obj.ID) ?? new Map<string, string>();
          attachmentById.set(obj.ID, {
            id: obj.ID,
            url: obj.guid && obj.guid.startsWith("http") ? obj.guid : null,
            title: obj.post_title || null,
            alt: attachmentMeta.get("_wp_attachment_image_alt") || null,
          });
        }
      }
    }
  );

  console.log(`Statements processados na 1a passada: ${passOneStatements}`);
  console.log(`Attachments encontrados: ${attachmentById.size}`);

  let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
  let sql: ReturnType<typeof postgres> | null = null;
  let authorId: string | null = null;
  const categoryMap = new Map<string, string>();
  const existingCategorySlugs = new Set<string>();
  const existingPostsBySlug = new Map<string, { id: string; canonicalUrl: string | null }>();

  if (DATABASE_URL) {
    sql = postgres(normalizeDatabaseUrl(DATABASE_URL), {
      prepare: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
    });
    db = drizzle(sql, { schema });

    const [admin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.role, "administrador"))
      .limit(1);
    authorId = admin?.id ?? null;

    const existingCategories = await db.select().from(schema.categories);
    for (const category of existingCategories) {
      categoryMap.set(category.slug, category.id);
      existingCategorySlugs.add(category.slug);
    }

    const existingPosts = await db
      .select({
        id: schema.posts.id,
        slug: schema.posts.slug,
        canonicalUrl: schema.posts.canonicalUrl,
      })
      .from(schema.posts);

    for (const post of existingPosts) {
      existingPostsBySlug.set(post.slug, {
        id: post.id,
        canonicalUrl: post.canonicalUrl,
      });
    }
  } else if (!options.dryRun) {
    throw new Error("DATABASE_URL não definida no .env.local");
  }

  const reportSkipped: ReportItem[] = [];
  const reportReady: ReportItem[] = [];
  const countByCategory = new Map<string, number>();

  let imported = 0;
  let updated = 0;
  let skipped = 0;
  let processed = 0;
  let postsSeen = 0;

  const passTwoStatements = await iterateDumpStatements(
    absolutePath,
    new Set(["wpb5_posts"]),
    async (parsed) => {
      const { columns, rows } = parsed;

      for (const row of rows) {
        const obj = rowToObject(columns, row);
        if (!obj.ID || !obj.post_type || obj.post_type === "attachment") continue;

        const rawPost: RawPost = {
          id: obj.ID,
          authorId: obj.post_author,
          postDate: obj.post_date,
          postContent: obj.post_content ?? "",
          postTitle: obj.post_title ?? "",
          postExcerpt: obj.post_excerpt ?? "",
          postStatus: obj.post_status ?? "",
          postName: obj.post_name ?? "",
          postType: obj.post_type,
          guid: obj.guid,
        };

        if (!SUPPORTED_POST_TYPES.has(rawPost.postType)) continue;
        postsSeen += 1;

        if (options.limit != null && processed >= options.limit) {
          continue;
        }
        processed += 1;

        const taxonomyIds = relationshipByObjectId.get(rawPost.id) ?? [];
        const categorySlugs = new Set<string>();
        const tagNames = new Set<string>();

        for (const taxonomyId of taxonomyIds) {
          const taxonomy = taxonomyById.get(taxonomyId);
          if (!taxonomy) continue;
          const term = termById.get(taxonomy.termId);
          if (!term) continue;

          if (taxonomy.taxonomy === "category" || taxonomy.taxonomy === "categorias-artigos") {
            if (term.slug) categorySlugs.add(term.slug);
          } else if (taxonomy.taxonomy === "post_tag" || taxonomy.taxonomy === "tags-artigos") {
            if (term.name) tagNames.add(term.name);
          }
        }

        const prepared = buildPreparedPost({
          rawPost,
          postMeta: postMetaByPostId.get(rawPost.id) ?? new Map<string, string>(),
          attachmentById,
          categorySlugs: [...categorySlugs],
          tagNames: [...tagNames],
          availableCategorySlugs: existingCategorySlugs,
          includeDrafts: options.includeDrafts,
        });

        if (!prepared) continue;

        if (prepared.skipReason) {
          skipped += 1;
          reportSkipped.push({
            wpPostId: prepared.wpPostId,
            title: prepared.title,
            slug: prepared.slug,
            postType: prepared.postType,
            wpStatus: prepared.wpStatus,
            xmlCategories: prepared.categorySlugs,
            mappedCategorySlug: prepared.mappedCategorySlug,
            reason: prepared.skipReason,
          });
          continue;
        }

        reportReady.push({
          wpPostId: prepared.wpPostId,
          title: prepared.title,
          slug: prepared.slug,
          postType: prepared.postType,
          wpStatus: prepared.wpStatus,
          xmlCategories: prepared.categorySlugs,
          mappedCategorySlug: prepared.mappedCategorySlug,
          reason: "ok",
        });

        const mappedCategoryIds = Array.from(
          new Set(
            prepared.categorySlugs
              .map((rawSlug) => resolveCategorySlug([rawSlug], existingCategorySlugs))
              .filter(Boolean)
              .map((slug) => categoryMap.get(slug as string))
              .filter((value): value is string => Boolean(value))
          )
        );

        let categoryId: string | null = null;
        if (prepared.mappedCategorySlug) {
          categoryId = categoryMap.get(prepared.mappedCategorySlug) ?? null;
          if (categoryId && !mappedCategoryIds.includes(categoryId)) {
            mappedCategoryIds.unshift(categoryId);
          }
          countByCategory.set(
            prepared.mappedCategorySlug,
            (countByCategory.get(prepared.mappedCategorySlug) ?? 0) + 1
          );
        }

        const categoryState = coercePostCategoryState({
          categoryId,
          categoryIds: mappedCategoryIds,
        });

        if (options.dryRun || !db) {
          imported += 1;
          continue;
        }

        const existing = existingPostsBySlug.get(prepared.slug);
        const values = {
          title: prepared.title,
          slug: prepared.slug,
          excerpt: prepared.excerpt,
          content: prepared.content,
          featuredImage: prepared.featuredImageUrl,
          featuredImageAlt: prepared.featuredImageAlt,
          featuredImageTitle: prepared.title,
          categoryId: categoryState.categoryId,
          categoryIds: categoryState.categoryIdsJson,
          tags: prepared.tags.length > 0 ? JSON.stringify(prepared.tags) : null,
          canonicalUrl: prepared.canonicalUrl,
          authorId,
          status: prepared.status,
          featured: false,
          metaTitle: prepared.metaTitle,
          metaDescription: prepared.metaDescription,
          focusKeyword: prepared.focusKeyword,
          publishedAt: prepared.publishedAt,
          updatedAt: new Date(),
        };

        if (existing) {
          await db.update(schema.posts).set(values).where(eq(schema.posts.id, existing.id));
          updated += 1;
        } else {
          const id = generateId();
          await db.insert(schema.posts).values({
            id,
            ...values,
            createdAt: prepared.publishedAt ?? new Date(),
          });
          existingPostsBySlug.set(prepared.slug, {
            id,
            canonicalUrl: prepared.canonicalUrl,
          });
          imported += 1;
        }
      }
    }
  );

  console.log("Resumo:");
  console.log(`- statements 1a passada: ${passOneStatements}`);
  console.log(`- statements 2a passada: ${passTwoStatements}`);
  console.log(`- posts vistos no dump: ${postsSeen}`);
  console.log(`- processados: ${processed}`);
  console.log(`- prontos para importar: ${reportReady.length}`);
  console.log(`- importados novos: ${imported}`);
  console.log(`- atualizados: ${updated}`);
  console.log(`- ignorados: ${skipped}`);

  const orderedCounts = [...countByCategory.entries()].sort((a, b) => b[1] - a[1]);
  for (const [slug, count] of orderedCounts) {
    console.log(`  - ${slug}: ${count}`);
  }

  if (options.reportPath) {
    writeReport(options.reportPath, {
      source: absolutePath,
      passOneStatements,
      passTwoStatements,
      postsSeen,
      attachmentsSeen: attachmentById.size,
      processed,
      ready: reportReady.length,
      imported,
      updated,
      skipped,
      countByCategory: Object.fromEntries(orderedCounts),
      skippedItems: reportSkipped,
      readyItems: reportReady.slice(0, 2000),
    });
  }

  if (sql) {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Erro ao importar dump MySQL do WordPress:", error);
  process.exit(1);
});
