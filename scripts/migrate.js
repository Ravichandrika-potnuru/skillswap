import nextEnv from "@next/env";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../database/schema.js";

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL before running migrations.");
}

// Migrations use the direct endpoint; the app uses the Neon Serverless Driver.
const url = new URL(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const hostname = url.hostname;
let ssl;
if (process.env.NEON_ENDPOINT_IP) {
  url.hostname = process.env.NEON_ENDPOINT_IP;
  url.searchParams.delete("sslmode");
  ssl = { servername: hostname, rejectUnauthorized: true };
}
const pool = new pg.Pool({ connectionString: url.toString(), max: 1, ...(ssl ? { ssl } : {}) });
const db = drizzle(pool, { schema });
try {
  await migrate(db, { migrationsFolder: "database/migrations" });
  console.log("Drizzle migrations applied successfully.");
} finally {
  await pool.end();
}
