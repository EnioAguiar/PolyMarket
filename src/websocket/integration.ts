import type { WsMarketEvent, WsBestBidAskEvent, WsMarketResolvedEvent } from './types.js';
import type { Config, SafetyState, OrderBook } from '../types/index.js';
import { SafetyModule } from '../safety/index.js';
import { logBetDecision } from '../logging/index.js';
import { getOrderBook, getMidPrice, hasLiquidity, placeMarketOrder } from '../api/clob.js';
import { checkSlippage } from '../execution/index.js';
import { notifyBetPlaced } from '../api/telegram.js';
import pino from 'pino';

const oddsCache = new Map<string, { bid: number; ask: number; timestamp: number }>();
const TEST_EXECUTION = process.env.TEST_EXECUTION === 'true';
const MIN_BET_AMOUNT = 5;

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
  clobClient: any,
  config: Config,
  logger: pino.Logger
): Promise<void> {
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
    return;
  }

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
  const bankroll = 1000;
  const maxPosition = safetyModule.getMaxPositionSizeForOdds(odds);

  if (maxPosition < MIN_BET_AMOUNT) {
    logger.info({ marketId: event.market, maxPosition, minBet: MIN_BET_AMOUNT }, 'Position size below minimum');
    return;
  }

  const safetyResult = safetyModule.checkBet({ odds, positionSize: maxPosition, bankroll });
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
}

export function handleMarketResolved(
  marketId: string,
  winningOutcome: string,
  logger: pino.Logger
): void {
  logger.info({ marketId, winningOutcome }, 'Recording market resolution');
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
