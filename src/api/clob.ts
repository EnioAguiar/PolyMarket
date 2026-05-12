import { ClobClient, OrderType, Side, SignatureTypeV2, AssetType } from '@polymarket/clob-client-v2';
import { createWalletClient, http, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import type { Config, OrderBook, OrderBookEntry } from '../types/index.js';
import { getLogger } from '../logging/index.js';
import { createSharedPublicClient } from './http.js';

let clobClient: ClobClient | null = null;
let walletAddress: `0x${string}` | null = null;

const PUSD_ADDRESS = getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');

export interface OrderExecutionResult {
  success: boolean;
  orderID?: string;
  txHash?: string;
  executedPrice?: number;
  reason: string;
}

export function getWalletAddress(): `0x${string}` {
  if (!walletAddress) {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(key as `0x${string}`);
    walletAddress = account.address;
  }
  return walletAddress;
}

export async function createClobClient(config: Config): Promise<ClobClient> {
  const logger = getLogger();
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required for CLOB client');
  }

  const key = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  const account = privateKeyToAccount(key as `0x${string}`);
  walletAddress = account.address;
  logger.info({ address: account.address }, 'Wallet account created (EOA mode)');

  const walletClient = createWalletClient({
    account,
    transport: http(),
    chain: polygon,
  });

  const host = config.polymarket.host;
  const chain = config.polymarket.chainId;
  logger.info({ host, chain }, 'CLOB config');

  const funder = account.address;
  logger.info({ msg: 'Creating temporary client to derive API credentials...' });
  const tempClient = new ClobClient({
    host,
    chain,
    signer: walletClient,
    signatureType: SignatureTypeV2.EOA,
    funderAddress: funder,
  });

  let creds;
  try {
    creds = await tempClient.createOrDeriveApiKey();
    logger.info({ msg: 'CLOB API key derived successfully', key: creds.key.slice(0, 8) + '...' });
  } catch (error) {
    logger.warn({ error, msg: 'Could not derive API key - L2 auth may be limited' });
  }

  logger.info({ msg: 'Creating authenticated ClobClient with credentials...' });
  clobClient = new ClobClient({
    host,
    chain,
    signer: walletClient,
    creds,
    signatureType: SignatureTypeV2.EOA,
    funderAddress: funder,
  });
  logger.info({ msg: 'ClobClient instance created with L2 auth' });

  try {
    await clobClient.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
    logger.info({ msg: 'Balance allowance updated' });
  } catch (error) {
    logger.warn({ error }, 'Failed to update balance allowance');
  }

  return clobClient;
}

export function getClobClient(): ClobClient {
  if (!clobClient) {
    throw new Error('CLOB client not initialized. Call createClobClient(config) first.');
  }
  return clobClient;
}

export async function getUSDCBalance(): Promise<number> {
  const logger = getLogger();
  try {
    const publicClient = createSharedPublicClient();
    const walletAddr = getWalletAddress();

    const USDC_ADDRESS = getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');

    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: [{
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }],
      functionName: 'balanceOf',
      args: [getAddress(walletAddr)],
    });

    const usdcBalance = Number(balance) / 1e6;
    logger.info({ address: walletAddr, usdcAddress: USDC_ADDRESS, rawBalance: balance.toString(), balance: usdcBalance }, 'USDC balance retrieved');
    return usdcBalance;
  } catch (error) {
    logger.error({ error, address: getWalletAddress() }, 'Failed to get USDC balance');
    return 0;
  }
}

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

export function getBestPrices(orderbook: OrderBook): { bestBid: number | null; bestAsk: number | null } {
  return {
    bestBid: orderbook.bids[0]?.price || null,
    bestAsk: orderbook.asks[0]?.price || null,
  };
}

export function getMidPrice(orderbook: OrderBook): number | null {
  const { bestBid, bestAsk } = getBestPrices(orderbook);
  if (bestBid === null || bestAsk === null) return null;
  return (bestBid + bestAsk) / 2;
}

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