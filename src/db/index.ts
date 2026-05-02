import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { resolve } from 'path';
import * as schema from './schema.js';

const DB_PATH = resolve(process.env.DB_PATH || '/data/polymarket.db');

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const sqlite = new Database(DB_PATH);
    db = drizzle(sqlite, { schema });
  }
  return db;
}

export { schema };
