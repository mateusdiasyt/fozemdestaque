/**
 * Migra o acervo legado do WordPress (/wp-content/uploads) para a Vercel Blob
 * e regrava featured_image/content dos posts que ainda apontam para as URLs antigas.
 *
 * Exemplos:
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\backup\wp-content\uploads"
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\backup\wp-content\uploads" --dry-run
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\backup\wp-content\uploads" --report tmp\wp-media-report.json
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\backup\wp-content\uploads" --limit 100
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { put } from "@vercel/blob";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";

type CliOptions = {
  uploadsRoot: string;
  dryRun: boolean;
  limit: number | null;
  reportPath: string | null;
};

type PostRow = {
  id: string;
  slug: string;
  title: string;
  content: string;
  featuredImage: string | null;
};

type UrlMigration = {
  originalUrl: string;
  relativePath: string | null;
  localPath: string | null;
  existsLocally: boolean;
  blobUrl: string | null;
  error: string | null;
};

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const UPLOADS_MARKER = "/wp-content/uploads/";

function parseArgs(argv: string[]): CliOptions {
  const args = [...argv];
  let uploadsRoot = "";
  let dryRun = false;
  let limit: number | null = null;
  let reportPath: string | null = null;

  while (args.length > 0) {
    const arg = args.shift();
    if (!arg) continue;

    if (!arg.startsWith("--") && !uploadsRoot) {
      uploadsRoot = arg;
      continue;
    }

    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--limit") {
      const raw = args.shift() ?? "";
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Valor inválido para --limit: ${raw}`);
      }
      limit = parsed;
      continue;
    }

    if (arg === "--report") {
      reportPath = args.shift() ?? null;
      continue;
    }

    throw new Error(`Argumento não reconhecido: ${arg}`);
  }

  if (!uploadsRoot) {
    throw new Error(
      'Uso: npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\\caminho\\wp-content\\uploads" [--dry-run] [--limit N] [--report caminho.json]'
    );
  }

  return { uploadsRoot, dryRun, limit, reportPath };
}

function extractWpContentUrls(input: string): string[] {
  if (!input) return [];
  const matches = input.match(/https?:\/\/(?:www\.)?fozemdestaque\.com\/wp-content\/uploads\/[^"'()\s<>\]]+/gi) ?? [];
  return [...new Set(matches.map((match) => match.replace(/&amp;/gi, "&")))];
}

function getUploadsRelativePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const markerIndex = parsed.pathname.indexOf(UPLOADS_MARKER);
    if (markerIndex === -1) return null;
    const relative = decodeURIComponent(parsed.pathname.slice(markerIndex + UPLOADS_MARKER.length));
    return relative.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

function inferContentType(filePath: string): string {
  const lowered = filePath.toLowerCase();
  if (lowered.endsWith(".jpg") || lowered.endsWith(".jpeg")) return "image/jpeg";
  if (lowered.endsWith(".png")) return "image/png";
  if (lowered.endsWith(".gif")) return "image/gif";
  if (lowered.endsWith(".webp")) return "image/webp";
  if (lowered.endsWith(".svg")) return "image/svg+xml";
  if (lowered.endsWith(".avif")) return "image/avif";
  return "application/octet-stream";
}

function replaceUrlVariants(content: string, originalUrl: string, nextUrl: string): string {
  let output = content;
  output = output.split(originalUrl).join(nextUrl);
  output = output.split(originalUrl.replace(/&/g, "&amp;")).join(nextUrl);

  try {
    const parsed = new URL(originalUrl);
    const variants = new Set<string>([
      originalUrl,
      originalUrl.replace("https://www.fozemdestaque.com", "https://fozemdestaque.com"),
      originalUrl.replace("https://fozemdestaque.com", "https://www.fozemdestaque.com"),
    ]);

    if (parsed.protocol === "https:") {
      variants.add(originalUrl.replace("https://", "http://"));
    }

    for (const variant of variants) {
      output = output.split(variant).join(nextUrl);
      output = output.split(variant.replace(/&/g, "&amp;")).join(nextUrl);
    }
  } catch {
    return output;
  }

  return output;
}

async function main() {
  const { uploadsRoot, dryRun, limit, reportPath } = parseArgs(process.argv.slice(2));

  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL não definida.");
  }

  if (!dryRun && !BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN não definido.");
  }

  const absoluteUploadsRoot = resolve(process.cwd(), uploadsRoot);
  if (!existsSync(absoluteUploadsRoot) || !statSync(absoluteUploadsRoot).isDirectory()) {
    throw new Error(`Pasta de uploads não encontrada: ${absoluteUploadsRoot}`);
  }

  const sql = neon(DATABASE_URL);
  const rows = (await sql`
    select
      id,
      slug,
      title,
      content,
      featured_image as "featuredImage"
    from posts
    where
      featured_image like '%wp-content/uploads/%'
      or content like '%wp-content/uploads/%'
    order by created_at desc
  `) as PostRow[];

  const targetPosts = limit ? rows.slice(0, limit) : rows;
  console.log(`Posts com mídia legada encontrados: ${rows.length}`);
  console.log(`Posts considerados nesta execução: ${targetPosts.length}`);

  const uniqueUrls = new Set<string>();
  for (const post of targetPosts) {
    for (const url of extractWpContentUrls(post.featuredImage ?? "")) uniqueUrls.add(url);
    for (const url of extractWpContentUrls(post.content ?? "")) uniqueUrls.add(url);
  }

  console.log(`URLs únicas de mídia a processar: ${uniqueUrls.size}`);

  const migrationMap = new Map<string, UrlMigration>();
  let uploadedCount = 0;
  let missingCount = 0;

  for (const url of uniqueUrls) {
    const relativePath = getUploadsRelativePath(url);
    const localPath = relativePath ? resolve(absoluteUploadsRoot, ...relativePath.split("/")) : null;
    const existsLocally = !!localPath && existsSync(localPath);

    const migration: UrlMigration = {
      originalUrl: url,
      relativePath,
      localPath,
      existsLocally,
      blobUrl: null,
      error: null,
    };

    if (!relativePath || !localPath) {
      migration.error = "URL sem caminho relativo válido em /wp-content/uploads.";
      migrationMap.set(url, migration);
      continue;
    }

    if (!existsLocally) {
      migration.error = "Arquivo não encontrado na pasta local de uploads.";
      missingCount++;
      migrationMap.set(url, migration);
      continue;
    }

    if (!dryRun) {
      try {
        const buffer = readFileSync(localPath);
        const blob = await put(`legacy/${relativePath.replace(/\\/g, "/")}`, buffer, {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: inferContentType(localPath),
          token: BLOB_READ_WRITE_TOKEN,
        });
        migration.blobUrl = blob.url;
        uploadedCount++;
      } catch (error) {
        migration.error = error instanceof Error ? error.message : "Falha ao enviar para Blob.";
      }
    }

    migrationMap.set(url, migration);
  }

  let updatedPosts = 0;
  const missingUrls: UrlMigration[] = [];
  const failedUploads: UrlMigration[] = [];

  for (const post of targetPosts) {
    let nextFeaturedImage = post.featuredImage;
    let nextContent = post.content;
    let touched = false;

    const urlsInPost = new Set<string>([
      ...extractWpContentUrls(post.featuredImage ?? ""),
      ...extractWpContentUrls(post.content ?? ""),
    ]);

    for (const url of urlsInPost) {
      const migration = migrationMap.get(url);
      if (!migration) continue;

      if (!migration.existsLocally) {
        missingUrls.push(migration);
        continue;
      }

      if (migration.error && !migration.blobUrl) {
        failedUploads.push(migration);
        continue;
      }

      const replacement = migration.blobUrl;
      if (!replacement) continue;

      if (nextFeaturedImage && nextFeaturedImage.includes(url)) {
        nextFeaturedImage = replaceUrlVariants(nextFeaturedImage, url, replacement);
        touched = true;
      }

      if (nextContent.includes(url)) {
        nextContent = replaceUrlVariants(nextContent, url, replacement);
        touched = true;
      }
    }

    if (!touched) continue;

    if (!dryRun) {
      await sql`
        update posts
        set
          featured_image = ${nextFeaturedImage},
          content = ${nextContent},
          updated_at = now()
        where id = ${post.id}
      `;
    }

    updatedPosts++;
  }

  const report = {
    uploadsRoot: absoluteUploadsRoot,
    dryRun,
    totalPostsWithLegacyMedia: rows.length,
    processedPosts: targetPosts.length,
    uniqueUrls: uniqueUrls.size,
    uploadedCount,
    updatedPosts,
    missingFiles: [...new Map(missingUrls.map((item) => [item.originalUrl, item])).values()],
    failedUploads: [...new Map(failedUploads.map((item) => [item.originalUrl, item])).values()],
  };

  if (reportPath) {
    const absoluteReportPath = resolve(process.cwd(), reportPath);
    mkdirSync(dirname(absoluteReportPath), { recursive: true });
    writeFileSync(absoluteReportPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`Relatório salvo em: ${absoluteReportPath}`);
  }

  console.log("\nResumo:");
  console.log(`- Posts com mídia legada: ${rows.length}`);
  console.log(`- Posts processados: ${targetPosts.length}`);
  console.log(`- URLs únicas: ${uniqueUrls.size}`);
  console.log(`- Arquivos enviados para Blob: ${dryRun ? 0 : uploadedCount}`);
  console.log(`- Posts atualizados: ${dryRun ? 0 : updatedPosts}`);
  console.log(`- Arquivos locais ausentes: ${report.missingFiles.length}`);
  console.log(`- Uploads com falha: ${report.failedUploads.length}`);

  if (dryRun) {
    console.log("\nDry-run concluído. Nenhuma alteração foi gravada.");
  }
}

main().catch((error) => {
  console.error("\nFalha na migração do acervo legado:");
  console.error(error);
  process.exit(1);
});
