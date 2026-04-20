// Market data from Gamma API
export interface Market {
  id: string;
  question: string;
  slug: string;
  categories: string[];
  clobTokenIds: [string, string]; // [yesTokenId, noTokenId]
  active: boolean;
  closed: boolean;
  resolveDate?: string; // ISO date for resolution
}

// Orderbook entry
export interface OrderBookEntry {
  price: number;
  size: number;
}

// Full orderbook
export interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

// Safety configuration from config.yaml
export interface SafetyConfig {
  maxPositionSizePct: number;  // e.g., 0.08 = 8%
  dailyLossLimitPct: number;   // e.g., 0.05 = 5%
  drawdownKillSwitchPct: number; // e.g., 0.15 = 15%
}

// Bot configuration
export interface Config {
  dryRun: boolean;
  safety: SafetyConfig;
  polymarket: {
    host: string;
    gammaHost: string;
    chainId: number;
  };
  logging: {
    level: string;
    pretty: boolean;
  };
  railway?: {
    healthCheckPath: string;
    selfPingEnabled: boolean;
  };
}

// Safety state tracking
export interface SafetyState {
  dailyLoss: number;
  totalDrawdown: number;
  isKillSwitchActive: boolean;
  lastTradeTime?: Date;
}

// Bet decision for logging
export interface BetDecision {
  marketId: string;
  odds: number;
  positionSize: number;
  side: 'BUY' | 'SELL';
  dryRun: boolean;
  safetyCheck: 'passed' | 'failed_max_position' | 'failed_daily_loss' | 'failed_drawdown';
  reason: string;
  timestamp: string;
}
