import pino from 'pino';
import type { WsEvent, WsMarketEvent, WsPriceChangeEvent, WsBestBidAskEvent, WsMarketResolvedEvent, WsBookEvent, WsEventHandler } from './types.js';

const logger = pino({ level: 'debug' });

export function logWsEvent(event: WsEvent): void {
  const base = { event_type: event.event_type, timestamp: Date.now() };

  switch (event.event_type) {
    case 'new_market':
      logger.info({
        ...base,
        marketId: event.market,
        question: event.question.substring(0, 60),
        assetsCount: event.assets_ids.length,
        outcomes: event.outcomes,
      }, 'New market detected via WebSocket');
      break;

    case 'price_change':
      for (const change of event.price_changes.slice(0, 3)) {
        logger.debug({
          ...base,
          assetId: change.asset_id,
          price: change.price,
          side: change.side,
          bestBid: change.best_bid,
          bestAsk: change.best_ask,
        }, 'Price change');
      }
      break;

    case 'best_bid_ask':
      logger.debug({
        ...base,
        assetId: event.asset_id,
        market: event.market,
        bestBid: event.best_bid,
        bestAsk: event.best_ask,
        spread: event.spread,
      }, 'Best bid/ask update');
      break;

    case 'market_resolved':
      logger.info({
        ...base,
        marketId: event.id,
        market: event.market,
        winningAssetId: event.winning_asset_id,
        winningOutcome: event.winning_outcome,
      }, 'Market resolved via WebSocket');
      break;

    case 'book':
      logger.debug({
        ...base,
        assetId: event.asset_id,
        market: event.market,
        bidsCount: event.bids.length,
        asksCount: event.asks.length,
        hash: event.hash,
      }, 'Order book update');
      break;

    default:
      logger.debug(base, 'Unknown WebSocket event type');
  }
}

export function extractEventSummary(event: WsEvent): string {
  switch (event.event_type) {
    case 'new_market':
      return `new_market: ${event.question.substring(0, 40)}...`;
    case 'price_change':
      return `price_change: ${event.price_changes.length} changes`;
    case 'best_bid_ask':
      return `best_bid_ask: bid=${event.best_bid} ask=${event.best_ask} spread=${event.spread}`;
    case 'market_resolved':
      return `market_resolved: ${event.winning_outcome}`;
    case 'book':
      return `book: ${event.bids.length}b/${event.asks.length}a`;
    default:
      return `unknown event`;
  }
}

export class EventRouter {
  private handlers: Map<string, WsEventHandler[]> = new Map();
  private wildcardHandlers: WsEventHandler[] = [];

  on(eventType: string, handler: WsEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  onAny(handler: WsEventHandler): void {
    this.wildcardHandlers.push(handler);
  }

  async route(event: WsEvent): Promise<void> {
    const eventType = event.event_type;

    // Route to specific handlers
    const handlers = this.handlers.get(eventType) || [];
    for (const handler of handlers) {
      await handler(event);
    }

    // Route to wildcard handlers
    for (const handler of this.wildcardHandlers) {
      await handler(event);
    }
  }

  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers = [];
  }
}

export function createEventRouter(): EventRouter {
  return new EventRouter();
}

export function isNewMarketEvent(event: WsEvent): event is WsMarketEvent {
  return event.event_type === 'new_market';
}

export function isPriceChangeEvent(event: WsEvent): event is WsPriceChangeEvent {
  return event.event_type === 'price_change';
}

export function isBestBidAskEvent(event: WsEvent): event is WsBestBidAskEvent {
  return event.event_type === 'best_bid_ask';
}

export function isMarketResolvedEvent(event: WsEvent): event is WsMarketResolvedEvent {
  return event.event_type === 'market_resolved';
}

export function isBookEvent(event: WsEvent): event is WsBookEvent {
  return event.event_type === 'book';
}
