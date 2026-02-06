/**
 * Script para criar o primeiro usuário administrador.
 * Execute: npx tsx scripts/seed-admin.ts
 * Ou com DATABASE_URL no .env: node -r ts-node/register scripts/seed-admin.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não definida. Crie um arquivo .env com DATABASE_URL.");
  process.exit(1);
}

async function seed() {
  const sql = neon(DATABASE_URL);
  const db = drizzle(sql, { schema });

  // Verificar se já existe um admin
  const existing = await db.select().from(schema.users).where(eq(schema.users.role, "administrador")).limit(1);
  if (existing.length > 0) {
    console.log("Já existe um administrador cadastrado.");
    return;
  }

  const id = randomUUID();
  const email = process.env.ADMIN_EMAIL || "admin@fozemdestaque.com.br";
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const hashed = await bcrypt.hash(password, 10);

  await db.insert(schema.users).values({
    id,
    email,
    name: "Administrador",
    password: hashed,
    role: "administrador",
    active: true,
  });

  console.log("Administrador criado com sucesso!");
  console.log("Email:", email);
  console.log("Senha:", password);
  console.log("Altere a senha após o primeiro login.");
}

seed().catch(console.error);
