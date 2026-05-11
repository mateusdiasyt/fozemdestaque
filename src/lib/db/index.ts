import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { normalizeDatabaseUrl } from "./url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não está definida nas variáveis de ambiente");
}

const globalForDb = globalThis as typeof globalThis & {
  __fozPostgresClient?: ReturnType<typeof postgres>;
};

const connectionString = normalizeDatabaseUrl(process.env.DATABASE_URL);
const sql =
  globalForDb.__fozPostgresClient ??
  postgres(connectionString, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__fozPostgresClient = sql;
}

export const db = drizzle(sql, { schema });
