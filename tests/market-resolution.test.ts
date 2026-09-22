import { describe, it, expect, vi, beforeAll } from 'vitest';
import { DailyLossTracker } from '../src/safety/daily-loss.js';
import { createCycleManager } from '../src/betting/index.js';
import type { SafetyState } from '../src/types/index.js';
import type { SafetyModule } from '../src/safety/index.js';
import type { WsMarketEvent } from '../src/websocket/types.js';
import type { Config, OrderBook } from '../src/types/index.js';
import pino from 'pino';

vi.mock('../src/api/clob.js', () => ({
  getOrderBook: vi.fn(),
  getMidPrice: vi.fn(),
  hasLiquidity: vi.fn(),
  placeMarketOrder: vi.fn(),
  getPUSDBalance: vi.fn(),
}));

import { getOrderBook, getMidPrice, hasLiquidity, getPUSDBalance, placeMarketOrder } from '../src/api/clob.js';
import { initLogger } from '../src/logging/index.js';
import { evaluateMarketForWebSocket, handleMarketResolved } from '../src/websocket/integration.js';

const silentLogger = pino({ level: 'silent' });

beforeAll(() => {
  // logBetDecision() (hit on the safety-check-failed path) calls getLogger()
  // internally, which throws unless initLogger() has run first.
  initLogger({ logging: { level: 'silent', pretty: false } } as Config);
});

function makeSafetyModuleConfig() {
  return { maxPositionSizePct: 0.08, dailyLossLimitPct: 0.05, drawdownKillSwitchPct: 0.15, isDryRun: false };
}

function makeSafetyState(): SafetyState {
  return { dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false };
}

describe('DailyLossTracker sign fix', () => {
  it('recordLoss() past the limit makes checkDailyLoss() fail (positive dailyLoss cannot trip a negative threshold otherwise)', () => {
    const bankroll = 1000;
    const tracker = new DailyLossTracker(makeSafetyModuleConfig(), makeSafetyState());

    // dailyLossLimitPct 0.05 * 1000 = 50 limit; lose 60 to exceed it.
    tracker.recordLoss(60);

    const result = tracker.checkDailyLoss(bankroll);
    expect(result.passed).toBe(false);
    expect(tracker.getDailyLoss()).toBe(-60);
  });

  it('recordGain() reduces dailyLoss toward zero by the gain amount, not flooring it to zero outright', () => {
    const tracker = new DailyLossTracker(makeSafetyModuleConfig(), makeSafetyState());

    tracker.recordLoss(60); // dailyLoss = -60
    tracker.recordGain(20); // should move to -40, not 0

    expect(tracker.getDailyLoss()).toBe(-40);
  });

  it('recordGain() floors at zero when the gain exceeds the accumulated loss', () => {
    const tracker = new DailyLossTracker(makeSafetyModuleConfig(), makeSafetyState());

    tracker.recordLoss(10); // dailyLoss = -10
    tracker.recordGain(50); // would be +40, floored to 0

    expect(tracker.getDailyLoss()).toBe(0);
  });
});

describe('handleMarketResolved PnL computation', () => {
  it('computes a positive PnL for a won bet and calls resolveBet() + recordTrade()', async () => {
    const cycleManager = createCycleManager();
    cycleManager.addBet({ marketId: 'm1', assetId: 'a1', side: 'YES', odds: 0.5, size: 100 });

    const recordTrade = vi.fn();
    const fakeSafetyModule = { recordTrade } as unknown as SafetyModule;
    vi.mocked(getPUSDBalance).mockResolvedValue(1234);

    await handleMarketResolved('m1', 'YES', cycleManager, fakeSafetyModule, silentLogger);

    // size / odds - size = 100 / 0.5 - 100 = 100
    expect(recordTrade).toHaveBeenCalledWith(100, 1234);
    expect(cycleManager.getPendingBets()).toHaveLength(0);
    expect(cycleManager.isMarketLocked('m1')).toBe(false);
  });

  it('computes a negative PnL (-size) for a lost bet', async () => {
    const cycleManager = createCycleManager();
    cycleManager.addBet({ marketId: 'm2', assetId: 'a2', side: 'YES', odds: 0.5, size: 100 });

    const recordTrade = vi.fn();
    const fakeSafetyModule = { recordTrade } as unknown as SafetyModule;
    vi.mocked(getPUSDBalance).mockResolvedValue(500);

    await handleMarketResolved('m2', 'NO', cycleManager, fakeSafetyModule, silentLogger);

    expect(recordTrade).toHaveBeenCalledWith(-100, 500);
  });

  it('is a no-op when there is no pending bet for the resolved market', async () => {
    const cycleManager = createCycleManager();
    const resolveBetSpy = vi.spyOn(cycleManager, 'resolveBet');
    const recordTrade = vi.fn();
    const fakeSafetyModule = { recordTrade } as unknown as SafetyModule;

    await handleMarketResolved('does-not-exist', 'YES', cycleManager, fakeSafetyModule, silentLogger);

    expect(resolveBetSpy).not.toHaveBeenCalled();
    expect(recordTrade).not.toHaveBeenCalled();
  });
});

describe('evaluateMarketForWebSocket mutex release on early-return paths', () => {
  function makeEvent(marketId: string): WsMarketEvent {
    return {
      event_type: 'new_market',
      id: marketId,
      question: 'Will X happen?',
      market: marketId,
      slug: marketId,
      assets_ids: ['yes-token'],
      outcomes: ['Yes', 'No'],
      timestamp: '0',
    };
  }

  function makeConfig(): Config {
    return {
      dryRun: false,
      safety: { maxPositionSizePct: 0.08, dailyLossLimitPct: 0.05, drawdownKillSwitchPct: 0.15, bankrollUsagePct: 0.5 },
      polymarket: { host: 'h', gammaHost: 'g', chainId: 137 },
      logging: { level: 'silent', pretty: false },
    };
  }

  function makeFakeSafetyModule(checkBetResult: { passed: boolean; checkType: 'position'; message?: string }) {
    return {
      getMaxPositionSizeForOdds: vi.fn().mockReturnValue(10),
      checkBet: vi.fn().mockReturnValue(checkBetResult),
    } as unknown as SafetyModule;
  }

  it('releases the mutex when the orderbook has insufficient liquidity', async () => {
    const cycleManager = createCycleManager();
    const marketId = 'liquidity-market';
    cycleManager.acquireMarket(marketId);
    expect(cycleManager.isMarketLocked(marketId)).toBe(true);

    vi.mocked(getOrderBook).mockResolvedValue({ bids: [], asks: [] } as OrderBook);
    vi.mocked(hasLiquidity).mockReturnValue(false);

    const safetyModule = makeFakeSafetyModule({ passed: true, checkType: 'position' });

    await evaluateMarketForWebSocket(
      makeEvent(marketId),
      safetyModule,
      {},
      makeConfig(),
      cycleManager,
      silentLogger
    );

    expect(cycleManager.isMarketLocked(marketId)).toBe(false);
  });

  it('releases the mutex when the safety check fails', async () => {
    const cycleManager = createCycleManager();
    const marketId = 'safety-market';
    cycleManager.acquireMarket(marketId);
    expect(cycleManager.isMarketLocked(marketId)).toBe(true);

    vi.mocked(getOrderBook).mockResolvedValue({
      bids: [{ price: 0.4, size: 100 }],
      asks: [{ price: 0.6, size: 100 }],
    } as OrderBook);
    vi.mocked(hasLiquidity).mockReturnValue(true);
    vi.mocked(getMidPrice).mockReturnValue(0.5);

    const safetyModule = makeFakeSafetyModule({ passed: false, checkType: 'position', message: 'exceeds max position' });

    await evaluateMarketForWebSocket(
      makeEvent(marketId),
      safetyModule,
      {},
      makeConfig(),
      cycleManager,
      silentLogger
    );

    expect(cycleManager.isMarketLocked(marketId)).toBe(false);
  });
});

describe('evaluateMarketForWebSocket success path (mutex handoff into addBet())', () => {
  it('keeps the market locked and tracks a pending bet after a successful order, even though the caller pre-acquired the same mutex', async () => {
    // Regression guard: CycleManager.addBet() re-acquires the market mutex
    // internally. Since src/index.ts's handleWsEvent already acquires that
    // same mutex before calling evaluateMarketForWebSocket, addBet()'s own
    // acquire() would always fail (market already locked) without an explicit
    // release immediately before calling addBet() — silently discarding every
    // real trade result and leaking the lock forever, exactly the original bug.
    const cycleManager = createCycleManager();
    const marketId = 'success-market';
    cycleManager.acquireMarket(marketId); // simulates index.ts's pre-acquire
    expect(cycleManager.isMarketLocked(marketId)).toBe(true);

    vi.mocked(getOrderBook).mockResolvedValue({
      bids: [{ price: 0.4, size: 100 }],
      asks: [{ price: 0.6, size: 100 }],
    } as OrderBook);
    vi.mocked(hasLiquidity).mockReturnValue(true);
    vi.mocked(getMidPrice).mockReturnValue(0.5);
    vi.mocked(placeMarketOrder).mockResolvedValue({
      success: true,
      orderID: 'order-1',
      txHash: '0xabc',
      executedPrice: 0.5,
      reason: 'ok',
    });

    const safetyModule = {
      getMaxPositionSizeForOdds: vi.fn().mockReturnValue(10),
      checkBet: vi.fn().mockReturnValue({ passed: true, checkType: 'position' }),
    } as unknown as SafetyModule;

    const config: Config = {
      dryRun: false,
      safety: { maxPositionSizePct: 0.08, dailyLossLimitPct: 0.05, drawdownKillSwitchPct: 0.15, bankrollUsagePct: 0.5 },
      polymarket: { host: 'h', gammaHost: 'g', chainId: 137 },
      logging: { level: 'silent', pretty: false },
    };

    const event: WsMarketEvent = {
      event_type: 'new_market',
      id: marketId,
      question: 'Q',
      market: marketId,
      slug: marketId,
      assets_ids: ['yes-token'],
      outcomes: ['Yes', 'No'],
      timestamp: '0',
    };

    await evaluateMarketForWebSocket(event, safetyModule, {}, config, cycleManager, silentLogger);

    expect(cycleManager.isMarketLocked(marketId)).toBe(true);
    const pending = cycleManager.getPendingBets().filter((b) => b.marketId === marketId);
    expect(pending).toHaveLength(1);
    expect(pending[0].size).toBe(10);
  });
});
