/**
 * Remove posts sem categoria (páginas, itens mal importados do WordPress).
 * Execute: npx tsx scripts/cleanup-uncategorized-posts.ts
 * Para apenas listar o que seria removido: npx tsx scripts/cleanup-uncategorized-posts.ts --dry-run
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { isNull } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida no .env.local");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const uncategorized = await db
    .select({ id: schema.posts.id, title: schema.posts.title, status: schema.posts.status })
    .from(schema.posts)
    .where(isNull(schema.posts.categoryId));

  if (uncategorized.length === 0) {
    console.log("Nenhum post sem categoria encontrado.");
    return;
  }

  console.log(`Encontrados ${uncategorized.length} posts sem categoria:\n`);
  uncategorized.slice(0, 30).forEach((p) => {
    console.log(`  - [${p.status}] ${p.title}`);
  });
  if (uncategorized.length > 30) {
    console.log(`  ... e mais ${uncategorized.length - 30} posts`);
  }

  if (DRY_RUN) {
    console.log(`\n(Dry-run) Para remover de verdade, execute sem --dry-run`);
    return;
  }

  const deleted = await db
    .delete(schema.posts)
    .where(isNull(schema.posts.categoryId))
    .returning({ id: schema.posts.id });

  console.log(`\nRemovidos ${deleted.length} posts sem categoria.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
