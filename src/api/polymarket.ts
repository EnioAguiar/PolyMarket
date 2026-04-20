import { Market } from '../types/index.js';

const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';

export async function fetchMarkets(params: {
  limit?: number;
  category?: string;
  active?: boolean;
  closed?: boolean;
  minEndDate?: Date;
  maxEndDate?: Date;
} = {}): Promise<Market[]> {
  const searchParams = new URLSearchParams();
  
  if (params.active !== false) searchParams.set('active', 'true');
  if (params.closed !== false) searchParams.set('closed', 'false');
  if (params.limit) searchParams.set('limit', String(params.limit));
  
  // Date filtering using API's native end_date_min/end_date_max
  if (params.minEndDate) {
    searchParams.set('end_date_min', params.minEndDate.toISOString());
  }
  if (params.maxEndDate) {
    searchParams.set('end_date_max', params.maxEndDate.toISOString());
  }
  
  const url = `${GAMMA_BASE_URL}/markets?${searchParams.toString()}`;
  console.log('[DEBUG] Fetching markets from:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gamma API error: ${response.status} ${response.statusText}`);
  }
  
  const rawMarkets = await response.json() as any[];
  console.log('[DEBUG] Raw markets count:', rawMarkets.length);
  
  return rawMarkets.map(raw => ({
    id: raw.condition_id || raw.id,
    question: raw.question,
    slug: raw.slug,
    categories: raw.categories || [],
    clobTokenIds: Array.isArray(raw.clobTokenIds) 
      ? raw.clobTokenIds 
      : raw.clobTokenIds 
        ? JSON.parse(raw.clobTokenIds) 
        : [],
    active: raw.active ?? true,
    closed: raw.closed ?? false,
    resolveDate: raw.endDate || raw.resolution?.resolveDate || raw.resolve_date,
  }));
}

export function filterByCategory(markets: Market[], category: string): Market[] {
  const lowerCategory = category.toLowerCase();
  return markets.filter(market => 
    market.categories?.some(cat => cat.toLowerCase().includes(lowerCategory))
  );
}

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

export function getYesTokenId(market: Market): string | null {
  return market.clobTokenIds[0] || null;
}

export function getNoTokenId(market: Market): string | null {
  return market.clobTokenIds[1] || null;
}
