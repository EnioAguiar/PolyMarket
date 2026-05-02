import { SourceCategory } from '../../types/source.js';
import type { ResearchSignal } from '../interface.js';
import { BaseResearchAdapter } from './base.js';

const API_FOOTBALL_HOST = 'api-football-v1.p.rapidapi.com';
const API_FOOTBALL_BASE = 'https://api-football-v1.p.rapidapi.com';

export class FootballAdapter extends BaseResearchAdapter {
  id = 'football';
  name = 'API-Football';
  category = SourceCategory.SPORTS;
  rating = 3 as const;

  async fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    const apiKey = process.env.RAPIDAPI_KEY;
    const host = process.env.RAPIDAPI_HOST || API_FOOTBALL_HOST;

    if (!apiKey) {
      throw new Error('RapidAPI key not configured for API-Football');
    }

    const league = this.extractLeague(topic);
    const fixtures = await this.fetchUpcomingFixtures(league, host, apiKey);

    const signal = {
      league,
      fixtures: fixtures.slice(0, 10),
      totalFixtures: fixtures.length,
      marketTimeHorizon,
    };

    const confidence = this.calculateConfidence(fixtures, marketTimeHorizon);
    const recency = this.calculateRecency();

    return this.createSignal(signal, confidence, { league });
  }

  isAvailable(): boolean {
    return !!(process.env.RAPIDAPI_KEY);
  }

  private async fetchUpcomingFixtures(league: string, host: string, apiKey: string): Promise<any[]> {
    const url = new URL(`${API_FOOTBALL_BASE}/fixtures`);
    url.searchParams.set('league', league);
    url.searchParams.set('from', new Date().toISOString().split('T')[0]);
    url.searchParams.set('to', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    url.searchParams.set('status', 'NS');

    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
      },
    });

    if (!response.ok) {
      throw new Error(`API-Football error: ${response.status}`);
    }

    const data = await response.json() as { response: any[] };
    return data.response || [];
  }

  private extractLeague(topic: string): string {
    const lower = topic.toLowerCase();
    if (lower.includes('premier') || lower.includes('epl') || lower.includes('england')) return '39';
    if (lower.includes('la liga') || lower.includes('spain')) return '140';
    if (lower.includes('bundesliga') || lower.includes('germany')) return '78';
    if (lower.includes('serie') || lower.includes('italy')) return '135';
    if (lower.includes('ligue') || lower.includes('france')) return '61';
    if (lower.includes('champions')) return '2';
    if (lower.includes('europa')) return '3';
    return '39';
  }

  private calculateConfidence(fixtures: any[], marketTimeHorizon?: number): number {
    let confidence = 0.5;
    if (fixtures.length > 0) confidence += 0.2;
    if (fixtures.length > 5) confidence += 0.1;
    if (marketTimeHorizon && marketTimeHorizon <= 24 * 60 * 60 * 1000) {
      confidence += 0.1;
    }
    return Math.min(confidence, 0.85);
  }

  private calculateRecency(): number {
    return 1.0;
  }
}
