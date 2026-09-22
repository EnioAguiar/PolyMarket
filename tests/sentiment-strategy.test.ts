import { describe, it, expect, vi } from 'vitest';
import { evaluateSentiment } from '../src/research/strategies/sentiment.js';
import * as rss from '../src/research/sources/google-news-rss.js';
import * as crawl from '../src/research/crawl4ai.js';
import * as jev from '../src/ai/jev.js';
import type { Market } from '../src/types/index.js';

const market: Market = {
  id: 'm1',
  question: 'Will the merger be approved?',
  slug: 'm1',
  categories: [],
  clobTokenIds: ['a1', 'a2'],
  active: true,
  closed: false,
  resolveDate: undefined,
  outcomes: [],
  outcomePrices: [],
};

describe('evaluateSentiment', () => {
  it('aggregates Jev judgments across found articles', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'Merger looks likely', link: 'https://a.example', pubDate: '', source: '' },
      { title: 'Regulators raise concerns', link: 'https://b.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(crawl, 'fetchArticleText').mockResolvedValue('Full article text.');
    vi.spyOn(jev, 'judgeNoul')
      .mockResolvedValueOnce({ probability: 0.8, confidence: 1 })
      .mockResolvedValueOnce({ probability: 0.3, confidence: 1 });

    const signal = await evaluateSentiment(market);

    expect(signal.strategy).toBe('sentiment');
    expect(signal.articlesFound).toBe(2);
    expect(signal.probability).toBeCloseTo(0.55, 5);
    expect(signal.articles).toHaveLength(2);
    expect(signal.articles.every((a) => a.usedFullText)).toBe(true);
  });

  it('falls back to the headline when article fetch fails', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'Headline only', link: 'https://c.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(crawl, 'fetchArticleText').mockRejectedValue(new Error('fetch failed'));
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.6, confidence: 1 });

    const signal = await evaluateSentiment(market);
    expect(signal.articles[0].probability).toBe(0.6);
    expect(signal.articles[0].usedFullText).toBe(false);
  });

  it('returns confidence 0.3 with fewer than 3 articles, 0.7 otherwise', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'A', link: 'https://a.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(crawl, 'fetchArticleText').mockResolvedValue('text');
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.5, confidence: 1 });

    const signal = await evaluateSentiment(market);
    expect(signal.confidence).toBe(0.3);
  });

  it('passes beforeDate through to searchGoogleNewsRss for backtest leakage prevention', async () => {
    const rssSpy = vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([]);
    vi.spyOn(crawl, 'fetchArticleText').mockResolvedValue('text');
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.5, confidence: 1 });

    const cutoff = new Date('2026-01-01T00:00:00Z');
    await evaluateSentiment(market, cutoff);

    expect(rssSpy).toHaveBeenCalledWith(market.question, { maxResults: 5, before: cutoff });
  });
});
