import { SourceCategory } from '../../types/source.js';
import type { ResearchSource, ResearchSignal } from '../interface.js';
import { BaseResearchAdapter } from './base.js';

const GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';

export class GoogleNewsAdapter extends BaseResearchAdapter {
  id = 'google_news';
  name = 'Google News';
  category = SourceCategory.NEWS;
  rating = 3 as const;

  async fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      throw new Error('Google API credentials not configured');
    }

    const timeRestrict = this.getTimeRestrict(marketTimeHorizon);
    const url = new URL(GOOGLE_SEARCH_URL);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('cx', searchEngineId);
    url.searchParams.set('q', topic);
    if (timeRestrict) {
      url.searchParams.set('dateRestrict', timeRestrict);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json() as {
      items?: Array<{ title: string; snippet: string; link: string }>;
      searchInformation?: { resultCount: number };
    };

    const items = data.items || [];
    const signal = {
      results: items.map(item => ({
        title: item.title,
        snippet: item.snippet,
        link: item.link,
      })),
      totalResults: data.searchInformation?.resultCount || 0,
    };

    const confidence = this.calculateConfidence(signal, marketTimeHorizon);
    const recency = this.calculateRecency(marketTimeHorizon);

    return this.createSignal(signal, confidence, { timeRestrict });
  }

  isAvailable(): boolean {
    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    return !!(apiKey && searchEngineId);
  }

  private getTimeRestrict(marketTimeHorizon?: number): string | null {
    if (!marketTimeHorizon) return null;
    const hours = Math.floor(marketTimeHorizon / (60 * 60 * 1000));
    if (hours <= 1) return 'h1';
    if (hours <= 6) return 'h6';
    if (hours <= 24) return 'd1';
    return null;
  }

  private calculateConfidence(signal: { totalResults: number }, marketTimeHorizon?: number): number {
    let confidence = 0.5;
    if (signal.totalResults > 10) confidence += 0.2;
    if (signal.totalResults > 100) confidence += 0.1;
    if (marketTimeHorizon && marketTimeHorizon <= 6 * 60 * 60 * 1000) {
      confidence += 0.1;
    }
    return Math.min(confidence, 1.0);
  }

  private calculateRecency(marketTimeHorizon?: number): number {
    if (!marketTimeHorizon) return 0.5;
    const hours = marketTimeHorizon / (60 * 60 * 1000);
    if (hours <= 1) return 1.0;
    if (hours <= 6) return 0.9;
    if (hours <= 24) return 0.7;
    return 0.5;
  }
}
