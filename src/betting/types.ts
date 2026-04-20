export interface Bet {
  marketId: string;
  assetId: string;
  side: 'YES' | 'NO';
  odds: number;
  size: number;
  status: 'pending' | 'resolved' | 'failed';
  startedAt: Date;
  resolvedAt?: Date;
  winningOutcome?: string;
  pnl?: number;
}

export type CycleStatus = 'open' | 'closed' | 'waiting_24h';

export interface CycleState {
  status: CycleStatus;
  bets: Bet[];
  openedAt: Date | null;
  closedAt: Date | null;
  lastBetResolvedAt: Date | null;
  waiting24hSince: Date | null;
}

export interface BettingConfig {
  maxBetsPerCycle: number;
  cycleWait24hMs: number;
}

export interface BetCycleStats {
  status: CycleStatus;
  betsTotal: number;
  betsPending: number;
  betsResolved: number;
  totalPnl: number;
  lockedMarkets: number;
  timeInCycleMs: number | null;
  timeUntil24hMs: number | null;
}
