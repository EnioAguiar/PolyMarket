import { http, createPublicClient, fallback, PublicClient } from 'viem';
import { polygon } from 'viem/chains';

let sharedPublicClient: PublicClient | null = null;

const POLYGON_RPC_URLS = [
  'https://1rpc.io/matic',
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
];

export function createSharedPublicClient(): PublicClient {
  if (!sharedPublicClient) {
    const urls = process.env.POLYGON_RPC_URL
      ? [process.env.POLYGON_RPC_URL, ...POLYGON_RPC_URLS]
      : POLYGON_RPC_URLS;
    sharedPublicClient = createPublicClient({
      chain: polygon,
      transport: fallback(urls.map((url) => http(url, { retryCount: 2, retryDelay: 500 }))),
    });
  }
  return sharedPublicClient;
}

export function resetSharedPublicClient(): void {
  sharedPublicClient = null;
}