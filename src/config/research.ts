import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { resolve } from 'path';

export interface SocialSourceConfig {
  enabled: boolean;
  rating: 3 | 4 | 5;
  rateLimit: {
    maxRequestsPerMinute: number;
    backoffSeconds: number;
  };
}

export interface TwitterConfig extends SocialSourceConfig {
  bearerToken: string | null;
  defaultLimit: number;
}

export interface RedditConfig extends SocialSourceConfig {
  clientId: string | null;
  clientSecret: string | null;
  userAgent: string;
  defaultSubreddits: string[];
}

export interface ResearchConfig {
  sources: {
    crypto: { defaultRating: number; minSources: number };
    news: { defaultRating: number; minSources: number };
    financial: { defaultRating: number; minSources: number };
    sports: { defaultRating: number; minSources: number };
    social: { defaultRating: number; minSources: number };
  };
  mix: {
    binanceWeight: number;  // 0.67 (2/3)
    googleWeight: number;  // 0.33 (1/3)
  };
  apiKeys: {
    googleNews?: string;
    twitterBearerToken?: string;
    redditClientId?: string;
    redditClientSecret?: string;
  };
  thresholds: {
    minRating: number;   // 3
    minSources: number;  // 10
    highRating: number;  // 4
  };
  twitter: TwitterConfig;
  reddit: RedditConfig;
}

export const DEFAULT_TWITTER_CONFIG: TwitterConfig = {
  enabled: true,
  rating: 3,
  rateLimit: { maxRequestsPerMinute: 30, backoffSeconds: 60 },
  bearerToken: process.env.TWITTER_BEARER_TOKEN || null,
  defaultLimit: 10,
};

export const DEFAULT_REDDIT_CONFIG: RedditConfig = {
  enabled: true,
  rating: 4,
  rateLimit: { maxRequestsPerMinute: 60, backoffSeconds: 1 },
  clientId: process.env.REDDIT_CLIENT_ID || null,
  clientSecret: process.env.REDDIT_CLIENT_SECRET || null,
  userAgent: 'polymarket-bot/1.0',
  defaultSubreddits: ['CryptoCurrency', 'sports', 'worldnews', 'predictionmarkets'],
};

export function loadResearchConfig(): ResearchConfig {
  const configPath = resolve('./config.yaml');
  let fileContents: string;
  
  try {
    fileContents = readFileSync(configPath, 'utf8');
  } catch {
    // config.yaml not found, use defaults
    return getDefaultResearchConfig();
  }
  
  const config = parse(fileContents) as { research?: Partial<ResearchConfig> };
  const partial = config.research ?? {};
  
  return {
    sources: {
      crypto: partial.sources?.crypto ?? { defaultRating: 3, minSources: 5 },
      news: partial.sources?.news ?? { defaultRating: 3, minSources: 5 },
      financial: partial.sources?.financial ?? { defaultRating: 3, minSources: 3 },
      sports: partial.sources?.sports ?? { defaultRating: 3, minSources: 3 },
      social: partial.sources?.social ?? { defaultRating: 3, minSources: 3 },
    },
    mix: partial.mix ?? {
      binanceWeight: 0.67,
      googleWeight: 0.33,
    },
    apiKeys: {
      googleNews: partial.apiKeys?.googleNews,
      twitterBearerToken: partial.apiKeys?.twitterBearerToken ?? process.env.TWITTER_BEARER_TOKEN,
      redditClientId: partial.apiKeys?.redditClientId ?? process.env.REDDIT_CLIENT_ID,
      redditClientSecret: partial.apiKeys?.redditClientSecret ?? process.env.REDDIT_CLIENT_SECRET,
    },
    thresholds: partial.thresholds ?? {
      minRating: 3,
      minSources: 10,
      highRating: 4,
    },
    twitter: { ...DEFAULT_TWITTER_CONFIG, ...partial.twitter },
    reddit: { ...DEFAULT_REDDIT_CONFIG, ...partial.reddit },
  };
}

function getDefaultResearchConfig(): ResearchConfig {
  return {
    sources: {
      crypto: { defaultRating: 3, minSources: 5 },
      news: { defaultRating: 3, minSources: 5 },
      financial: { defaultRating: 3, minSources: 3 },
      sports: { defaultRating: 3, minSources: 3 },
      social: { defaultRating: 3, minSources: 3 },
    },
    mix: {
      binanceWeight: 0.67,
      googleWeight: 0.33,
    },
    apiKeys: {},
    thresholds: {
      minRating: 3,
      minSources: 10,
      highRating: 4,
    },
    twitter: DEFAULT_TWITTER_CONFIG,
    reddit: DEFAULT_REDDIT_CONFIG,
  };
}
