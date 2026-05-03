import type { OrderBook } from '../types/index.js';

export enum OrderType {
  LIMIT = 'limit',
  MARKET = 'market',
}

export interface LimitOrderConfig {
  targetPrice: number;
  timeoutMs: number;
  fallBackToMarket: boolean;
}

export interface OrderResult {
  success: boolean;
  executedPrice?: number;
  orderType: OrderType;
  reason: string;
  txHash?: string;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
const DEFAULT_FALLBACK = true;

export async function placeLimitOrder(
  orderbook: OrderBook,
  side: 'BUY' | 'SELL',
  targetPrice: number,
  size: number,
  config: Partial<LimitOrderConfig> = {}
): Promise<OrderResult> {
  const { targetPrice: cfgTarget, timeoutMs = DEFAULT_TIMEOUT_MS, fallBackToMarket = DEFAULT_FALLBACK } = config;
  
  // D-12: Limit orders by default
  // D-13: Market order as fallback if limit fails
  // D-14: Hybrid approach
  
  const startTime = Date.now();
  
  // Poll until price is met or timeout
  while (Date.now() - startTime < timeoutMs) {
    const bestBid = orderbook.bids[0]?.price;
    const bestAsk = orderbook.asks[0]?.price;
    
    if (side === 'BUY' && bestAsk && bestAsk <= targetPrice) {
      return {
        success: true,
        executedPrice: bestAsk,
        orderType: OrderType.LIMIT,
        reason: `Limit order filled at ${bestAsk}`,
      };
    }
    
    if (side === 'SELL' && bestBid && bestBid >= targetPrice) {
      return {
        success: true,
        executedPrice: bestBid,
        orderType: OrderType.LIMIT,
        reason: `Limit order filled at ${bestBid}`,
      };
    }
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // D-13: Fallback to market order if limit didn't fill
  if (fallBackToMarket) {
    return {
      success: true,
      executedPrice: side === 'BUY' ? orderbook.asks[0]?.price : orderbook.bids[0]?.price,
      orderType: OrderType.MARKET,
      reason: 'Limit order timeout - filled at market price',
    };
  }
  
  // Limit order failed and no fallback
  return {
    success: false,
    orderType: OrderType.LIMIT,
    reason: `Limit order timeout after ${timeoutMs}ms - no fallback enabled`,
  };
}

export async function placeMarketOrder(
  orderbook: OrderBook,
  side: 'BUY' | 'SELL',
  size: number
): Promise<OrderResult> {
  const price = side === 'BUY' ? orderbook.asks[0]?.price : orderbook.bids[0]?.price;
  
  if (!price) {
    return {
      success: false,
      orderType: OrderType.MARKET,
      reason: 'No liquidity available',
    };
  }
  
  return {
    success: true,
    executedPrice: price,
    orderType: OrderType.MARKET,
    reason: `Market order filled at ${price}`,
  };
}
