export enum SourceCategory {
  CRYPTO = 'crypto',
  NEWS = 'news',
  FINANCIAL = 'financial',
  SPORTS = 'sports',
}

export enum FeedType {
  REST = 'rest',
  WEBSOCKET = 'websocket',
  SCRAPING = 'scraping',
}

export interface SourceRating {
  id: string;
  name: string;
  category: SourceCategory;
  rating: 1 | 2 | 3 | 4 | 5; // ★1-5
  apiEndpoint: string;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedConfig {
  id: string;
  sourceId: string;
  feedUrl: string;
  feedType: FeedType;
  enabled: boolean;
  lastFetch: Date | null;
}

export interface ResearchResult {
  id: string;
  marketId: string;
  sourceId: string;
  signal: unknown;
  confidence: number; // 0-1
  fetchedAt: Date;
  processed: boolean;
}

// D-10: Bayesian confidence scoring
export interface BayesianConfidence {
  prior: number;      // 0.5 baseline
  likelihood: number; // from source rating
  posterior: number;  // calculated result
}

// Star rating thresholds
export const MIN_RATING = 3;   // D-12: Minimum ★3 enforced by code
export const MIN_SOURCES = 10;  // D-27: 10 source minimum (relaxed)
export const HIGH_RATING = 4;  // D-12: ★4+ can override relaxed policy
