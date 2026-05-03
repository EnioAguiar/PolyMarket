import { loadConfig, isDryRun } from './config/index.js';
import { initLogger, getLogger, logBetDecision } from './logging/index.js';
import { fetchMarkets, filterByCategory, filterByTimeHorizon, getYesTokenId } from './api/polymarket.js';
import { getOrderBook, getMidPrice, createClobClient, hasLiquidity, getUSDCBalance } from './api/clob.js';
import { SafetyModule } from './safety/index.js';
import type { Market, SafetyState } from './types/index.js';

export async function runBotCycle(): Promise<void> {
  const logger = getLogger();
  const config = loadConfig();
  
  logger.info({ dryRun: config.dryRun }, 'Bot cycle starting');
  
  let clobClient = null;
  let effectiveBankroll = 1000;
  if (!config.dryRun) {
    clobClient = await createClobClient(config);
    const realBalance = await getUSDCBalance();
    effectiveBankroll = realBalance * config.safety.bankrollUsagePct;
    logger.info({ realBalance, effectiveBankroll }, 'Wallet balance loaded');
  }
  
  const initialState: SafetyState = {
    dailyLoss: 0,
    totalDrawdown: 0,
    isKillSwitchActive: false,
  };
  const safetyModule = new SafetyModule(config, initialState, effectiveBankroll);
  
  if (safetyModule.isKillSwitchActive()) {
    logger.warn({ msg: 'KILL SWITCH ACTIVE - bot halted' });
    return;
  }
  
  logger.info({ step: 'monitor' }, 'Fetching markets from Polymarket');
  
  // Calculate date range for 5min to 24h from now
  const now = new Date();
  const minDate = new Date(now.getTime() + 5 * 60 * 1000);  // 5 min from now
  const maxDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h from now
  
  const allMarkets = await fetchMarkets({ 
    limit: 100,
    minEndDate: minDate,
    maxEndDate: maxDate,
  });
  console.log('[DEBUG] Total markets fetched:', allMarkets.length);
  
  // API already filters by date, no need for extra time filter
  const filteredByTime = allMarkets;
  console.log('[DEBUG] Markets after API date filter:', filteredByTime.length);
  console.log('[DEBUG] Sample markets:', filteredByTime.slice(0,3).map(m => ({ question: m.question?.substring(0, 60), resolveDate: m.resolveDate })));
  
  logger.info({ 
    totalMarkets: allMarkets.length,
    filteredByTime: filteredByTime.length,
  }, 'Markets filtered');
  
  if (filteredByTime.length === 0) {
    logger.info({ msg: 'No markets match criteria, skipping cycle' });
    return;
  }
  
  logger.info({ step: 'analyze' }, 'Analyzing markets');
  
  for (const market of filteredByTime) {
    const yesTokenId = getYesTokenId(market);
    if (!yesTokenId) continue;
    
    if (safetyModule.isKillSwitchActive()) {
      logger.warn({ marketId: market.id, msg: 'Kill switch activated mid-cycle, halting' });
      break;
    }
    
    try {
      const decision = await evaluateMarket(market, safetyModule, config);
      
      logBetDecision({
        marketId: market.id,
        odds: decision.odds,
        positionSize: decision.positionSize,
        dryRun: config.dryRun,
        action: decision.action,
        safetyCheck: decision.safetyCheck,
        reason: decision.reason,
      });
    } catch (error) {
      logger.error({ marketId: market.id, error }, 'Error processing market');
    }
  }
  
  logger.info({ step: 'complete' }, 'Bot cycle complete');
}

async function evaluateMarket(
  market: Market,
  safetyModule: SafetyModule,
  config: ReturnType<typeof loadConfig>
): Promise<{
  odds: number;
  positionSize: number;
  action: 'monitor' | 'analyze' | 'bet' | 'skip';
  safetyCheck: string;
  reason: string;
}> {
  const logger = getLogger();
  const yesTokenId = getYesTokenId(market);
  
  if (!yesTokenId) {
    return {
      odds: 0,
      positionSize: 0,
      action: 'skip',
      safetyCheck: 'none',
      reason: 'No YES token ID',
    };
  }
  
  let orderbook;
  try {
    orderbook = await getOrderBook(yesTokenId);
  } catch (error) {
    return {
      odds: 0,
      positionSize: 0,
      action: 'skip',
      safetyCheck: 'none',
      reason: `Failed to fetch orderbook: ${error}`,
    };
  }
  
  if (!hasLiquidity(orderbook, 1)) {
    return {
      odds: 0,
      positionSize: 0,
      action: 'skip',
      safetyCheck: 'none',
      reason: 'Insufficient liquidity',
    };
  }
  
  const odds = getMidPrice(orderbook);
  if (odds === null) {
    return {
      odds: 0,
      positionSize: 0,
      action: 'skip',
      safetyCheck: 'none',
      reason: 'No mid-price available',
    };
  }
  
  const maxPosition = safetyModule.getMaxPositionSizeForOdds(odds);
  
  const safetyResult = safetyModule.checkBet({
    odds,
    positionSize: maxPosition,
  });
  
  if (!safetyResult.passed) {
    return {
      odds,
      positionSize: maxPosition,
      action: 'skip',
      safetyCheck: safetyResult.checkType,
      reason: safetyResult.message || 'Safety check failed',
    };
  }
  
  return {
    odds,
    positionSize: maxPosition,
    action: 'monitor',
    safetyCheck: 'passed',
    reason: 'Phase 1 - monitoring only, no execution',
  };
}
