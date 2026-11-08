import { Pool as NeonPool } from "@neondatabase/serverless";
import pg from "pg";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePostgres } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../database/schema.js";
const globalForPg = globalThis;

export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");
  if (!globalForPg.skillSwapPool) {
    if (process.env.NEON_ENDPOINT_IP) {
      const connection = new URL(process.env.DATABASE_URL);
      const servername = connection.hostname;
      connection.hostname = process.env.NEON_ENDPOINT_IP;
      connection.searchParams.delete("sslmode");
      globalForPg.skillSwapPool = new pg.Pool({
        connectionString: connection.toString(),
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
        ssl: { servername, rejectUnauthorized: true },
      });
      globalForPg.skillSwapDb = drizzlePostgres(globalForPg.skillSwapPool, { schema });
    } else {
      globalForPg.skillSwapPool = new NeonPool({
        connectionString: process.env.DATABASE_URL,
        max: 5,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 10000,
      });
      globalForPg.skillSwapDb = drizzleNeon(globalForPg.skillSwapPool, { schema });
    }
  }
  return globalForPg.skillSwapPool;
}

export function getDb() {
  getPool();
  return globalForPg.skillSwapDb;
}

export async function query(text, params = []) {
  const pieces = [];
  let offset = 0;
  const pattern = /\$(\d+)/g;
  for (const match of text.matchAll(pattern)) {
    const position = match.index;
    pieces.push(sql.raw(text.slice(offset, position)));
    pieces.push(sql`${params[Number(match[1]) - 1]}`);
    offset = position + match[0].length;
  }
  pieces.push(sql.raw(text.slice(offset)));
  const result = await getDb().execute(sql.join(pieces, sql.empty()));
  return { rows: result.rows, rowCount: result.rowCount };
}
