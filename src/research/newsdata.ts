import { SourceCategory } from '../types/source.js';
import type { ResearchSource, ResearchSignal } from './interface.js';

const NEWSDATA_API_URL = 'https://newsdata.io/api/1/news';

export class NewsDataAdapter implements ResearchSource {
  id = 'newsdata';
  name = 'NewsData.io';
  category = SourceCategory.NEWS;
  rating = 3 as const;

  async fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    const apiKey = process.env.NEWSDATA_API_KEY;

    if (!apiKey) {
      throw new Error('NEWSDATA_API_KEY environment variable not set');
    }

    const language = 'en';
    const size = this.getSize(marketTimeHorizon);

    const params = new URLSearchParams({
      apikey: apiKey,
      q: topic,
      language,
      size: size.toString(),
    });

    // Add category for crypto markets
    if (this.isCryptoTopic(topic)) {
      params.set('category', 'business');
    }

    const url = `${NEWSDATA_API_URL}?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NewsData API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
      results?: Array<{
        title?: string;
        description?: string;
        link?: string;
        pubDate?: string;
        source_id?: string;
        source_name?: string;
      }>;
      status?: string;
      totalResults?: number;
    };

    if (data.status !== 'success') {
      throw new Error(`NewsData API returned status: ${data.status}`);
    }

    const articles = data.results || [];
    const signal = {
      articles: articles.map(a => ({
        title: a.title || '',
        description: a.description || '',
        link: a.link || '',
        pubDate: a.pubDate || '',
        source: a.source_name || a.source_id || '',
      })),
      totalResults: data.totalResults || articles.length,
    };

    const confidence = this.calculateConfidence(signal, marketTimeHorizon);
    const recency = this.calculateRecency(signal, marketTimeHorizon);

    return {
      sourceId: this.id,
      category: this.category,
      signal,
      confidence,
      timestamp: new Date(),
      recency,
    };
  }

  isAvailable(): boolean {
    return !!process.env.NEWSDATA_API_KEY;
  }

  private isCryptoTopic(topic: string): boolean {
    const cryptoTerms = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'solana', 'sol', 'binance', 'bnb'];
    return cryptoTerms.some(term => topic.toLowerCase().includes(term));
  }

  private getSize(marketTimeHorizon?: number): number {
    if (!marketTimeHorizon) return 10;
    const hours = marketTimeHorizon / (60 * 60 * 1000);
    if (hours <= 1) return 5;
    if (hours <= 6) return 10;
    if (hours <= 24) return 20;
    return 30;
  }

  private calculateConfidence(
    signal: { totalResults: number },
    marketTimeHorizon?: number
  ): number {
    let confidence = 0.5;

    if (signal.totalResults > 5) confidence += 0.2;
    if (signal.totalResults > 15) confidence += 0.1;
    if (signal.totalResults > 30) confidence += 0.1;

    if (marketTimeHorizon && marketTimeHorizon <= 6 * 60 * 60 * 1000) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private calculateRecency(signal: { totalResults: number }, marketTimeHorizon?: number): number {
    if (!marketTimeHorizon) return 0.5;
    const hours = marketTimeHorizon / (60 * 60 * 1000);
    if (hours <= 1) return 1.0;
    if (hours <= 6) return 0.9;
    if (hours <= 24) return 0.7;
    return 0.5;
  }
}