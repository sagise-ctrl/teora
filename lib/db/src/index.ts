import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use connection pooler URL for serverless environments (Vercel Functions).
// Falls back to direct connection for local development / VPS.
const connectionString =
  process.env.DATABASE_POOLER_URL ?? process.env.DATABASE_URL;

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

