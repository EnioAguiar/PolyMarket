export interface Market {
    id: string;
    question: string;
    slug: string;
    categories: string[];
    clobTokenIds: [string, string];
    active: boolean;
    closed: boolean;
    resolveDate?: string;
}
export interface OrderBookEntry {
    price: number;
    size: number;
}
export interface OrderBook {
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
}
export interface SafetyConfig {
    maxPositionSizePct: number;
    dailyLossLimitPct: number;
    drawdownKillSwitchPct: number;
}
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
export interface SafetyState {
    dailyLoss: number;
    totalDrawdown: number;
    isKillSwitchActive: boolean;
    lastTradeTime?: Date;
}
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
//# sourceMappingURL=index.d.ts.map