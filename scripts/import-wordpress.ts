/**
 * Importa posts do WordPress direto no banco (sem API, sem Vercel).
 * Execute: npx tsx scripts/import-wordpress.ts caminho/para/export.xml
 *
 * Requer DATABASE_URL no .env.local
 * Imagens mantêm as URLs originais (não faz upload para Blob)
 *
 * Regras:
 * - Importa apenas "post" e "aniversarios" (não importa páginas)
 * - Importa apenas itens cuja categoria existe no site ( slugs devem bater )
 * - Cadastre no admin categorias com os mesmos slugs do WordPress antes de importar
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { generateId, slugify } from "../src/lib/utils";
import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "fs";
import { resolve } from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida no .env.local");
  process.exit(1);
}

function normalizeItem(item: unknown): unknown[] {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function getText(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object" && "#text" in (val as object))
    return String((val as { "#text": string })["#text"] || "").trim();
  return String(val).trim();
}

async function main() {
  const xmlPath = process.argv[2];
  if (!xmlPath) {
    console.error("Uso: npx tsx scripts/import-wordpress.ts caminho/para/export.xml");
    process.exit(1);
  }

  const absolutePath = resolve(process.cwd(), xmlPath);
  console.log("Lendo XML:", absolutePath);

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

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const [admin] = await db.select().from(schema.users).where(eq(schema.users.role, "administrador")).limit(1);
  const authorId = admin?.id ?? null;

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

  const existingCats = await db.select().from(schema.categories);
  const existingSlugs = new Set(existingCats.map((c) => c.slug));
  const categoryMap = new Map<string, string>(existingCats.map((c) => [c.slug, c.id]));

  if (existingSlugs.size === 0) {
    console.error("Nenhuma categoria cadastrada no site. Cadastre categorias no admin antes de importar.");
    process.exit(1);
  }
  console.log(`Categorias do site que serão usadas: ${[...existingSlugs].join(", ")}`);

  const allowedTypes = ["post", "aniversarios"];
  const postItems = items.filter((it) => {
    const type = getText((it as Record<string, unknown>)["wp:post_type"] ?? (it as Record<string, unknown>).post_type);
    return allowedTypes.includes(type);
  });

  let imported = 0;
  let skipped = 0;

  for (const it of postItems) {
    const obj = it as Record<string, unknown>;
    const title = getText(obj.title);
    if (!title) {
      skipped++;
      continue;
    }

    const wpStatus = getText(obj["wp:status"] ?? obj.status);
    const status = wpStatus === "publish" ? "publicado" : "rascunho";
    const content = getText(obj["content:encoded"] ?? obj["content:encoded"] ?? obj.content ?? "");
    const excerpt = getText(obj["excerpt:encoded"] ?? obj["excerpt:encoded"] ?? obj.excerpt ?? "");
    const wpSlug = getText(obj["wp:post_name"] ?? obj.post_name);
    const slug = wpSlug ? slugify(wpSlug) : slugify(title);

    const postType = getText(obj["wp:post_type"] ?? obj.post_type);
    const catRef = normalizeItem(obj.category ?? []);
    let categoryId: string | null = null;
    for (const cr of catRef) {
      const c = cr as Record<string, unknown>;
      const domain = getText(c["@_domain"] ?? c.domain);
      if (domain !== "category" && domain !== "categorias-artigos") continue;
      const catSlug = slugify(getText(c["@_nicename"] ?? c["#text"] ?? c) || "");
      if (!existingSlugs.has(catSlug)) continue;
      categoryId = categoryMap.get(catSlug) ?? null;
      if (categoryId) break;
    }
    if (!categoryId && postType === "aniversarios") {
      categoryId = categoryMap.get("aniversariantes") ?? null;
    }
    if (!categoryId) {
      skipped++;
      continue;
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

    let finalSlug = slug;
    let suffix = 1;
    while (true) {
      const [existing] = await db.select().from(schema.posts).where(eq(schema.posts.slug, finalSlug)).limit(1);
      if (!existing) break;
      finalSlug = `${slug}-${suffix}`;
      suffix++;
    }

    const postId = generateId();
    const pubDate = getText(obj["wp:post_date"] ?? obj.post_date);
    const publishedAt = status === "publicado" && pubDate ? new Date(pubDate) : null;

    await db.insert(schema.posts).values({
      id: postId,
      title,
      slug: finalSlug,
      excerpt: excerpt || null,
      content,
      featuredImage: featuredImageUrl,
      featuredImageAlt: null,
      categoryId: categoryId ?? null,
      status,
      featured: false,
      authorId,
      publishedAt,
    });
    imported++;
    if (imported % 10 === 0) console.log(`  ${imported} posts importados...`);
  }

  console.log(`\nConcluído! ${imported} posts importados, ${skipped} ignorados (sem categoria correspondente ou sem título).`);
  console.log("Importados apenas posts/aniversários com categorias existentes no site. Páginas não são importadas.");
  console.log("\nImagens mantêm URLs originais. Edite os posts no admin para trocar por imagens locais se necessário.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
