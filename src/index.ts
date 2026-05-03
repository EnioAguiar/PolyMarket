import http from 'http';
import { loadConfig } from './config/index.js';
import { initLogger, getLogger } from './logging/index.js';
import { PolymarketWsClient, createPolymarketWsClient } from './websocket/client.js';
import { EventRouter } from './websocket/events.js';
import { SubscriptionManager } from './websocket/subscription.js';
import type { WsEvent, WsMarketEvent, WsBestBidAskEvent, WsMarketResolvedEvent } from './websocket/types.js';
import { logWsEvent } from './websocket/events.js';
import { evaluateMarketForWebSocket, handleBestBidAskUpdate, handleMarketResolved } from './websocket/integration.js';
import type { Config, SafetyState } from './types/index.js';
import { SafetyModule } from './safety/index.js';
import { createClobClient } from './api/clob.js';
import { createCycleManager } from './betting/index.js';
import type { CycleManager } from './betting/index.js';
import { initTelegram, isBotPaused, setCycleManager, setSafetyModule, setBankroll, stopTelegram } from './api/telegram.js';

let isHealthy = false;
let wsClient: PolymarketWsClient | null = null;
let safetyModule: SafetyModule | null = null;
let clobClient: any = null;
let cycleManager: CycleManager | null = null;
let config: Config;

function healthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
  if (req.url === '/health' && req.method === 'GET') {
    const cycleStats = cycleManager?.getStats();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: isHealthy ? 'healthy' : 'initializing',
      timestamp: new Date().toISOString(),
      service: 'polymarket-bot',
      wsConnected: wsClient?.isConnected() ?? false,
      cycle: cycleStats ? {
        status: cycleStats.status,
        betsTotal: cycleStats.betsTotal,
        betsPending: cycleStats.betsPending,
        betsResolved: cycleStats.betsResolved,
      } : null,
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

function startServer(): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer(healthCheck);
    const port = process.env.PORT || 3000;

    server.listen(port, () => {
      getLogger().info({ port, msg: 'Health check server started' });
      resolve(server);
    });
  });
}

function setupGracefulShutdown(): void {
  const logger = getLogger();

  process.on('SIGINT', () => {
    logger.info({ msg: 'SIGINT received, shutting down gracefully' });
    stopTelegram();
    wsClient?.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info({ msg: 'SIGTERM received, shutting down gracefully' });
    stopTelegram();
    wsClient?.close();
    process.exit(0);
  });
}

function handleWsEvent(event: WsEvent, logger: ReturnType<typeof getLogger>): void {
  switch (event.event_type) {
    case 'new_market': {
      if (isBotPaused()) {
        logger.debug({ marketId: (event as WsMarketEvent).market }, 'Bot is paused, ignoring new_market');
        return;
      }
      if (!cycleManager?.canAcceptBet()) {
        logger.info({ marketId: (event as WsMarketEvent).market }, 'Cycle not accepting bets');
        return;
      }
      if (!cycleManager?.acquireMarket((event as WsMarketEvent).market)) {
        logger.debug({ marketId: (event as WsMarketEvent).market }, 'Market already being processed');
        return;
      }
      if (safetyModule && clobClient) {
        evaluateMarketForWebSocket(
          event as WsMarketEvent,
          safetyModule,
          clobClient,
          config,
          logger
        );
      }
      break;
    }

    case 'best_bid_ask':
      handleBestBidAskUpdate(event as WsBestBidAskEvent, logger);
      break;

    case 'market_resolved': {
      const resolvedEvent = event as WsMarketResolvedEvent;
      cycleManager?.resolveBet(resolvedEvent.market, resolvedEvent.winning_outcome, 0);
      handleMarketResolved(resolvedEvent.market, resolvedEvent.winning_outcome, logger);
      break;
    }

    case 'price_change':
    case 'book':
      break;

    default:
      logger.debug({ eventType: (event as any).event_type }, 'Unhandled event type');
  }
}

async function main(): Promise<void> {
  config = loadConfig();
  initLogger(config);
  const logger = getLogger();

  logger.info({
    dryRun: config.dryRun,
    msg: 'Polymarket Bot starting (event-driven mode)',
  });

  try {
    await startServer();

    cycleManager = createCycleManager({
      maxBetsPerCycle: 3,
      cycleWait24hMs: 24 * 60 * 60 * 1000,
    });

    const initialState: SafetyState = {
      dailyLoss: 0,
      totalDrawdown: 0,
      isKillSwitchActive: false,
    };
    const initialBankroll = 1000;
    safetyModule = new SafetyModule(config, initialState, initialBankroll);

    setSafetyModule(safetyModule);
    setCycleManager(cycleManager);

    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    if (telegramBotToken) {
      initTelegram({ botToken: telegramBotToken });
      logger.info({ msg: 'Telegram bot enabled' });
    } else {
      logger.info({ msg: 'Telegram bot disabled (no token)' });
    }

    if (!config.dryRun) {
      clobClient = await createClobClient(config);
    }

    const router = new EventRouter();
    const subscriptions = new SubscriptionManager(true);

    router.on('new_market', (event: WsEvent) => {
      logWsEvent(event);
      handleWsEvent(event, logger);
    });

    router.on('best_bid_ask', (event: WsEvent) => {
      handleWsEvent(event, logger);
    });

    router.on('market_resolved', (event: WsEvent) => {
      handleWsEvent(event, logger);
    });

    router.on('price_change', (event: WsEvent) => {
      logWsEvent(event);
    });

    router.on('book', (event: WsEvent) => {
      logWsEvent(event);
    });

    wsClient = createPolymarketWsClient(router, subscriptions);

    logger.info({ msg: 'Connecting to Polymarket WebSocket...' });
    await wsClient.connect();

    isHealthy = true;
    logger.info({ msg: 'Bot running continuously, press Ctrl+C to stop' });

  } catch (error) {
    logger.error({ error, msg: 'Fatal error in bot startup' });
    isHealthy = false;
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

setupGracefulShutdown();

export { main, healthCheck, startServer };
