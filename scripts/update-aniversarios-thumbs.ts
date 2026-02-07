/**
 * Atualiza featuredImage dos posts aniversariantes já importados.
 * Usa thumb-do-aniversariante do XML para preencher as thumbs.
 * Execute: npx tsx scripts/update-aniversarios-thumbs.ts fozemdestaque.WordPress.2026-02-06.xml
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import { slugify } from "../src/lib/utils";
import { XMLParser } from "fast-xml-parser";
import { readFileSync } from "fs";
import { resolve } from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
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
  const xmlPath = process.argv[2] || "fozemdestaque.WordPress.2026-02-06.xml";
  const absolutePath = resolve(process.cwd(), xmlPath);
  console.log("Lendo XML:", absolutePath);

  const xmlText = readFileSync(absolutePath, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseTagValue: true, trimValues: true });
  const parsed = parser.parse(xmlText);
  const channel = parsed?.rss?.channel ?? parsed?.channel;
  if (!channel) {
    console.error("XML inválido.");
    process.exit(1);
  }

  const rawItems = channel.item ?? [];
  const items = normalizeItem(rawItems);

  const attachmentMap = new Map<string, string>();
  for (const it of items) {
    const obj = it as Record<string, unknown>;
    if (getText(obj["wp:post_type"]) !== "attachment") continue;
    const postId = getText(obj["wp:post_id"]);
    const guid = getText(obj.guid);
    const attUrl = getText(obj["wp:attachment_url"]) || guid;
    if (postId && attUrl?.startsWith("http")) attachmentMap.set(postId, attUrl);
  }

  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const aniversarios = items.filter((it) => getText((it as Record<string, unknown>)["wp:post_type"]) === "aniversarios");
  let updated = 0;
  for (const it of aniversarios) {
    const obj = it as Record<string, unknown>;
    const wpSlug = getText(obj["wp:post_name"]);
    const slug = wpSlug ? slugify(wpSlug) : null;
    if (!slug) continue;

    let thumbUrl: string | null = null;
    const postmeta = normalizeItem(obj["wp:postmeta"] ?? []);
    for (const pm of postmeta) {
      const p = pm as Record<string, unknown>;
      if (getText(p["wp:meta_key"]) === "thumb-do-aniversariante") {
        const thumbId = getText(p["wp:meta_value"]);
        thumbUrl = attachmentMap.get(thumbId) ?? null;
        break;
      }
    }
    if (!thumbUrl) continue;

    const [post] = await db.select().from(schema.posts).where(eq(schema.posts.slug, slug)).limit(1);
    if (!post || post.featuredImage === thumbUrl) continue;

    await db.update(schema.posts).set({ featuredImage: thumbUrl }).where(eq(schema.posts.id, post.id));
    updated++;
    if (updated % 50 === 0) console.log(`  ${updated} thumbs atualizadas...`);
  }

  console.log(`\nConcluído! ${updated} thumbs atualizadas.`);
}

main().catch(console.error);
