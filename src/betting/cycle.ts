import pino from 'pino';
import type { Bet, CycleState, CycleStatus, BettingConfig, BetCycleStats } from './types.js';
import { MarketMutex } from './mutex.js';

const logger = pino({ level: 'info' });

const DEFAULT_CONFIG: BettingConfig = {
  maxBetsPerCycle: 3,
  cycleWait24hMs: 24 * 60 * 60 * 1000,
};

export class CycleManager {
  private state: CycleState;
  private config: BettingConfig;
  private mutex: MarketMutex;

  constructor(config: Partial<BettingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mutex = new MarketMutex();
    this.state = this.createInitialState();
  }

  private createInitialState(): CycleState {
    return {
      status: 'open',
      bets: [],
      openedAt: null,
      closedAt: null,
      lastBetResolvedAt: null,
      waiting24hSince: null,
    };
  }

  canAcceptBet(): boolean {
    if (this.state.status === 'waiting_24h') {
      if (this.hasWaited24h()) {
        this.resetCycle();
        return true;
      }
      return false;
    }
    if (this.state.status === 'closed') {
      return false;
    }
    if (this.state.bets.length >= this.config.maxBetsPerCycle) {
      return false;
    }
    return true;
  }

  private hasWaited24h(): boolean {
    if (!this.state.waiting24hSince) return false;
    return Date.now() - this.state.waiting24hSince.getTime() >= this.config.cycleWait24hMs;
  }

  addBet(betInput: Omit<Bet, 'startedAt' | 'status'>): Bet | null {
    if (!this.canAcceptBet()) {
      logger.info({ marketId: betInput.marketId }, 'Cannot accept bet: cycle not open');
      return null;
    }

    if (!this.mutex.acquire(betInput.marketId)) {
      logger.info({ marketId: betInput.marketId }, 'Cannot accept bet: market already locked');
      return null;
    }

    const bet: Bet = {
      ...betInput,
      startedAt: new Date(),
      status: 'pending',
    };

    this.state.bets.push(bet);

    if (this.state.openedAt === null) {
      this.state.openedAt = new Date();
    }

    if (this.state.bets.length >= this.config.maxBetsPerCycle) {
      this.state.status = 'closed';
      this.state.closedAt = new Date();
      logger.info({
        betCount: this.state.bets.length,
        status: this.state.status,
      }, 'Cycle closed: max bets reached');
    }

    logger.info({
      marketId: bet.marketId,
      odds: bet.odds,
      size: bet.size,
      status: this.state.status,
      betsInCycle: this.state.bets.length,
    }, 'Bet added to cycle');

    return bet;
  }

  resolveBet(marketId: string, winningOutcome: string, pnl: number): boolean {
    const bet = this.state.bets.find(b => b.marketId === marketId);
    if (!bet) {
      logger.warn({ marketId }, 'Cannot resolve: bet not found in cycle');
      return false;
    }

    bet.status = 'resolved';
    bet.resolvedAt = new Date();
    bet.winningOutcome = winningOutcome;
    bet.pnl = pnl;

    this.mutex.release(marketId);
    this.state.lastBetResolvedAt = new Date();

    logger.info({
      marketId,
      pnl,
      winningOutcome,
      betsResolved: this.state.bets.filter(b => b.status === 'resolved').length,
      betsTotal: this.state.bets.length,
    }, 'Bet resolved');

    this.checkCycleTransition();
    return true;
  }

  private checkCycleTransition(): void {
    const pendingBets = this.state.bets.filter(b => b.status === 'pending');

    if (this.state.status === 'waiting_24h') {
      if (this.hasWaited24h()) {
        this.resetCycle();
        logger.info({ msg: 'Cycle reset after 24h wait' });
      }
      return;
    }

    if (this.state.status === 'closed' && pendingBets.length === 0) {
      this.state.status = 'waiting_24h';
      this.state.waiting24hSince = new Date();
      logger.info({
        waitingSince: this.state.waiting24hSince,
      }, 'All bets resolved, waiting 24h before new cycle');
    }
  }

  resetCycle(): void {
    this.state = this.createInitialState();
    logger.info({ msg: 'Cycle reset to open' });
  }

  getState(): CycleState {
    if (this.state.status === 'waiting_24h' && this.hasWaited24h()) {
      return { ...this.createInitialState() };
    }
    return { ...this.state };
  }

  isMarketLocked(marketId: string): boolean {
    return this.mutex.isLocked(marketId);
  }

  acquireMarket(marketId: string): boolean {
    return this.mutex.acquire(marketId);
  }

  releaseMarket(marketId: string): void {
    this.mutex.release(marketId);
  }

  getPendingBets(): Bet[] {
    return this.state.bets.filter(b => b.status === 'pending');
  }

  getStats(): BetCycleStats {
    const resolvedBets = this.state.bets.filter(b => b.status === 'resolved');
    const totalPnl = resolvedBets.reduce((sum, b) => sum + (b.pnl || 0), 0);

    let timeInCycleMs: number | null = null;
    let timeUntil24hMs: number | null = null;

    if (this.state.openedAt) {
      timeInCycleMs = Date.now() - this.state.openedAt.getTime();
    }

    if (this.state.waiting24hSince) {
      timeUntil24hMs = this.config.cycleWait24hMs - (Date.now() - this.state.waiting24hSince.getTime());
    }

    return {
      status: this.state.status,
      betsTotal: this.state.bets.length,
      betsPending: this.state.bets.filter(b => b.status === 'pending').length,
      betsResolved: resolvedBets.length,
      totalPnl,
      lockedMarkets: this.mutex.getLockCount(),
      timeInCycleMs,
      timeUntil24hMs,
    };
  }
}

export function createCycleManager(config?: Partial<BettingConfig>): CycleManager {
  return new CycleManager(config);
}
