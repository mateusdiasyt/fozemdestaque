/**
 * Migrates legacy WordPress media from /wp-content/uploads into Vercel Blob
 * and rewrites featured_image/content in posts that still point to old URLs.
 *
 * Supported sources:
 * - extracted uploads directory
 * - .zip archive that contains an uploads/ root
 *
 * Examples:
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\\backup\\wp-content\\uploads"
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\\backup\\wp-content\\uploads" --dry-run
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\\Users\\PC 01\\Downloads\\zi9zN43P" --dry-run
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\\Users\\PC 01\\Downloads\\zi9zN43P" --report tmp\\wp-media-report.json
 * - npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\\Users\\PC 01\\Downloads\\zi9zN43P" --limit 100
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { execFileSync } from "child_process";
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

type CountRow = {
  count: number;
};

type UrlMigration = {
  originalUrl: string;
  relativePath: string | null;
  sourcePath: string | null;
  localPath: string | null;
  existsLocally: boolean;
  blobUrl: string | null;
  error: string | null;
};

type UploadsSource =
  | {
      kind: "directory";
      rootPath: string;
    }
  | {
      kind: "zip";
      archivePath: string;
      entries: Set<string>;
    };

type SourceLocation = {
  sourcePath: string | null;
  localPath: string | null;
  existsLocally: boolean;
  archiveEntry: string | null;
};

const DATABASE_URL = process.env.DATABASE_URL;
const BLOB_READ_WRITE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const UPLOADS_MARKER = "/wp-content/uploads/";
const TAR_MAX_BUFFER = 1024 * 1024 * 256;
const POSTS_BATCH_SIZE = 100;

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
        throw new Error(`Invalid value for --limit: ${raw}`);
      }
      limit = parsed;
      continue;
    }

    if (arg === "--report") {
      reportPath = args.shift() ?? null;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!uploadsRoot) {
    throw new Error(
      'Usage: npx tsx scripts/migrate-wp-uploads-to-blob.ts "C:\\path\\wp-content\\uploads-or-zip" [--dry-run] [--limit N] [--report path.json]'
    );
  }

  return { uploadsRoot, dryRun, limit, reportPath };
}

function normalizeArchiveEntryPath(value: string) {
  return value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");
}

function extractWpContentUrls(input: string): string[] {
  if (!input) return [];
  const matches =
    input.match(/https?:\/\/(?:www\.)?fozemdestaque\.com\/wp-content\/uploads\/[^"'()\s<>\]]+/gi) ??
    [];
  return [...new Set(matches.map((match) => match.replace(/&amp;/gi, "&")))];
}

function getUploadsRelativePath(url: string): string | null {
  try {
    const parsed = new URL(url);
    const markerIndex = parsed.pathname.indexOf(UPLOADS_MARKER);
    if (markerIndex === -1) return null;
    const relative = decodeURIComponent(
      parsed.pathname.slice(markerIndex + UPLOADS_MARKER.length)
    );
    return normalizeArchiveEntryPath(relative);
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
  if (lowered.endsWith(".mp4")) return "video/mp4";
  if (lowered.endsWith(".mov")) return "video/quicktime";
  if (lowered.endsWith(".webm")) return "video/webm";
  return "application/octet-stream";
}

function buildZipEntries(archivePath: string) {
  let listOutput = "";

  try {
    listOutput = execFileSync("tar", ["-tf", archivePath], {
      encoding: "utf8",
      maxBuffer: TAR_MAX_BUFFER,
    });
  } catch (error) {
    const stdout =
      error && typeof error === "object" && "stdout" in error
        ? String((error as { stdout?: string | Buffer }).stdout ?? "")
        : "";

    if (!stdout.trim()) {
      throw error;
    }

    listOutput = stdout;
  }

  return new Set(
    listOutput
      .split(/\r?\n/g)
      .map((entry) => normalizeArchiveEntryPath(entry.trim()))
      .filter(Boolean)
  );
}

function execTarBuffer(args: string[]) {
  try {
    return execFileSync("tar", args, {
      encoding: "buffer",
      maxBuffer: TAR_MAX_BUFFER,
    });
  } catch (error) {
    const stdout =
      error && typeof error === "object" && "stdout" in error
        ? Buffer.from((error as { stdout?: string | Buffer }).stdout ?? "")
        : Buffer.alloc(0);

    if (stdout.length === 0) {
      throw error;
    }

    return stdout;
  }
}

function createUploadsSource(sourcePath: string): UploadsSource {
  const stats = statSync(sourcePath);

  if (stats.isDirectory()) {
    return {
      kind: "directory",
      rootPath: sourcePath,
    };
  }

  if (stats.isFile()) {
    return {
      kind: "zip",
      archivePath: sourcePath,
      entries: buildZipEntries(sourcePath),
    };
  }

  throw new Error(`Unsupported uploads source: ${sourcePath}`);
}

function resolveSourceLocation(source: UploadsSource, relativePath: string): SourceLocation {
  const normalizedRelativePath = normalizeArchiveEntryPath(relativePath);

  if (source.kind === "directory") {
    const localPath = resolve(source.rootPath, ...normalizedRelativePath.split("/"));
    return {
      sourcePath: localPath,
      localPath,
      existsLocally: existsSync(localPath),
      archiveEntry: null,
    };
  }

  const candidates = [
    normalizeArchiveEntryPath(`uploads/${normalizedRelativePath}`),
    normalizedRelativePath,
  ];
  const archiveEntry = candidates.find((candidate) => source.entries.has(candidate)) ?? null;

  return {
    sourcePath: archiveEntry ? `${source.archivePath}::${archiveEntry}` : null,
    localPath: null,
    existsLocally: Boolean(archiveEntry),
    archiveEntry,
  };
}

function readSourceFile(source: UploadsSource, relativePath: string, archiveEntry: string | null) {
  if (source.kind === "directory") {
    const localPath = resolve(source.rootPath, ...normalizeArchiveEntryPath(relativePath).split("/"));
    return readFileSync(localPath);
  }

  if (!archiveEntry) {
    throw new Error("Archive entry not informed for ZIP source.");
  }

  return execTarBuffer(["-xOf", source.archivePath, archiveEntry]);
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
    throw new Error("DATABASE_URL is not defined.");
  }

  if (!dryRun && !BLOB_READ_WRITE_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not defined.");
  }

  const absoluteUploadsRoot = resolve(process.cwd(), uploadsRoot);
  if (!existsSync(absoluteUploadsRoot)) {
    throw new Error(`Uploads source not found: ${absoluteUploadsRoot}`);
  }

  const uploadsSource = createUploadsSource(absoluteUploadsRoot);

  const sql = neon(DATABASE_URL);
  const countRows = (await sql`
    select count(*)::int as count
    from posts
    where
      featured_image like '%wp-content/uploads/%'
      or content like '%wp-content/uploads/%'
  `) as CountRow[];
  const totalLegacyPosts = Number(countRows[0]?.count ?? 0);
  const targetLimit = limit ?? totalLegacyPosts;
  const targetPosts: PostRow[] = [];

  let offset = 0;
  while (targetPosts.length < targetLimit) {
    const remaining = targetLimit - targetPosts.length;
    const batchSize = Math.min(POSTS_BATCH_SIZE, remaining);
    const batch = (await sql`
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
      limit ${batchSize}
      offset ${offset}
    `) as PostRow[];

    if (batch.length === 0) {
      break;
    }

    targetPosts.push(...batch);
    offset += batch.length;
    console.log(
      `Loaded legacy posts batch: ${targetPosts.length}/${Math.min(targetLimit, totalLegacyPosts)}`
    );
  }

  console.log(`Posts with legacy media found: ${totalLegacyPosts}`);
  console.log(`Posts considered in this run: ${targetPosts.length}`);
  console.log(
    `Uploads source: ${uploadsSource.kind === "zip" ? "ZIP archive" : "directory"} -> ${absoluteUploadsRoot}`
  );

  const uniqueUrls = new Set<string>();
  for (const post of targetPosts) {
    for (const url of extractWpContentUrls(post.featuredImage ?? "")) uniqueUrls.add(url);
    for (const url of extractWpContentUrls(post.content ?? "")) uniqueUrls.add(url);
  }

  console.log(`Unique media URLs to process: ${uniqueUrls.size}`);

  const migrationMap = new Map<string, UrlMigration>();
  let uploadedCount = 0;
  let missingCount = 0;

  for (const url of uniqueUrls) {
    const relativePath = getUploadsRelativePath(url);
    const sourceLocation = relativePath
      ? resolveSourceLocation(uploadsSource, relativePath)
      : {
          sourcePath: null,
          localPath: null,
          existsLocally: false,
          archiveEntry: null,
        };

    const migration: UrlMigration = {
      originalUrl: url,
      relativePath,
      sourcePath: sourceLocation.sourcePath,
      localPath: sourceLocation.localPath,
      existsLocally: sourceLocation.existsLocally,
      blobUrl: null,
      error: null,
    };

    if (!relativePath) {
      migration.error = "URL without a valid relative path inside /wp-content/uploads.";
      migrationMap.set(url, migration);
      continue;
    }

    if (!sourceLocation.existsLocally) {
      migration.error =
        uploadsSource.kind === "zip"
          ? "File not found inside the uploads ZIP."
          : "File not found in the local uploads directory.";
      missingCount++;
      migrationMap.set(url, migration);
      continue;
    }

    if (!dryRun) {
      try {
        const buffer = readSourceFile(
          uploadsSource,
          relativePath,
          sourceLocation.archiveEntry
        );
        const blob = await put(`legacy/${relativePath.replace(/\\/g, "/")}`, buffer, {
          access: "public",
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: inferContentType(relativePath),
          token: BLOB_READ_WRITE_TOKEN,
        });
        migration.blobUrl = blob.url;
        uploadedCount++;
      } catch (error) {
        migration.error =
          error instanceof Error ? error.message : "Failed to upload file to Blob.";
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
    sourceKind: uploadsSource.kind,
    dryRun,
    totalPostsWithLegacyMedia: totalLegacyPosts,
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
    console.log(`Report saved to: ${absoluteReportPath}`);
  }

  console.log("\nSummary:");
  console.log(`- Legacy posts: ${totalLegacyPosts}`);
  console.log(`- Processed posts: ${targetPosts.length}`);
  console.log(`- Unique URLs: ${uniqueUrls.size}`);
  console.log(`- Files uploaded to Blob: ${dryRun ? 0 : uploadedCount}`);
  console.log(`- Posts updated: ${dryRun ? 0 : updatedPosts}`);
  console.log(`- Missing source files: ${report.missingFiles.length}`);
  console.log(`- Upload failures: ${report.failedUploads.length}`);

  if (dryRun) {
    console.log("\nDry-run complete. No changes were written.");
  }
}

main().catch((error) => {
  console.error("\nLegacy media migration failed:");
  console.error(error);
  process.exit(1);
});
