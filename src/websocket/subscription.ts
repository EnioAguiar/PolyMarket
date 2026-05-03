import type { SubscriptionMessage, SubscriptionUpdate } from './types.js';
import pino from 'pino';

const logger = pino({ level: 'debug' });

export class SubscriptionManager {
  private subscribedAssets: Set<string> = new Set();
  private customFeatureEnabled: boolean;

  constructor(customFeatureEnabled = true) {
    this.customFeatureEnabled = customFeatureEnabled;
  }

  getSubscriptionMessage(): SubscriptionMessage {
    return {
      assets_ids: [...this.subscribedAssets],
      type: 'market',
      custom_feature_enabled: this.customFeatureEnabled,
      initial_dump: true,
      level: 2,
    };
  }

  getUpdateMessage(assetId: string, subscribe: boolean): SubscriptionUpdate {
    return {
      assets_ids: [assetId],
      operation: subscribe ? 'subscribe' : 'unsubscribe',
      custom_feature_enabled: this.customFeatureEnabled,
    };
  }

  add(assetId: string): void {
    this.subscribedAssets.add(assetId);
    logger.debug({ assetId, total: this.subscribedAssets.size }, 'Subscription added');
  }

  remove(assetId: string): void {
    this.subscribedAssets.delete(assetId);
    logger.debug({ assetId, total: this.subscribedAssets.size }, 'Subscription removed');
  }

  has(assetId: string): boolean {
    return this.subscribedAssets.has(assetId);
  }

  getAll(): string[] {
    return [...this.subscribedAssets];
  }

  clear(): void {
    this.subscribedAssets.clear();
    logger.debug({ msg: 'All subscriptions cleared' });
  }

  count(): number {
    return this.subscribedAssets.size;
  }
}
