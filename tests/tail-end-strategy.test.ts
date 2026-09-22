import { describe, it, expect, vi } from 'vitest';
import { evaluateTailEnd } from '../src/research/strategies/tail-end.js';
import * as rss from '../src/research/sources/google-news-rss.js';
import * as jev from '../src/ai/jev.js';
import type { Market } from '../src/types/index.js';

const market: Market = {
  id: 'm2',
  question: 'Will the incumbent win re-election?',
  slug: 'm2',
  categories: [],
  clobTokenIds: ['a1', 'a2'],
  active: true,
  closed: false,
  resolveDate: undefined,
  outcomes: [],
  outcomePrices: [],
};

describe('evaluateTailEnd', () => {
  it('confirms a high-price market when Jev agrees', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'Incumbent declared winner', link: 'https://a.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.95, confidence: 1 });

    const signal = await evaluateTailEnd(market, 0.98);
    expect(signal.confirmed).toBe(true);
    expect(signal.confirmationProbability).toBe(0.95);
  });

  it('does not confirm when Jev disagrees with the implied outcome', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([]);
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.2, confidence: 1 });

    const signal = await evaluateTailEnd(market, 0.98);
    expect(signal.confirmed).toBe(false);
  });

  it('handles a low-price (implied NO) market', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([]);
    const judgeNoulSpy = vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.9, confidence: 1 });

    const signal = await evaluateTailEnd(market, 0.02);
    expect(signal.marketPrice).toBe(0.02);
    expect(signal.confirmed).toBe(true);

    // The state string must express confidence IN the implied outcome (NO is
    // ~98% implied here), not the raw market price (2%) — the raw price is
    // YES's price, and reporting it next to "implies NO" would read backwards.
    const [state] = judgeNoulSpy.mock.calls[0];
    expect(state).toContain('implies NO at 98.0%');
    expect(state).not.toContain('implies NO at 2.0%');
  });
});
