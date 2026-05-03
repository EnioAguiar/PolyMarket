import WebSocket from 'ws';
import { getLogger } from '../logging/index.js';
import { EventRouter } from './events.js';
import { SubscriptionManager } from './subscription.js';
import type { WsEvent, SubscriptionMessage, SubscriptionUpdate } from './types.js';

const POLYMARKET_WS_URL = 'wss://ws-subscriptions-clob.polymarket.com/ws/market';
const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const MAX_RECONNECT_ATTEMPTS = 10;

export class PolymarketWsClient {
  private ws: WebSocket | null = null;
  private router: EventRouter;
  private subscriptions: SubscriptionManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isIntentionallyClosed = false;
  private logger = getLogger();

  constructor(router: EventRouter, subscriptions: SubscriptionManager) {
    this.router = router;
    this.subscriptions = subscriptions;
  }

  async connect(): Promise<void> {
    this.isIntentionallyClosed = false;
    return this.establishConnection();
  }

  private async establishConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.info({ url: POLYMARKET_WS_URL }, 'Connecting to Polymarket WebSocket');

      this.ws = new WebSocket(POLYMARKET_WS_URL);

      const connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close();
          reject(new Error('Connection timeout'));
        }
      }, 10000);

      this.ws.on('open', () => {
        clearTimeout(connectionTimeout);
        this.logger.info({ msg: 'WebSocket connected' });
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.subscribe();
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        this.stopHeartbeat();
        if (!this.isIntentionallyClosed) {
          this.handleDisconnect();
        }
      });

      this.ws.on('error', (error: Error) => {
        this.logger.error({ error, msg: 'WebSocket error' });
        clearTimeout(connectionTimeout);
        reject(error);
      });
    });
  }

  private handleMessage(data: WebSocket.Data): void {
    try {
      const message = data.toString();

      // Ignore PONG responses
      if (message === 'PONG') {
        return;
      }

      const event = JSON.parse(message) as WsEvent;
      this.logger.info({
        eventType: event.event_type,
        market: (event as any).market || (event as any).id || 'unknown',
        assetId: (event as any).asset_id || (event as any).assets_ids?.[0] || 'none',
      }, 'Received WebSocket event');
      this.router.route(event);
    } catch (error) {
      this.logger.error({ error, msg: 'Failed to parse WebSocket message' });
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send('PING');
        this.logger.debug({ msg: 'Sent PING' });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn({ msg: 'Cannot subscribe - WebSocket not open' });
      return;
    }

    const message = this.subscriptions.getSubscriptionMessage();
    this.ws.send(JSON.stringify(message));
    this.logger.info({
      assetCount: this.subscriptions.count(),
      assets: this.subscriptions.getAll().slice(0, 5),
      subscriptionMsg: message,
    }, 'Sent subscription message');
  }

  updateSubscription(assetId: string, subscribe: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.logger.warn({ msg: 'Cannot update subscription - WebSocket not open' });
      return;
    }

    const update = this.subscriptions.getUpdateMessage(assetId, subscribe);
    this.ws.send(JSON.stringify(update));
    this.logger.info({ assetId, subscribe }, 'Sent subscription update');

    if (subscribe) {
      this.subscriptions.add(assetId);
    } else {
      this.subscriptions.remove(assetId);
    }
  }

  private async handleDisconnect(): Promise<void> {
    this.stopHeartbeat();

    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.logger.error({ msg: 'Max reconnection attempts reached, giving up' });
      return;
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY_MS
    );

    this.reconnectAttempts++;
    this.logger.info({ delay, attempt: this.reconnectAttempts }, 'Reconnecting in ms');

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.establishConnection();
    } catch (error) {
      this.logger.error({ error, msg: 'Reconnection failed' });
    }
  }

  close(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.logger.info({ msg: 'WebSocket closed intentionally' });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }
}

export function createPolymarketWsClient(
  router: EventRouter,
  subscriptions: SubscriptionManager
): PolymarketWsClient {
  return new PolymarketWsClient(router, subscriptions);
}
