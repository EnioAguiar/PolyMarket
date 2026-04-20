export interface WsMessage {
  event_type: string;
  [key: string]: unknown;
}

export interface WsMarketEvent {
  event_type: 'new_market';
  id: string;
  question: string;
  market: string;
  slug: string;
  assets_ids: string[];
  outcomes: string[];
  timestamp: string;
  tags?: string[];
  active?: boolean;
}

export interface WsPriceChangeEvent {
  event_type: 'price_change';
  market: string;
  price_changes: Array<{
    asset_id: string;
    price: string;
    size: string;
    side: 'BUY' | 'SELL';
    hash: string;
    best_bid?: string;
    best_ask?: string;
  }>;
  timestamp: string;
}

export interface WsBestBidAskEvent {
  event_type: 'best_bid_ask';
  market: string;
  asset_id: string;
  best_bid: string;
  best_ask: string;
  spread: string;
  timestamp: string;
}

export interface WsMarketResolvedEvent {
  event_type: 'market_resolved';
  id: string;
  market: string;
  assets_ids: string[];
  winning_asset_id: string;
  winning_outcome: string;
  timestamp: string;
}

export interface WsBookEvent {
  event_type: 'book';
  asset_id: string;
  market: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: string;
  hash: string;
}

export type WsEvent = WsMarketEvent | WsPriceChangeEvent | WsBestBidAskEvent | WsMarketResolvedEvent | WsBookEvent;

export interface SubscriptionMessage {
  assets_ids: string[];
  type: 'market';
  custom_feature_enabled?: boolean;
  initial_dump?: boolean;
  level?: number;
}

export interface SubscriptionUpdate {
  assets_ids: string[];
  operation: 'subscribe' | 'unsubscribe';
  custom_feature_enabled?: boolean;
}

export type WsEventHandler = (event: WsEvent) => void | Promise<void>;
