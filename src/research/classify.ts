import type { Market } from '../types/index.js';

export type MarketStrategy = 'resolution_sniping' | 'tail_end' | 'sentiment' | 'none';

export interface CryptoThreshold {
  symbol: string;
  threshold: number;
}

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'btcusdt',
  btc: 'btcusdt',
  ethereum: 'ethusdt',
  eth: 'ethusdt',
};

const COMPARISON_WORDS = /\b(above|below|over|under|exceed|reach|hit|surpass)\b/i;
const SYMBOL_PATTERN = /\b(bitcoin|btc|ethereum|eth)\b/i;
const THRESHOLD_PATTERN = /\$\s*([\d,]+(?:\.\d+)?)/;

export function extractCryptoThreshold(question: string): CryptoThreshold | null {
  const symbolMatch = question.match(SYMBOL_PATTERN);
  const comparisonMatch = question.match(COMPARISON_WORDS);
  const thresholdMatch = question.match(THRESHOLD_PATTERN);

  if (!symbolMatch || !comparisonMatch || !thresholdMatch) return null;

  const symbol = SYMBOL_MAP[symbolMatch[1].toLowerCase()];
  const threshold = Number(thresholdMatch[1].replace(/,/g, ''));
  if (!symbol || Number.isNaN(threshold)) return null;

  return { symbol, threshold };
}

export function classifyMarket(market: Market, midPrice: number | null): MarketStrategy {
  if (extractCryptoThreshold(market.question)) return 'resolution_sniping';
  if (midPrice === null) return 'none';
  if (midPrice >= 0.97 || midPrice <= 0.03) return 'tail_end';
  return 'sentiment';
}
