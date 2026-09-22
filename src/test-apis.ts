import pino from 'pino';
import { NewsDataAdapter } from './research/newsdata.js';
import { BinanceAdapter } from './research/binance.js';
import { SourceCategory } from './types/source.js';
import type { ConfidenceResult } from './research/confidence.js';

const logger = pino({ level: 'info' });

async function testNewsData() {
  console.log('=== Testing NewsData Adapter ===');
  const adapter = new NewsDataAdapter();
  console.log('Available:', adapter.isAvailable());

  if (!adapter.isAvailable()) {
    console.log('❌ NEWSDATA_API_KEY not set');
    return false;
  }

  try {
    const signal = await adapter.fetch('Bitcoin crypto', 3600000);
    console.log('✅ NewsData API working!');
    const data = signal.signal as { totalResults?: number; articles?: Array<{ title: string; source: string }> };
    console.log('Total results:', data.totalResults);
    console.log('First article:', data.articles?.[0]?.title?.substring(0, 80) || 'none');
    return true;
  } catch (error) {
    console.log('❌ NewsData API error:', error);
    return false;
  }
}

async function testBinance() {
  console.log('\n=== Testing Binance Adapter ===');
  const adapter = new BinanceAdapter();
  console.log('Available:', adapter.isAvailable());

  try {
    const signal = await adapter.fetch('Bitcoin', 3600000);
    console.log('✅ Binance WebSocket working!');
    const data = signal.signal as { price?: string; priceChangePercent?: string };
    console.log('Price:', data.price);
    console.log('24h Change:', data.priceChangePercent, '%');
    return true;
  } catch (error) {
    console.log('❌ Binance API error:', error);
    return false;
  }
}

async function testMiniMax() {
  console.log('\n=== Testing MiniMax Adapter ===');

  if (!process.env.MINIMAX_API_KEY) {
    console.log('❌ MINIMAX_API_KEY not set');
    return false;
  }

  try {
    // Initialize logger with minimal config
    const { initLogger } = await import('./logging/index.js');
    initLogger({
      dryRun: true,
      safety: { maxPositionSizePct: 0.08, dailyLossLimitPct: 0.05, drawdownKillSwitchPct: 0.15 },
      logging: { level: 'info', pretty: false },
      polymarket: { host: 'polymarket.com', gammaHost: 'gamma.polymarket.com', chainId: 137 },
    });

    const { generateEstimate } = await import('./ai/minimax.js');

    const fullConfidenceResult: ConfidenceResult = {
      posterior: 0.65,
      confidence: 0.7,
      sourceCount: 2,
      weightedEvidence: 1.2,
      individualScores: [],
      warnings: [],
      avgWeight: 0.6,
      meetsMinRating: true,
    };

    const mockRequest = {
      marketId: 'test-market',
      question: 'Will Bitcoin be above $100k by end of 2026?',
      signals: [
        {
          sourceId: 'binance',
          category: SourceCategory.CRYPTO,
          signal: { price: 95000 },
          confidence: 0.8,
          timestamp: new Date(),
          recency: 1,
          metadata: {},
        },
        {
          sourceId: 'google',
          category: SourceCategory.NEWS,
          signal: { totalResults: 50, results: [{ title: 'Bitcoin rally' }] },
          confidence: 0.6,
          timestamp: new Date(),
          recency: 0.8,
          metadata: {},
        },
      ],
      confidenceResult: fullConfidenceResult,
    };

    const result = await generateEstimate(mockRequest);
    console.log('✅ MiniMax API working!');
    console.log('Probability:', result.estimate.probability);
    console.log('Reasoning:', result.estimate.reasoning.substring(0, 100));
    return true;
  } catch (error) {
    console.log('❌ MiniMax API error:', error);
    return false;
  }
}

async function main() {
  console.log('Testing APIs...\n');

  const results = {
    newsdata: await testNewsData(),
    binance: await testBinance(),
    minimax: await testMiniMax(),
  };

  console.log('\n=== Summary ===');
  console.log('NewsData API:', results.newsdata ? '✅ WORKING' : '❌ FAILED');
  console.log('Binance API:', results.binance ? '✅ WORKING' : '❌ FAILED');
  console.log('MiniMax API:', results.minimax ? '✅ WORKING' : '❌ FAILED');
}

main().catch(console.error);