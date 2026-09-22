import { describe, it, expect, vi, afterEach } from 'vitest';
import { evaluateResolutionSniping, fetchBinancePrice } from '../src/research/strategies/resolution-sniping.js';
import type { Market } from '../src/types/index.js';

const market: Market = {
  id: 'm3',
  question: 'Will Bitcoin be above $70,000 on December 31?',
  slug: 'm3',
  categories: [],
  clobTokenIds: ['a1', 'a2'],
  active: true,
  closed: false,
  resolveDate: undefined,
  outcomes: [],
  outcomePrices: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchBinancePrice', () => {
  it('parses the price field from Binance ticker response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: 'BTCUSDT', price: '68500.12' }),
    } as Response);

    const price = await fetchBinancePrice('btcusdt');
    expect(price).toBe(68500.12);
  });
});

describe('evaluateResolutionSniping', () => {
  it('flags mispricing when market and live price disagree', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: 'BTCUSDT', price: '71000' }),
    } as Response);

    // Live price (71000) is above the 70000 threshold -> realityIsAbove = true.
    // Market mid-price (0.3) implies below -> marketImpliesAbove = false. Disagreement.
    const signal = await evaluateResolutionSniping(market, 0.3, 'btcusdt', 70000);

    expect(signal.realityIsAbove).toBe(true);
    expect(signal.marketImpliesAbove).toBe(false);
    expect(signal.mispriced).toBe(true);
  });

  it('does not flag mispricing when market and live price agree', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: 'BTCUSDT', price: '71000' }),
    } as Response);

    const signal = await evaluateResolutionSniping(market, 0.9, 'btcusdt', 70000);
    expect(signal.mispriced).toBe(false);
  });
});
