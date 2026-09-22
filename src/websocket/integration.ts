import type { WsMarketEvent, WsBestBidAskEvent, WsMarketResolvedEvent } from './types.js';
import type { Config, SafetyState, OrderBook } from '../types/index.js';
import type { CycleManager } from '../betting/index.js';
import { SafetyModule } from '../safety/index.js';
import { logBetDecision } from '../logging/index.js';
import { getOrderBook, getMidPrice, hasLiquidity, placeMarketOrder, getPUSDBalance } from '../api/clob.js';
import { checkSlippage } from '../execution/index.js';
import { notifyBetPlaced, notifyError, updateBotStatus } from '../api/telegram.js';
import pino from 'pino';

const oddsCache = new Map<string, { bid: number; ask: number; timestamp: number }>();
const TEST_EXECUTION = process.env.TEST_EXECUTION === 'true';

export function updateOddsFromWs(assetId: string, bid: number, ask: number): void {
  oddsCache.set(assetId, { bid, ask, timestamp: Date.now() });
}

export function getCachedOdds(assetId: string): { bid: number; ask: number } | null {
  const cached = oddsCache.get(assetId);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > 60000) {
    oddsCache.delete(assetId);
    return null;
  }

  return { bid: cached.bid, ask: cached.ask };
}

export async function evaluateMarketForWebSocket(
  event: WsMarketEvent,
  safetyModule: SafetyModule,
  clobClient: unknown,
  config: Config,
  cycleManager: CycleManager,
  logger: pino.Logger
): Promise<void> {
  let betPlaced = false;
  try {
    if (!event.assets_ids || event.assets_ids.length === 0) {
      logger.debug({ marketId: event.market }, 'No asset IDs in market event');
      return;
    }

    const yesTokenId = event.assets_ids[0];
    if (!yesTokenId) return;

    if (TEST_EXECUTION) {
      logger.warn({ marketId: event.market, msg: 'TEST MODE - execution disabled' });
      logBetDecision({
        marketId: event.market,
        odds: 0,
        positionSize: 0,
        dryRun: true,
        action: 'monitor',
        safetyCheck: 'none',
        reason: 'TEST_EXECUTION mode - would place order but disabled',
      });
      return;
    }

    let orderbook: OrderBook;
    try {
      orderbook = await getOrderBook(yesTokenId);
    } catch (error) {
      logger.error({ marketId: event.market, error }, 'Failed to fetch orderbook');
      notifyError(`Orderbook fetch failed for ${event.market}: ${error}`);
      return;
    }

    updateBotStatus({ marketsProcessed: 1 });

    if (!hasLiquidity(orderbook, 1)) {
      logger.debug({ marketId: event.market }, 'Insufficient liquidity');
      return;
    }

    const odds = getMidPrice(orderbook);
    if (odds === null) {
      logger.debug({ marketId: event.market }, 'Could not calculate mid-price');
      return;
    }

    const expectedPrice = odds;
    const maxPosition = safetyModule.getMaxPositionSizeForOdds(odds);

    const safetyResult = safetyModule.checkBet({ odds, positionSize: maxPosition });
    if (!safetyResult.passed) {
      logger.info(
        { marketId: event.market, reason: safetyResult.message, odds, maxPosition },
        'Safety check failed, skipping bet'
      );
      logBetDecision({
        marketId: event.market,
        odds,
        positionSize: maxPosition,
        dryRun: config.dryRun,
        action: 'skip',
        safetyCheck: safetyResult.checkType,
        reason: safetyResult.message ?? 'Safety check failed',
      });
      return;
    }

    const currentPrice = odds;
    const slippageResult = checkSlippage({ expectedPrice, executionPrice: currentPrice }, 0.10);
    if (!slippageResult.allowed) {
      logger.warn(
        { marketId: event.market, slippage: slippageResult.slippagePct, reason: slippageResult.reason },
        'Slippage exceeded - aborting bet'
      );
      logBetDecision({
        marketId: event.market,
        odds,
        positionSize: maxPosition,
        dryRun: config.dryRun,
        action: 'skip',
        safetyCheck: 'slippage',
        reason: slippageResult.reason,
      });
      return;
    }

    logger.info(
      {
        marketId: event.market,
        question: event.question?.substring(0, 60),
        odds,
        maxPosition,
        dryRun: config.dryRun,
      },
      'Bet decision from WebSocket event'
    );

    if (config.dryRun) {
      logBetDecision({
        marketId: event.market,
        odds,
        positionSize: maxPosition,
        dryRun: true,
        action: 'monitor',
        safetyCheck: 'passed',
        reason: 'Event-driven evaluation from WebSocket new_market event',
      });
      return;
    }

    const execResult = await placeMarketOrder(yesTokenId, 'BUY', maxPosition);

    if (execResult.success) {
      // The market's mutex was already acquired by the caller before this function
      // ran (src/index.ts's handleWsEvent). cycleManager.addBet() re-acquires the
      // same mutex internally as part of tracking the pending bet, so release it
      // first here (synchronously, no await in between) to hand ownership over
      // rather than have that internal acquire() spuriously fail because the lock
      // is already held.
      cycleManager.releaseMarket(event.market);
      const addedBet = cycleManager.addBet({
        marketId: event.market,
        assetId: yesTokenId,
        side: 'YES',
        odds,
        size: maxPosition,
      });

      if (addedBet) {
        betPlaced = true;
      } else {
        // Real money was already spent on this order, but the cycle rejected
        // tracking it (e.g. it closed concurrently after this evaluation started).
        // Keep the market locked out rather than silently allow it to be bet on
        // again while this position is untracked.
        cycleManager.acquireMarket(event.market);
        betPlaced = true;
        logger.error(
          { marketId: event.market },
          'Order succeeded but addBet() rejected it (cycle no longer accepting bets) - market locked out manually, needs reconciliation'
        );
      }

      updateBotStatus({ betsPlaced: 1 });
      logger.info({
        marketId: event.market,
        positionSize: maxPosition,
        executedPrice: execResult.executedPrice,
        txHash: execResult.txHash,
        orderID: execResult.orderID,
      }, 'Order confirmed');

      notifyBetPlaced({
        marketId: event.market,
        positionSize: maxPosition,
        odds,
        executedPrice: execResult.executedPrice,
        txHash: execResult.txHash,
        orderID: execResult.orderID,
      });
    } else {
      logger.error({ marketId: event.market, reason: execResult.reason }, 'Order failed');
    }

    logBetDecision({
      marketId: event.market,
      odds,
      positionSize: maxPosition,
      dryRun: false,
      action: execResult.success ? 'bet' : 'skip',
      safetyCheck: 'passed',
      reason: execResult.success
        ? `Order confirmed: ${execResult.reason}`
        : `Execution failed: ${execResult.reason}`,
    });
  } finally {
    if (!betPlaced) {
      cycleManager.releaseMarket(event.market);
    }
  }
}

export async function handleMarketResolved(
  marketId: string,
  winningOutcome: string,
  cycleManager: CycleManager,
  safetyModule: SafetyModule,
  logger: pino.Logger
): Promise<void> {
  const bets = cycleManager.getPendingBets().filter((b) => b.marketId === marketId);
  if (bets.length === 0) {
    logger.debug({ marketId }, 'Market resolved, no pending bet for it (never bet, or already resolved)');
    return;
  }
  const bet = bets[0];
  const won = bet.side === winningOutcome;
  // Binary market: a winning YES/NO share pays $1, a losing share pays $0.
  // pnl is relative to the bet's own cost (size = $ staked at time of bet).
  const payout = won ? bet.size / bet.odds : 0;
  const pnl = payout - bet.size;

  cycleManager.resolveBet(marketId, winningOutcome, pnl);

  const newBalance = await getPUSDBalance();
  safetyModule.recordTrade(pnl, newBalance);

  logger.info({ marketId, winningOutcome, won, pnl, newBalance }, 'Market resolution recorded, safety state updated');
}

export function handleBestBidAskUpdate(
  event: WsBestBidAskEvent,
  logger: pino.Logger
): void {
  updateOddsFromWs(event.asset_id, parseFloat(event.best_bid), parseFloat(event.best_ask));
  logger.debug({
    assetId: event.asset_id,
    market: event.market,
    bestBid: event.best_bid,
    bestAsk: event.best_ask,
    spread: event.spread,
  }, 'Odds cache updated from WebSocket');
}
