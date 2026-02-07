/**
 * Remove todos os posts do banco (mantém categorias).
 * Execute: npx tsx scripts/delete-all-posts.ts
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

async function main() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });
  const deleted = await db.delete(schema.posts).returning({ id: schema.posts.id });
  console.log(`${deleted.length} posts removidos. Categorias mantidas.`);
}

main().catch(console.error);
