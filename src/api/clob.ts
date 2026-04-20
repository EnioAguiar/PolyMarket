import { ClobClient } from '@polymarket/clob-client-v2';
import { Wallet } from 'ethers';
import type { Config, OrderBook, OrderBookEntry } from '../types/index.js';

let clobClient: ClobClient | null = null;

/**
 * Initialize the CLOB client (EXEC-01: wallet connection)
 * Requires PRIVATE_KEY and FUNDER_ADDRESS environment variables
 */
export function createClobClient(config: Config): ClobClient {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required for CLOB client');
  }

  const signer = new Wallet(privateKey);
  
  const host = config.polymarket.host;
  const chain = config.polymarket.chainId;

  clobClient = new ClobClient({ host, chain, signer });
  
  return clobClient;
}

/**
 * Get the singleton CLOB client instance
 */
export function getClobClient(): ClobClient {
  if (!clobClient) {
    throw new Error('CLOB client not initialized. Call createClobClient(config) first.');
  }
  return clobClient;
}

/**
 * Fetch orderbook for a specific token (MON-02: fetch odds and orderbook depth)
 */
export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  const client = getClobClient();
  
  const orderbook = await client.getOrderBook(tokenId);
  
  return {
    bids: orderbook.bids.map(bid => ({
      price: typeof bid.price === 'string' ? parseFloat(bid.price) : bid.price,
      size: typeof bid.size === 'string' ? parseFloat(bid.size) : bid.size,
    })) as OrderBookEntry[],
    asks: orderbook.asks.map(ask => ({
      price: typeof ask.price === 'string' ? parseFloat(ask.price) : ask.price,
      size: typeof ask.size === 'string' ? parseFloat(ask.size) : ask.size,
    })) as OrderBookEntry[],
  };
}

/**
 * Get the best bid/ask prices for a market
 */
export function getBestPrices(orderbook: OrderBook): { bestBid: number | null; bestAsk: number | null } {
  return {
    bestBid: orderbook.bids[0]?.price || null,
    bestAsk: orderbook.asks[0]?.price || null,
  };
}

/**
 * Calculate mid-price from orderbook
 */
export function getMidPrice(orderbook: OrderBook): number | null {
  const { bestBid, bestAsk } = getBestPrices(orderbook);
  if (bestBid === null || bestAsk === null) return null;
  return (bestBid + bestAsk) / 2;
}

/**
 * Check if orderbook has sufficient liquidity
 */
export function hasLiquidity(orderbook: OrderBook, minSize = 1): boolean {
  const totalBidSize = orderbook.bids.reduce((sum, bid) => sum + bid.size, 0);
  const totalAskSize = orderbook.asks.reduce((sum, ask) => sum + ask.size, 0);
  return totalBidSize >= minSize && totalAskSize >= minSize;
}
