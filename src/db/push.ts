import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { resolve } from 'path';
import * as schema from './schema.js';

const DB_PATH = resolve(process.env.DATA_DIR || './data', 'sources.db');

async function pushSchema() {
  const sqlite = new Database(DB_PATH);
  const db = drizzle(sqlite, { schema });
  
  console.log('[DB] Pushing schema to:', DB_PATH);
  
  // Create tables manually since drizzle-kit push needs config
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS source_ratings (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      rating INTEGER NOT NULL,
      api_endpoint TEXT NOT NULL,
      config TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS source_feeds (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL REFERENCES source_ratings(id),
      feed_url TEXT NOT NULL,
      feed_type TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      last_fetch TEXT
    );
    
    CREATE TABLE IF NOT EXISTS research_results (
      id TEXT PRIMARY KEY,
      market_id TEXT NOT NULL,
      source_id TEXT NOT NULL REFERENCES source_ratings(id),
      signal TEXT,
      confidence REAL NOT NULL,
      fetched_at TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0
    );
  `);
  
  console.log('[DB] Schema pushed successfully');
  sqlite.close();
}

pushSchema().catch(console.error);
