import { ClobClient, OrderType, Side, SignatureTypeV2, AssetType } from '@polymarket/clob-client-v2';
import { createWalletClient, http, createPublicClient, keccak256, toBytes, getAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';
import type { Config, OrderBook, OrderBookEntry } from '../types/index.js';
import { getLogger } from '../logging/index.js';
import { createSharedPublicClient } from './http.js';

let clobClient: ClobClient | null = null;
let walletAddress: `0x${string}` | null = null;
let depositWalletAddress: `0x${string}` | null = null;

// pUSD contract on Polygon (collateral token for trading)
const PUSD_ADDRESS = getAddress('0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB');

// Deposit wallet factory on Polygon
const DEPOSIT_WALLET_FACTORY = getAddress('0x00000000000Fb5C9ADea0298D729A0CB3823Cc07');

export interface OrderExecutionResult {
  success: boolean;
  orderID?: string;
  txHash?: string;
  executedPrice?: number;
  reason: string;
}

export function getDepositWalletAddress(): `0x${string}` {
  if (!depositWalletAddress) {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY environment variable is required');
    }
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    walletAddress = account.address;

    const walletId = account.address.slice(2).padStart(64, '0');
    const factoryAddress = DEPOSIT_WALLET_FACTORY.slice(2);
    const args = '0x' + factoryAddress + walletId;
    const salt = sha3(args);
    depositWalletAddress = create2Address(DEPOSIT_WALLET_FACTORY, salt);
  }
  return depositWalletAddress;
}

function sha3(value: string): `0x${string}` {
  return keccak256(toBytes(value));
}

function create2Address(factory: `0x${string}`, salt: `0x${string}`): `0x${string}` {
  const combinedHex = (factory + salt.slice(2)) as `0x${string}`;
  const hash = keccak256(toBytes(combinedHex));
  return ('0x' + hash.slice(2, 42)) as `0x${string}`;
}

/**
 * Initialize the CLOB client with deposit wallet support
 * Uses POLY_1271 signature type (type 3) for deposit wallet orders
 */
export async function createClobClient(config: Config): Promise<ClobClient> {
  const logger = getLogger();
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    const err = new Error('PRIVATE_KEY environment variable is required for CLOB client');
    logger.error({ err: err.message, stack: err.stack }, 'Missing PRIVATE_KEY');
    throw err;
  }

  logger.info({ msg: 'Creating wallet client...' });
  let account;
  try {
    account = privateKeyToAccount(privateKey as `0x${string}`);
    logger.info({ address: account.address }, 'Wallet account created');
  } catch (err) {
    logger.error({ err, msg: 'Failed to create wallet account from private key' });
    throw err;
  }
  
  const walletClient = createWalletClient({
    account,
    transport: http(),
    chain: polygon,
  });
  logger.info({ msg: 'Wallet client created' });

  const host = config.polymarket.host;
  const chain = config.polymarket.chainId;
  logger.info({ host, chain }, 'CLOB config');

  let depositWallet: `0x${string}`;
  try {
    depositWallet = getDepositWalletAddress();
    logger.info({ depositWallet }, 'Derived deposit wallet address');
  } catch (err) {
    logger.error({ err, msg: 'Failed to derive deposit wallet address' });
    throw err;
  }

  logger.info({ msg: 'Creating ClobClient...' });
  let createdClient: ClobClient;
  try {
    createdClient = new ClobClient({
      host,
      chain,
      signer: walletClient,
      funderAddress: depositWallet,
      signatureType: SignatureTypeV2.POLY_1271,
    });
    logger.info({ msg: 'ClobClient instance created' });
  } catch (err) {
    logger.error({ err, msg: 'Failed to create ClobClient', host, chain, signatureType: 'POLY_1271' });
    throw err;
  }

  clobClient = createdClient;

  try {
    const creds = await clobClient.createOrDeriveApiKey();
    logger.info({ msg: 'CLOB API key derived successfully' });
  } catch (error) {
    logger.warn({ error, msg: 'Could not derive API key - L2 auth may be limited' });
  }

  try {
    await clobClient.updateBalanceAllowance({ asset_type: AssetType.COLLATERAL });
    logger.info({ msg: 'Balance allowance updated for deposit wallet' });
  } catch (error) {
    logger.warn({ error }, 'Failed to update balance allowance');
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
 * Get pUSD balance from deposit wallet via viem public client
 */
export async function getUSDCBalance(): Promise<number> {
  const logger = getLogger();
  try {
    const publicClient = createSharedPublicClient();

    const address = getDepositWalletAddress();
    logger.debug({ address }, 'Reading pUSD balance from deposit wallet');

    // ERC-20 balanceOf function signature
    const balance = await publicClient.readContract({
      address: PUSD_ADDRESS,
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

    // pUSD has 6 decimals
    const pusdBalance = Number(balance) / 1e6;
    logger.debug({ address, balance: pusdBalance }, 'pUSD balance retrieved');
    return pusdBalance;
  } catch (error) {
    logger.error({ error }, 'Failed to get pUSD balance');
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
