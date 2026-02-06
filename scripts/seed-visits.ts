/**
 * Inicializa a contagem de visitas (ex: com o total do site antigo).
 * Execute: npx tsx scripts/seed-visits.ts
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

async function seed() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  const [existing] = await db
    .select()
    .from(schema.siteStats)
    .where(eq(schema.siteStats.id, "main"))
    .limit(1);

  if (existing) {
    console.log(`Visitas já inicializadas: ${existing.totalVisits}`);
    return;
  }

  await db.insert(schema.siteStats).values({
    id: "main",
    totalVisits: 5095,
  });

  console.log("Contagem de visitas inicializada com 5095.");
}

seed().catch(console.error);
