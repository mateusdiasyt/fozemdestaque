/**
 * Move posts da categoria "agenda" para "aniversariantes".
 * Use após ter importado aniversários com agenda por engano.
 * Execute: npx tsx scripts/move-agenda-to-aniversariantes.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

async function main() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const [agenda] = await db.select().from(schema.categories).where(eq(schema.categories.slug, "agenda")).limit(1);
  const [aniversariantes] = await db.select().from(schema.categories).where(eq(schema.categories.slug, "aniversariantes")).limit(1);

  if (!agenda) {
    console.log("Categoria 'agenda' não encontrada.");
    return;
  }
  if (!aniversariantes) {
    console.error("Categoria 'aniversariantes' não encontrada. Crie-a no admin primeiro.");
    process.exit(1);
  }

  const updated = await db
    .update(schema.posts)
    .set({ categoryId: aniversariantes.id })
    .where(eq(schema.posts.categoryId, agenda.id))
    .returning({ id: schema.posts.id });

  console.log(`${updated.length} posts movidos de 'agenda' para 'aniversariantes'.`);
}

main().catch(console.error);
