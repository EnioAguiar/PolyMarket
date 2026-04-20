import type { OrderBook } from '../types/index.js';

export interface ArbitrageCheckResult {
  isArbitrage: boolean;
  yesPrice: number;
  noPrice: number;
  combinedPrice: number;
  feeThreshold: number;
  profitPct: number;
  reason: string;
}

const FEE_THRESHOLD = 0.99; // D-16: YES + NO < $0.99 for arbitrage

export function checkArbitrage(orderbook: OrderBook): ArbitrageCheckResult {
  // D-15 to D-18: Arbitrage detection
  // YES + NO < $0.99 = arbitrage opportunity
  
  const bestBid = orderbook.bids[0]?.price;  // NO side price (selling NO)
  const bestAsk = orderbook.asks[0]?.price;  // YES side price (buying YES)
  
  if (!bestBid || !bestAsk) {
    return {
      isArbitrage: false,
      yesPrice: bestAsk || 0,
      noPrice: bestBid || 0,
      combinedPrice: 0,
      feeThreshold: FEE_THRESHOLD,
      profitPct: 0,
      reason: 'Insufficient orderbook data',
    };
  }
  
  // YES = ask price (buying YES tokens)
  // NO = bid price (selling NO tokens)
  const yesPrice = bestAsk;
  const noPrice = bestBid;
  const combinedPrice = yesPrice + noPrice;
  
  const isArbitrage = combinedPrice < FEE_THRESHOLD;
  const profitPct = isArbitrage ? ((FEE_THRESHOLD - combinedPrice) / FEE_THRESHOLD) * 100 : 0;
  
  if (isArbitrage) {
    return {
      isArbitrage: true,
      yesPrice,
      noPrice,
      combinedPrice,
      feeThreshold: FEE_THRESHOLD,
      profitPct,
      reason: `Arbitrage detected: YES(${yesPrice}) + NO(${noPrice}) = ${combinedPrice.toFixed(3)} < ${FEE_THRESHOLD}`,
    };
  }
  
  return {
    isArbitrage: false,
    yesPrice,
    noPrice,
    combinedPrice,
    feeThreshold: FEE_THRESHOLD,
    profitPct: 0,
    reason: `No arbitrage: YES(${yesPrice}) + NO(${noPrice}) = ${combinedPrice.toFixed(3)} >= ${FEE_THRESHOLD}`,
  };
}

export function calculateArbitrageProfit(yesPrice: number, noPrice: number, stake: number): {
  yesShares: number;
  noShares: number;
  totalCost: number;
  guaranteedReturn: number;
  profit: number;
} {
  const combinedPrice = yesPrice + noPrice;
  const yesShares = stake / yesPrice;
  const noShares = stake / noPrice;
  const totalCost = stake;
  const guaranteedReturn = yesPrice < noPrice ? yesShares : noShares;
  const profit = guaranteedReturn - totalCost;
  
  return {
    yesShares,
    noShares,
    totalCost,
    guaranteedReturn,
    profit,
  };
}
