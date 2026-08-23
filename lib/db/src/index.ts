import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_POOLER_URL ?? process.env.DATABASE_URL;

type PoolInstance = InstanceType<typeof pg.Pool>;
let pool: PoolInstance;
let db: ReturnType<typeof drizzle>;

if (!connectionString) {
  console.warn(
    "DATABASE_URL / DATABASE_POOLER_URL not set. Database queries will fail.",
  );
  pool = null as unknown as PoolInstance;
  db = null as unknown as ReturnType<typeof drizzle>;
} else {
  pool = new pg.Pool({
    connectionString,
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
  db = drizzle(pool, { schema });
}

export { pool, db };
export * from "./schema";

