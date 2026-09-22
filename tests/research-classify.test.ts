import { describe, it, expect } from 'vitest';
import { classifyMarket, extractCryptoThreshold } from '../src/research/classify.js';
import type { Market } from '../src/types/index.js';

function makeMarket(question: string, overrides: Partial<Market> = {}): Market {
  return {
    id: 'm1',
    question,
    slug: 'm1',
    categories: [],
    clobTokenIds: ['a1', 'a2'],
    active: true,
    closed: false,
    resolveDate: undefined,
    outcomes: [],
    outcomePrices: [],
    ...overrides,
  };
}

describe('extractCryptoThreshold', () => {
  it('extracts BTC and a dollar threshold from "above" phrasing', () => {
    const result = extractCryptoThreshold('Will Bitcoin be above $70,000 on December 31?');
    expect(result).toEqual({ symbol: 'btcusdt', threshold: 70000 });
  });

  it('extracts ETH and a threshold from "reach" phrasing', () => {
    const result = extractCryptoThreshold('Will Ethereum reach $5000 by end of year?');
    expect(result).toEqual({ symbol: 'ethusdt', threshold: 5000 });
  });

  it('returns null for a non-crypto-threshold question', () => {
    expect(extractCryptoThreshold('Will the Fed raise rates in October?')).toBeNull();
  });

  it('returns null for a crypto question with no numeric threshold', () => {
    expect(extractCryptoThreshold('Will Bitcoin go up this week?')).toBeNull();
  });
});

describe('classifyMarket', () => {
  it('classifies a crypto-threshold question as resolution_sniping regardless of price', () => {
    const market = makeMarket('Will Bitcoin be above $70,000 on December 31?');
    expect(classifyMarket(market, 0.5)).toBe('resolution_sniping');
  });

  it('classifies a high-price non-crypto market as tail_end', () => {
    const market = makeMarket('Will the incumbent win re-election?');
    expect(classifyMarket(market, 0.98)).toBe('tail_end');
  });

  it('classifies a low-price non-crypto market as tail_end', () => {
    const market = makeMarket('Will a third party candidate win?');
    expect(classifyMarket(market, 0.02)).toBe('tail_end');
  });

  it('classifies a mid-price non-crypto market as sentiment', () => {
    const market = makeMarket('Will the merger be approved?');
    expect(classifyMarket(market, 0.5)).toBe('sentiment');
  });

  it('classifies as none when midPrice is unavailable', () => {
    const market = makeMarket('Will the merger be approved?');
    expect(classifyMarket(market, null)).toBe('none');
  });
});
