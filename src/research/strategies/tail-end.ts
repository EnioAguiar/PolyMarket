import type { Market } from '../../types/index.js';
import { searchGoogleNewsRss } from '../sources/google-news-rss.js';
import { judgeNoul } from '../../ai/jev.js';

export interface TailEndSignal {
  strategy: 'tail_end';
  marketId: string;
  marketPrice: number;
  confirmed: boolean;
  confirmationProbability: number;
}

export async function evaluateTailEnd(market: Market, midPrice: number): Promise<TailEndSignal> {
  const impliedOutcome = midPrice >= 0.97 ? 'YES' : 'NO';
  const impliedProbability = impliedOutcome === 'YES' ? midPrice : 1 - midPrice;
  const articles = await searchGoogleNewsRss(market.question, { maxResults: 3 });
  const headlines = articles.map((a) => a.title).join('. ') || 'No recent news found.';

  const result = await judgeNoul(
    `Market question: "${market.question}"\nCurrent market price implies ${impliedOutcome} at ${(impliedProbability * 100).toFixed(1)}%.\nRecent headlines: ${headlines}`,
    `Does available evidence confirm the real-world event behind this question has already effectively happened, matching the market's implied ${impliedOutcome} outcome?`
  );

  return {
    strategy: 'tail_end',
    marketId: market.id,
    marketPrice: midPrice,
    confirmed: result.probability >= 0.7,
    confirmationProbability: result.probability,
  };
}
