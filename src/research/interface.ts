import { SourceCategory } from '../types/source.js';

export interface ResearchSignal {
  sourceId: string;
  category: SourceCategory;
  signal: unknown;  // The actual data from source
  confidence: number;  // 0-1
  timestamp: Date;
  recency: number;  // How fresh (0-1, 1=fresh)
  metadata?: Record<string, unknown>;
}

export interface ResearchSource {
  id: string;
  name: string;
  category: SourceCategory;
  rating: 1 | 2 | 3 | 4 | 5;
  
  // Core method: fetch research for a topic/market
  fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal>;
  
  // Check if source is available
  isAvailable(): boolean;
}

export interface AggregatedResearch {
  marketId: string;
  signals: ResearchSignal[];
  totalSources: number;
  avgConfidence: number;
  bayesianPosterior: number;
  meetsMinSources: boolean;
  warnings: string[];
}
