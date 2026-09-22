import type { Market } from '../../types/index.js';
import { searchGoogleNewsRss } from '../sources/google-news-rss.js';
import { fetchArticleText } from '../crawl4ai.js';
import { judgeNoul } from '../../ai/jev.js';

export interface SentimentSignal {
  strategy: 'sentiment';
  marketId: string;
  question: string;
  articlesFound: number;
  probability: number;
  confidence: number;
  articles: { title: string; link: string; probability: number; usedFullText: boolean }[];
}

export async function evaluateSentiment(market: Market, beforeDate?: Date): Promise<SentimentSignal> {
  const articles = await searchGoogleNewsRss(market.question, { maxResults: 5, before: beforeDate });

  const judged = await Promise.all(
    articles.map(async (article) => {
      let usedFullText = true;
      const text = await fetchArticleText(article.link).catch(() => {
        usedFullText = false;
        return article.title;
      });
      const result = await judgeNoul(
        `Market question: "${market.question}"\n\nNews article: "${article.title}"\n\n${text}`,
        'Does this news article suggest the answer to the market question is YES?'
      );
      return { title: article.title, link: article.link, probability: result.probability, usedFullText };
    })
  );

  const avgProbability =
    judged.length > 0 ? judged.reduce((sum, j) => sum + j.probability, 0) / judged.length : 0.5;

  return {
    strategy: 'sentiment',
    marketId: market.id,
    question: market.question,
    articlesFound: articles.length,
    probability: avgProbability,
    confidence: judged.length >= 3 ? 0.7 : 0.3,
    articles: judged,
  };
}
