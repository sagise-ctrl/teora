import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_POOLER_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.warn(
    "DATABASE_URL / DATABASE_POOLER_URL not set. Database queries will fail.",
  );
  export const pool = null as unknown as import("pg").Pool;
  export const db = null as unknown as ReturnType<typeof drizzle>;
  export * from "./schema";
  return;
}

export const pool = new Pool({
  connectionString,
  // Serverless: limit connections per function instance to avoid pool exhaustion.
  // The connection pooler (PgBouncer) sits in front of Postgres and handles multiplexing.
  max:
    process.env.VERCEL === "1"
      ? 1
      : 10,
  ssl:
    connectionString.includes("pooler.supabase.com") ||
    process.env.VERCEL === "1"
      ? { rejectUnauthorized: false }
      : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";

