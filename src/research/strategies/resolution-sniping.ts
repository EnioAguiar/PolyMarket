import type { Market } from '../../types/index.js';

export interface ResolutionSnipingSignal {
  strategy: 'resolution_sniping';
  marketId: string;
  symbol: string;
  threshold: number;
  livePrice: number;
  marketImpliesAbove: boolean;
  realityIsAbove: boolean;
  mispriced: boolean;
}

export async function fetchBinancePrice(symbol: string): Promise<number> {
  const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
  if (!response.ok) {
    throw new Error(`Binance price fetch error: ${response.status}`);
  }
  const data = await response.json();
  return Number(data.price);
}

export async function evaluateResolutionSniping(
  market: Market,
  midPrice: number,
  symbol: string,
  threshold: number
): Promise<ResolutionSnipingSignal> {
  const livePrice = await fetchBinancePrice(symbol);
  const realityIsAbove = livePrice >= threshold;
  const marketImpliesAbove = midPrice >= 0.5;

  return {
    strategy: 'resolution_sniping',
    marketId: market.id,
    symbol,
    threshold,
    livePrice,
    marketImpliesAbove,
    realityIsAbove,
    mispriced: marketImpliesAbove !== realityIsAbove,
  };
}
