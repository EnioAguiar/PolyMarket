import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { resolve } from 'path';

export interface ResearchConfig {
  sources: {
    crypto: { defaultRating: number; minSources: number };
    news: { defaultRating: number; minSources: number };
    financial: { defaultRating: number; minSources: number };
    sports: { defaultRating: number; minSources: number };
  };
  mix: {
    binanceWeight: number;  // 0.67 (2/3)
    googleWeight: number;  // 0.33 (1/3)
  };
  apiKeys: {
    googleNews?: string;
  };
  thresholds: {
    minRating: number;   // 3
    minSources: number;  // 10
    highRating: number;  // 4
  };
}

export function loadResearchConfig(): ResearchConfig {
  const configPath = resolve('./config.yaml');
  const fileContents = readFileSync(configPath, 'utf8');
  const config = parse(fileContents) as { research?: ResearchConfig };
  
  // Default values if not in config.yaml
  return config.research ?? {
    sources: {
      crypto: { defaultRating: 3, minSources: 5 },
      news: { defaultRating: 3, minSources: 5 },
      financial: { defaultRating: 3, minSources: 3 },
      sports: { defaultRating: 3, minSources: 3 },
    },
    mix: {
      binanceWeight: 0.67,  // D-18: 2/3 Binance WebSocket
      googleWeight: 0.33,    // D-19: 1/3 Google
    },
    apiKeys: {},
    thresholds: {
      minRating: 3,   // MIN_RATING constant
      minSources: 10,  // MIN_SOURCES constant (relaxed)
      highRating: 4,   // HIGH_RATING for override
    },
  };
}
