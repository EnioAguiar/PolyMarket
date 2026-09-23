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

// Whale-signal live monitor (2026-09-22): every large trade ($20k+) seen
// live, classified as fresh/dormant or established wallet at the moment of
// the bet, backfilled with the real outcome once its market resolves.
// Both groups are stored (not just "interesting" ones) so the
// fresh/dormant-vs-established control comparison keeps working as data
// accumulates -- see src/research/whale-signal.ts for the classification
// rules shared with the historical backtest (scripts/validate-whale-signal.ts).
export const whaleBets = sqliteTable('whale_bets', {
  id: text('id').primaryKey(), // `${wallet}:${conditionId}:${timestamp}`
  wallet: text('wallet').notNull(),
  conditionId: text('condition_id').notNull(),
  tokenId: text('token_id').notNull(),
  eventSlug: text('event_slug').notNull(),
  title: text('title').notNull(),
  outcomeIndex: integer('outcome_index').notNull(),
  timestamp: integer('timestamp').notNull(), // epoch seconds of the bet
  shares: real('shares').notNull(),
  usdStaked: real('usd_staked').notNull(),
  avgPrice: real('avg_price').notNull(),
  tradesBefore: integer('trades_before').notNull(),
  gapDays: real('gap_days'), // nullable
  isFreshOrDormant: integer('is_fresh_or_dormant', { mode: 'boolean' }).notNull(),
  resolved: integer('resolved', { mode: 'boolean' }).notNull().default(false),
  resolvedAt: integer('resolved_at'),
  won: integer('won', { mode: 'boolean' }),
  pnl: real('pnl'),
  createdAt: text('created_at').notNull(),
});

export type WhaleBet = typeof whaleBets.$inferSelect;

export type SourceRating = typeof sourceRatings.$inferSelect;
export type SourceFeed = typeof sourceFeeds.$inferSelect;
export type ResearchResult = typeof researchResults.$inferSelect;
