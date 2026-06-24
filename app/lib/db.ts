import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Enable connection caching for serverless environments (Vercel, Neon)
neonConfig.fetchConnectionCache = true;

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export const db = getDb();
export type Db = typeof db;
