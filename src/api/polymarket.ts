import { Market } from '../types/index.js';

const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';

/**
 * Fetch markets from Polymarket Gamma API
 * No API key required - public endpoint
 */
export async function fetchMarkets(params: {
  limit?: number;
  category?: string;
  active?: boolean;
  closed?: boolean;
} = {}): Promise<Market[]> {
  const searchParams = new URLSearchParams();
  
  if (params.active !== false) searchParams.set('active', 'true');
  if (params.closed !== false) searchParams.set('closed', 'false');
  if (params.limit) searchParams.set('limit', String(params.limit));
  
  const url = `${GAMMA_BASE_URL}/markets?${searchParams.toString()}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
  }
  
  const rawMarkets = await response.json() as any[];
  
  return rawMarkets.map(raw => ({
    id: raw.condition_id || raw.id,
    question: raw.question,
    slug: raw.slug,
    categories: raw.categories || [],
    clobTokenIds: raw.clobTokenIds || [],
    active: raw.active ?? true,
    closed: raw.closed ?? false,
    resolveDate: raw.resolution?.resolveDate || raw.resolve_date,
  }));
}

/**
 * Filter markets by category (MON-03)
 */
export function filterByCategory(markets: Market[], category: string): Market[] {
  const lowerCategory = category.toLowerCase();
  return markets.filter(market => 
    market.categories?.some(cat => cat.toLowerCase().includes(lowerCategory))
  );
}

/**
 * Filter markets by time horizon - 5min to 24h (MON-04)
 * Markets with no resolveDate are excluded (no known resolution time)
 */
export function filterByTimeHorizon(markets: Market[], minMinutes = 5, maxHours = 24): Market[] {
  const now = Date.now();
  const minMs = minMinutes * 60 * 1000;
  const maxMs = maxHours * 60 * 60 * 1000;
  
  return markets.filter(market => {
    if (!market.resolveDate) return false;
    
    const resolveTime = new Date(market.resolveDate).getTime();
    const timeUntilResolve = resolveTime - now;
    
    return timeUntilResolve >= minMs && timeUntilResolve <= maxMs;
  });
}

/**
 * Get the YES token ID from a market (first in clobTokenIds array)
 */
export function getYesTokenId(market: Market): string | null {
  return market.clobTokenIds[0] || null;
}

/**
 * Get the NO token ID from a market (second in clobTokenIds array)
 */
export function getNoTokenId(market: Market): string | null {
  return market.clobTokenIds[1] || null;
}
