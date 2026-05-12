import { http, createPublicClient, PublicClient } from 'viem';
import { polygon } from 'viem/chains';

let sharedPublicClient: PublicClient | null = null;

export function createSharedPublicClient(): PublicClient {
  if (!sharedPublicClient) {
    const RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
    sharedPublicClient = createPublicClient({
      chain: polygon,
      transport: http(RPC_URL),
    });
  }
  return sharedPublicClient;
}

export function resetSharedPublicClient(): void {
  sharedPublicClient = null;
}