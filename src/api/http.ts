import { http, createPublicClient, PublicClient } from 'viem';
import { polygon } from 'viem/chains';

let sharedPublicClient: PublicClient | null = null;

export function createSharedPublicClient(): PublicClient {
  if (!sharedPublicClient) {
    sharedPublicClient = createPublicClient({
      chain: polygon,
      transport: http(),
    });
  }
  return sharedPublicClient;
}

export function resetSharedPublicClient(): void {
  sharedPublicClient = null;
}