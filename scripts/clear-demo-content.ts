/**
 * Remove todo o conteúdo de exemplo/demo do banco.
 * Mantém: users, siteStats.
 * Remove: posts, categories, comments, banners, contentBlocks.
 * Execute: npx tsx scripts/clear-demo-content.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

async function clear() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const postsDeleted = await db.delete(schema.posts).returning({ id: schema.posts.id });
  const categoriesDeleted = await db.delete(schema.categories).returning({ id: schema.categories.id });
  const bannersDeleted = await db.delete(schema.banners).returning({ id: schema.banners.id });
  const blocksDeleted = await db.delete(schema.contentBlocks).returning({ id: schema.contentBlocks.id });

  console.log(`Conteúdo removido:`);
  console.log(`  - ${postsDeleted.length} posts`);
  console.log(`  - ${categoriesDeleted.length} categorias`);
  console.log(`  - Comentários (cascade)`);
  console.log(`  - ${bannersDeleted.length} banners`);
  console.log(`  - ${blocksDeleted.length} blocos de conteúdo`);
  console.log(`Mantidos: users, siteStats, birthdaySubmissions`);
}

clear().catch(console.error);
