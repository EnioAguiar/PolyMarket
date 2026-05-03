import { ClobClient, OrderType, Side } from '@polymarket/clob-client-v2';
import { createWalletClient, http, createPublicClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import type { Config, OrderBook, OrderBookEntry } from '../types/index.js';
import { getLogger } from '../logging/index.js';
import { createSharedPublicClient } from './http.js';

let clobClient: ClobClient | null = null;
let walletAddress: `0x${string}` | null = null;

// USDC contract on Polygon
const USDC_ADDRESS = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as const;

export interface OrderExecutionResult {
  success: boolean;
  orderID?: string;
  txHash?: string;
  executedPrice?: number;
  reason: string;
}

/**
 * Initialize the CLOB client (EXEC-01: wallet connection)
 * Uses viem wallet client as required by @polymarket/clob-client-v2
 * Requires PRIVATE_KEY environment variable (hex string with 0x prefix)
 */
export async function createClobClient(config: Config): Promise<ClobClient> {
  const logger = getLogger();
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required for CLOB client');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    transport: http(),
    chain: polygon,
  });

  const host = config.polymarket.host;
  const chain = config.polymarket.chainId;

  clobClient = new ClobClient({ host, chain, signer: walletClient });

  try {
    const creds = await clobClient.createOrDeriveApiKey();
    logger.info({ msg: 'CLOB API key derived successfully' });
  } catch (error) {
    logger.warn({ error, msg: 'Could not derive API key - L2 auth may be limited' });
  }

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
 * Get wallet address from private key
 */
export function getWalletAddress(): `0x${string}` {
  if (!walletAddress) {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    walletAddress = account.address;
  }
  return walletAddress;
}

/**
 * Get USDC balance from wallet via viem public client
 */
export async function getUSDCBalance(): Promise<number> {
  const logger = getLogger();
  try {
    const publicClient = createSharedPublicClient();

    const address = getWalletAddress();

    // ERC-20 balanceOf function signature
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: [
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ],
      functionName: 'balanceOf',
      args: [address],
    });

    // USDC has 6 decimals
    const usdcBalance = Number(balance) / 1e6;
    logger.debug({ address, balance: usdcBalance }, 'USDC balance retrieved');
    return usdcBalance;
  } catch (error) {
    logger.error({ error }, 'Failed to get USDC balance');
    return 0;
  }
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

export async function placeMarketOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  amount: number
): Promise<OrderExecutionResult> {
  const logger = getLogger();
  const client = getClobClient();

  try {
    const orderSide = side === 'BUY' ? Side.BUY : Side.SELL;

    const result = await client.createAndPostMarketOrder(
      {
        tokenID: tokenId,
        amount,
        side: orderSide,
        orderType: OrderType.FOK,
      },
      { tickSize: '0.01' },
      OrderType.FOK
    );

    logger.info({ tokenId, side, amount, result }, 'Market order posted');

    return {
      success: true,
      orderID: result.orderID,
      txHash: result.txHash,
      executedPrice: result.executedPrice || amount,
      reason: `Market order filled at ${result.executedPrice || 'market price'}`,
    };
  } catch (error) {
    logger.error({ tokenId, side, amount, error }, 'Market order failed');
    return {
      success: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function placeLimitOrder(
  tokenId: string,
  side: 'BUY' | 'SELL',
  price: number,
  size: number
): Promise<OrderExecutionResult> {
  const logger = getLogger();
  const client = getClobClient();

  try {
    const orderSide = side === 'BUY' ? Side.BUY : Side.SELL;

    const result = await client.createAndPostOrder(
      {
        tokenID: tokenId,
        price,
        side: orderSide,
        size,
      },
      { tickSize: '0.01' },
      OrderType.GTC
    );

    logger.info({ tokenId, side, price, size, result }, 'Limit order posted');

    return {
      success: true,
      orderID: result.orderID,
      txHash: result.txHash,
      executedPrice: price,
      reason: `Limit order posted at ${price}`,
    };
  } catch (error) {
    logger.error({ tokenId, side, price, size, error }, 'Limit order failed');
    return {
      success: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
