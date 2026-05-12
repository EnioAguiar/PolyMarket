# Directory Structure

## Root

```
polymarket/
├── src/                    # TypeScript source
├── tests/                  # Vitest test files
├── dist/                   # Compiled output (gitignored)
├── data/                   # SQLite DB files (runtime)
├── scripts/                # Utility scripts
├── config.yaml             # Primary bot configuration (NOT secrets)
├── .env                    # Secrets: PRIVATE_KEY, API keys (gitignored)
├── .env.example            # Template for required env vars
├── package.json            # Node deps, scripts (build/start/dev/test/lint)
├── tsconfig.json           # TypeScript config (ESM, node20+)
├── docker-compose.yml      # Local Docker setup
├── railpack.json           # Railway build config
├── railway.json            # Railway deploy config
├── requirements.txt        # Python deps (for crawl4ai research source)
└── start.sh                # Production start script
```

## src/ — Source Modules

```
src/
├── index.ts                # PRIMARY ENTRY POINT — event-driven bot loop
├── main.ts                 # Legacy polling-mode bot cycle (not primary entry)
├── test-apis.ts            # Manual API smoke-test script
│
├── config/
│   ├── index.ts            # loadConfig() — reads config.yaml via yaml lib
│   └── research.ts         # Research-specific config (unused)
│
├── types/
│   ├── index.ts            # Core interfaces: Market, Config, SafetyState, OrderBook, BetDecision
│   ├── ai.ts               # AI/research type interfaces
│   └── source.ts           # Research source type interfaces
│
├── logging/
│   └── index.ts            # initLogger(), getLogger(), logBetDecision(), logSafetyCheck()
│
├── api/
│   ├── clob.ts             # ClobClient init, placeMarketOrder, placeLimitOrder, getOrderBook, getUSDCBalance
│   ├── http.ts             # createSharedPublicClient() — viem Polygon RPC client
│   ├── polymarket.ts       # fetchMarkets() — Gamma REST API for market listing
│   └── telegram.ts         # Telegram bot: notifications, pause/resume control, status updates
│
├── websocket/
│   ├── client.ts           # PolymarketWsClient — connect, heartbeat, reconnect
│   ├── events.ts           # EventRouter, logWsEvent()
│   ├── integration.ts      # evaluateMarketForWebSocket(), handleBestBidAskUpdate(), oddsCache
│   ├── subscription.ts     # SubscriptionManager — track subscribed asset IDs
│   └── types.ts            # WsEvent union type and subtypes
│
├── safety/
│   ├── index.ts            # SafetyModule class — checkBet(), recordTrade(), isKillSwitchActive()
│   ├── position-limits.ts  # checkPositionSize(), getMaxPositionSize() (BANK-01)
│   ├── daily-loss.ts       # DailyLossTracker (BANK-02)
│   ├── drawdown.ts         # DrawdownTracker, kill switch (BANK-03)
│   └── types.ts            # SafetyCheckResult, SafetyModuleConfig, BetCheckInput
│
├── betting/
│   ├── index.ts            # createCycleManager() factory, re-exports CycleManager
│   ├── cycle.ts            # CycleManager — open/closed/waiting_24h state machine
│   ├── mutex.ts            # MarketMutex — prevents concurrent processing of same market
│   └── types.ts            # Bet, CycleState, CycleStatus, BettingConfig, BetCycleStats
│
├── execution/
│   ├── index.ts            # Re-exports: checkSlippage, checkArbitrage, placeMarketOrder, placeLimitOrder
│   ├── slippage.ts         # checkSlippage() — 10% max tolerance
│   ├── arbitrage.ts        # checkArbitrage(), calculateArbitrageProfit()
│   └── limit-orders.ts     # Limit order utilities
│
├── db/
│   ├── index.ts            # Drizzle SQLite client init
│   ├── push.ts             # Schema migration script
│   └── schema.ts           # sourceRatings, sourceFeeds, researchResults tables
│
├── bankroll/
│   ├── index.ts            # Bankroll management exports
│   ├── position-sizing.ts  # Kelly-based position sizing
│   ├── exposure-caps.ts    # Per-market/total exposure limits
│   └── types.ts            # Bankroll-specific types
│
├── research/               # Multi-source market research (not wired to main flow)
│   ├── aggregator.ts       # ResearchAggregator — combines all sources
│   ├── interface.ts        # ResearchSource base interface
│   ├── types.ts            # ResearchSignal, ResearchResult types
│   ├── binance.ts          # Binance price feed
│   ├── chain.ts            # Research chain orchestration
│   ├── confidence.ts       # Confidence scoring
│   ├── crawl4ai.ts         # Web scraping via crawl4ai
│   ├── crawl4ai_search.ts  # Crawl4AI search integration
│   ├── google.ts           # Google search
│   ├── newsdata.ts         # NewsData.io API
│   ├── reddit.ts           # Reddit API
│   ├── twitter.ts          # Twitter/X API v2
│   └── sources/
│       ├── base.ts         # Base source class
│       ├── coingecko.ts    # CoinGecko price data
│       ├── football.ts     # Football/sports data
│       └── index.ts        # Source registry
│
└── ai/
    ├── chain.ts            # AI estimation chain (MiniMax)
    ├── minimax.ts          # MiniMax API client
    └── validation.ts       # AI output validation
```

## tests/

```
tests/
├── arbitrage.test.ts       # checkArbitrage(), calculateArbitrageProfit()
├── position-sizing.test.ts # Bankroll position sizing
├── slippage.test.ts        # checkSlippage()
└── research/
    └── social.test.ts      # Social research source tests
```

## Where to Add New Code

- **New safety rule:** add tracker in `src/safety/`, wire into `SafetyModule.checkBet()`
- **New market filter:** modify `evaluateMarketForWebSocket()` in `src/websocket/integration.ts`
- **New order type:** add to `src/api/clob.ts`, re-export from `src/execution/index.ts`
- **New research source:** implement `ResearchSource` interface from `src/research/interface.ts`, register in `src/research/sources/index.ts`
- **New WS event handler:** register in EventRouter in `src/index.ts`, add handler in `src/websocket/integration.ts`
