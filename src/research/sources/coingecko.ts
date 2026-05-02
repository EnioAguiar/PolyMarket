import { SourceCategory } from '../../types/source.js';
import type { ResearchSignal } from '../interface.js';
import { BaseResearchAdapter } from './base.js';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export class CoinGeckoAdapter extends BaseResearchAdapter {
  id = 'coingecko';
  name = 'CoinGecko';
  category = SourceCategory.CRYPTO;
  rating = 4 as const;

  async fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    const coinId = this.topicToCoinId(topic);
    const apiKey = process.env.COINGECKO_API_KEY;

    const url = new URL(`${COINGECKO_API}/coins/${coinId}`);
    if (apiKey) {
      url.searchParams.set('x_cg_demo_api_key', apiKey);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json() as {
      id: string;
      symbol: string;
      name: string;
      market_data: {
        current_price: Record<string, number>;
        price_change_percentage_24h: number;
        market_cap: Record<string, number>;
        total_volume: Record<string, number>;
      };
      community_data: {
        twitter_followers: number;
        telegram_subscribers: number;
      };
      developer_data: {
        forks: number;
        stars: number;
      };
    };

    const signal = {
      coinId: data.id,
      symbol: data.symbol,
      name: data.name,
      price: data.market_data.current_price.usd,
      priceChange24h: data.market_data.price_change_percentage_24h,
      marketCap: data.market_data.market_cap.usd,
      volume24h: data.market_data.total_volume.usd,
      communityScore: this.calculateCommunityScore(data.community_data),
      developerScore: this.calculateDeveloperScore(data.developer_data),
    };

    const confidence = this.calculateConfidence(signal, marketTimeHorizon);
    const recency = 1.0;

    return this.createSignal(signal, confidence, { coinId: data.id });
  }

  isAvailable(): boolean {
    return true;
  }

  private topicToCoinId(topic: string): string {
    const lower = topic.toLowerCase();
    if (lower.includes('bitcoin') || lower.includes('btc')) return 'bitcoin';
    if (lower.includes('ethereum') || lower.includes('eth')) return 'ethereum';
    if (lower.includes('solana') || lower.includes('sol')) return 'solana';
    if (lower.includes('dogecoin') || lower.includes('doge')) return 'dogecoin';
    return 'bitcoin';
  }

  private calculateCommunityScore(data: { twitter_followers: number; telegram_subscribers: number }): number {
    const twitterScore = Math.min(data.twitter_followers / 1000000, 1);
    const telegramScore = Math.min(data.telegram_subscribers / 500000, 1);
    return (twitterScore * 0.6 + telegramScore * 0.4);
  }

  private calculateDeveloperScore(data: { forks: number; stars: number }): number {
    const forkScore = Math.min(data.forks / 50000, 1);
    const starScore = Math.min(data.stars / 50000, 1);
    return (forkScore * 0.4 + starScore * 0.6);
  }

  private calculateConfidence(signal: any, marketTimeHorizon?: number): number {
    let confidence = 0.6;
    if (signal.priceChange24h !== null) confidence += 0.1;
    if (signal.marketCap > 1000000000) confidence += 0.15;
    if (signal.volume24h > 100000000) confidence += 0.1;
    if (signal.communityScore > 0.5) confidence += 0.05;
    return Math.min(confidence, 0.95);
  }
}
