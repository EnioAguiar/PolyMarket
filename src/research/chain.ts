import { ClobClient } from '@polymarket/clob-client-v2';
import type { ResearchSource, AggregatedResearch } from './interface.js';
import { ResearchAggregator } from './aggregator.js';
import { BinanceAdapter } from './binance.js';
import { NewsDataAdapter } from './newsdata.js';
import { TwitterAdapter } from './twitter.js';
import { RedditAdapter } from './reddit.js';
import { Crawl4AISearchAdapter } from './crawl4ai_search.js';
import { BayesianScorer, type ConfidenceResult, type ConfidenceInput } from './confidence.js';
import { SourceCategory, MIN_SOURCES } from '../types/source.js';
import pino from 'pino';

const logger = pino({ level: 'debug' });

export interface ResearchChainConfig {
  binanceApiKey?: string;
  newsdataApiKey?: string;
  twitterBearerToken?: string;
  redditClientId?: string;
  redditClientSecret?: string;
}

export interface ResearchOutput {
  marketId: string;
  question: string;
  signals: ResearchSource[];
  confidenceResult: ConfidenceResult;
  canProceed: boolean;        // True if enough sources
  recommendation?: 'bet' | 'skip' | 'uncertain';
}

export class ResearchChain {
  private aggregator: ResearchAggregator;
  private scorer: typeof BayesianScorer;
  private client: ClobClient;
  
  constructor(config: ResearchChainConfig) {
    // Initialize CLOB client for market data
    this.client = new ClobClient({
      host: 'https://clob.polymarket.com',
      chain: 137,
    });
    
    // Initialize aggregator with adapters
    this.aggregator = new ResearchAggregator([]);
    
    // D-18: 2/3 Binance, 1/3 NewsData
    // Register adapters
    const binance = new BinanceAdapter();
    const newsdata = new NewsDataAdapter();

    this.aggregator.addSource(binance);
    this.aggregator.addSource(newsdata);
    
    // Social sources (Phase 7)
    // Allow env var fallback
    const twitterToken = config.twitterBearerToken || process.env.TWITTER_BEARER_TOKEN;
    const redditClientId = config.redditClientId || process.env.REDDIT_CLIENT_ID;
    const redditClientSecret = config.redditClientSecret || process.env.REDDIT_CLIENT_SECRET;
    
    if (twitterToken) {
      const twitter = new TwitterAdapter();
      this.aggregator.addSource(twitter);
    }
    
    if (redditClientId && redditClientSecret) {
      const reddit = new RedditAdapter();
      this.aggregator.addSource(reddit);
    }

    // Web search via Crawl4AI + Brave (Phase 7 Wave 3)
    const crawl4aiSearch = new Crawl4AISearchAdapter();
    this.aggregator.addSource(crawl4aiSearch);
    
    // BayesianScorer is static-only, no instance needed
    this.scorer = BayesianScorer;
  }
  
  /**
   * Run full research pipeline for a market
   * 
   * Steps:
   * 1. Aggregate research from all sources with proper mix
   * 2. Apply Bayesian confidence scoring
   * 3. Determine if bet decision can be made
   * 4. Generate recommendation
   */
  async research(
    marketId: string,
    topic: string,
    marketTimeHorizon?: number
  ): Promise<AggregatedResearch> {
    logger.info({ marketId, topic }, 'Starting research');
    
    // Step 1: Aggregate signals with mix enforcement
    const aggregated = await this.aggregator.aggregate(marketId, topic, marketTimeHorizon);
    
    logger.info({ 
      signalCount: aggregated.signals.length,
      sources: [...new Set(aggregated.signals.map(s => s.sourceId))]
    }, 'Signals aggregated');
    
    // Step 2: Calculate confidence with Bayesian scoring
    const input: ConfidenceInput = { signals: aggregated.signals };
    const result = this.scorer.calculate(input);
    
    logger.info({
      posterior: result.posterior,
      confidence: result.confidence,
      sourceCount: result.sourceCount,
      warning: result.warning
    }, 'Confidence calculated');
    
    // Step 3: Update aggregated result with Bayesian posterior
    aggregated.bayesianPosterior = result.posterior;
    aggregated.warnings.push(...result.warnings.filter((w: string) => w));
    
    // Step 4: Add confidence result to metadata for downstream use
    // (stored in aggregated for AI chain to use)
    
    return aggregated;
  }
  
  /**
   * Determine if research is sufficient to proceed with bet
   */
  canProceed(aggregated: AggregatedResearch): boolean {
    // D-26: Relaxed policy - proceed if we have any qualified sources
    // But log warning if < 10 per D-28
    if (aggregated.signals.length === 0) {
      return false;
    }
    
    if (aggregated.signals.length < MIN_SOURCES) {
      // Still can proceed but logged warning already in aggregate
      return true;
    }
    
    return true;
  }
  
  /**
   * Generate bet/skip/uncertain recommendation based on confidence
   */
  generateRecommendation(result: ConfidenceResult): 'bet' | 'skip' | 'uncertain' {
    // High confidence + clear direction = bet
    // Low confidence or conflicting signals = uncertain
    // No signals or very low confidence = skip
    
    if (result.confidence < 0.3) {
      return 'skip';
    }
    
    if (result.confidence >= 0.7 && result.posterior !== 0.5) {
      return 'bet';
    }
    
    return 'uncertain';
  }
  
  async healthCheck(): Promise<Record<string, boolean>> {
    const sources = this.aggregator.getSources();
    const health: Record<string, boolean> = {};
    for (const source of sources) {
      health[source.id] = source.isAvailable();
    }
    return health;
  }
}