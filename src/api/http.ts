import { http, createPublicClient, PublicClient } from 'viem';
import { polygon } from 'viem/chains';

let sharedPublicClient: PublicClient | null = null;

const POLYGON_RPC_URLS = [
  'https://polygon.llamarpc.com',
  'https://rpc.ankr.com/polygon',
  'https://1rpc.io/matic',
];

export function createSharedPublicClient(): PublicClient {
  if (!sharedPublicClient) {
    const RPC_URL = process.env.POLYGON_RPC_URL || POLYGON_RPC_URLS[0];
    sharedPublicClient = createPublicClient({
      chain: polygon,
      transport: http(RPC_URL, {
        retryCount: 3,
        retryDelay: 1000,
      }),
    });
  }
  return sharedPublicClient;
}

export function resetSharedPublicClient(): void {
  sharedPublicClient = null;
}