import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";

type TableKey =
  | "users"
  | "categories"
  | "posts"
  | "comments"
  | "emailMailboxes"
  | "emailMessages"
  | "banners"
  | "birthdaySubmissions"
  | "siteStats"
  | "contentBlocks";

const TABLE_ORDER: TableKey[] = [
  "users",
  "categories",
  "posts",
  "comments",
  "emailMailboxes",
  "emailMessages",
  "banners",
  "birthdaySubmissions",
  "siteStats",
  "contentBlocks",
];

const TABLE_NAMES: Record<TableKey, string> = {
  users: "users",
  categories: "categories",
  posts: "posts",
  comments: "comments",
  emailMailboxes: "email_mailboxes",
  emailMessages: "email_messages",
  banners: "banners",
  birthdaySubmissions: "birthday_submissions",
  siteStats: "site_stats",
  contentBlocks: "content_blocks",
};

const CHUNK_SIZE = 250;

function getEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel obrigatoria ausente: ${name}`);
  }
  return value;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function main() {
  const sourceUrl = getEnv("SOURCE_DATABASE_URL");
  const targetUrl = getEnv("TARGET_DATABASE_URL");

  const sourceSql = neon(sourceUrl);
  const sourceDb = drizzleNeon(sourceSql, { schema });

  const targetSql = postgres(targetUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });
  const targetDb = drizzlePostgres(targetSql, { schema });

  try {
    console.log("Iniciando migracao Neon -> VPS Postgres...");
    await targetSql`set session_replication_role = replica`;

    for (const tableKey of [...TABLE_ORDER].reverse()) {
      const tableName = TABLE_NAMES[tableKey];
      console.log(`Limpando tabela ${tableName}...`);
      await targetSql.unsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY CASCADE`);
    }

    for (const tableKey of TABLE_ORDER) {
      const table = schema[tableKey];
      const tableName = TABLE_NAMES[tableKey];
      console.log(`Lendo ${tableName} da origem...`);
      const rows = await sourceDb.select().from(table);
      console.log(`Migrando ${rows.length} registro(s) para ${tableName}...`);

      for (const batch of chunkArray(rows, CHUNK_SIZE)) {
        if (batch.length === 0) continue;
        await targetDb.insert(table).values(batch);
      }
    }

    await targetSql`set session_replication_role = origin`;
    console.log("Migracao concluida com sucesso.");
  } finally {
    await targetSql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("Falha na migracao:", error);
  process.exit(1);
});
