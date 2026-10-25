import "server-only";
import { Pool } from "pg";

const globalDb = globalThis as unknown as { weddingPool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing. Add it to .env.local.");
  if (!globalDb.weddingPool) globalDb.weddingPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  return globalDb.weddingPool;
}
