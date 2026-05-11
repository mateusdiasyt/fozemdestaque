/**
 * Inicializa a contagem de visitas (ex: com o total do site antigo).
 * Execute: npx tsx scripts/seed-visits.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { normalizeDatabaseUrl } from "../src/lib/db/url";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

async function seed() {
  const sql = postgres(normalizeDatabaseUrl(DATABASE_URL), {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
  });
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
