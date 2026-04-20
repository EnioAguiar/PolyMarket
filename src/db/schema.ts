import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const sourceRatings = sqliteTable('source_ratings', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull(), // crypto, news, financial, sports
  rating: integer('rating').notNull(), // 1-5 stars
  apiEndpoint: text('api_endpoint').notNull(),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const sourceFeeds = sqliteTable('source_feeds', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sourceRatings.id),
  feedUrl: text('feed_url').notNull(),
  feedType: text('feed_type').notNull(), // rest, websocket, scraping
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastFetch: text('last_fetch'),
});

export const researchResults = sqliteTable('research_results', {
  id: text('id').primaryKey(),
  marketId: text('market_id').notNull(),
  sourceId: text('source_id').notNull().references(() => sourceRatings.id),
  signal: text('signal', { mode: 'json' }).$type<unknown>(),
  confidence: real('confidence').notNull(), // 0-1
  fetchedAt: text('fetched_at').notNull(),
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
});

export type SourceRating = typeof sourceRatings.$inferSelect;
export type SourceFeed = typeof sourceFeeds.$inferSelect;
export type ResearchResult = typeof researchResults.$inferSelect;
