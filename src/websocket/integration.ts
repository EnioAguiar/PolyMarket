import type { WsMarketEvent, WsBestBidAskEvent, WsMarketResolvedEvent } from './types.js';
import type { Config, SafetyState, OrderBook } from '../types/index.js';
import { SafetyModule } from '../safety/index.js';
import { logBetDecision } from '../logging/index.js';
import { getOrderBook, getMidPrice, hasLiquidity } from '../api/clob.js';
import pino from 'pino';

const oddsCache = new Map<string, { bid: number; ask: number; timestamp: number }>();

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

  const minMs = 5 * 60 * 1000;
  const maxMs = 24 * 60 * 60 * 1000;

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

  const bankroll = 1000;
  const maxPosition = safetyModule.getMaxPositionSizeForOdds(odds);

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

  logBetDecision({
    marketId: event.market,
    odds,
    positionSize: maxPosition,
    dryRun: config.dryRun,
    action: config.dryRun ? 'monitor' : 'bet',
    safetyCheck: 'passed',
    reason: 'Event-driven evaluation from WebSocket new_market event',
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
