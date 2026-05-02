# Codebase Structure

**Analysis Date:** 2026-05-02

## Directory Layout

```
polymarket/
├── src/                    # Main TypeScript source
│   ├── index.ts            # Event-driven entry (WebSocket)
│   ├── main.ts             # Cron polling entry
│   ├── test-apis.ts        # API testing utility
│   ├── api/                # Polymarket API clients
│   ├── ai/                 # AI inference (MiniMax)
│   ├── bankroll/           # Position sizing
│   ├── betting/            # Cycle management, mutex
│   ├── config/             # YAML config loading
│   ├── db/                 # SQLite/Drizzle persistence
│   ├── execution/          # Order placement, slippage
│   ├── logging/            # Pino logger setup
│   ├── research/           # Source aggregation, confidence
│   ├── safety/             # Kill switch, position limits
│   ├── types/              # Shared TypeScript types
│   └── websocket/          # WS client, events, subscriptions
├── tests/                  # Test files
│   └── research/           # Unit tests
├── scripts/                # Python data scripts
│   └── crawl4ai_*.py        # Web crawling scripts
├── data/                   # SQLite database location
├── dist/                   # Compiled JavaScript output
├── .planning/              # GSD planning artifacts
├── package.json            # Node dependencies
└── config.yaml             # Bot configuration
```

## Directory Purposes

**src/ai/**
- Purpose: AI inference and validation
- Contains: MiniMaxAI, AIChain, AIValidator, confidence scoring
- Key files: `minimax.ts`, `chain.ts`, `validation.ts`

**src/api/**
- Purpose: External API clients for Polymarket
- Contains: Gamma API (market discovery), CLOB client (orderbook, trading)
- Key files: `polymarket.ts`, `clob.ts`

**src/bankroll/**
- Purpose: Position sizing and exposure tracking
- Contains: BankrollModule, exposure caps, position sizing calculations
- Key files: `index.ts`, `position-sizing.ts`, `exposure-caps.ts`

**src/betting/**
- Purpose: Betting cycle state machine
- Contains: CycleManager, MarketMutex, Bet types
- Key files: `cycle.ts`, `mutex.ts`, `types.ts`

**src/config/**
- Purpose: YAML configuration loading
- Contains: Config schema validation
- Key files: `index.ts`

**src/db/**
- Purpose: SQLite persistence via Drizzle ORM
- Contains: Database connection, schema definitions
- Key files: `index.ts`, `schema.ts`, `push.ts`

**src/execution/**
- Purpose: Order placement and market analysis
- Contains: Limit orders, slippage calculation, arbitrage detection
- Key files: `limit-orders.ts`, `slippage.ts`, `arbitrage.ts`

**src/logging/**
- Purpose: Structured logging with Pino
- Contains: Logger initialization, structured helpers
- Key files: `index.ts`

**src/research/**
- Purpose: Research source aggregation and confidence scoring
- Contains: ResearchAggregator, BayesianScorer, source implementations
- Key files: `aggregator.ts`, `confidence.ts`, `interface.ts`, `google.ts`, `binance.ts`, `twitter.ts`, `reddit.ts`

**src/safety/**
- Purpose: Risk management and kill switches
- Contains: SafetyModule, DailyLossTracker, DrawdownTracker
- Key files: `index.ts`, `daily-loss.ts`, `drawdown.ts`, `position-limits.ts`

**src/types/**
- Purpose: Shared TypeScript type definitions
- Contains: Market, OrderBook, Config, SafetyState interfaces
- Key files: `index.ts`, `ai.ts`, `source.ts`

**src/websocket/**
- Purpose: Polymarket WebSocket client
- Contains: WS client, event routing, subscription management
- Key files: `client.ts`, `events.ts`, `subscription.ts`, `integration.ts`

## Key File Locations

**Entry Points:**
- `src/index.ts`: Event-driven WebSocket mode (primary for production)
- `src/main.ts`: Cron polling mode (fallback/development)

**Configuration:**
- `config.yaml`: YAML config with safety, polymarket, logging sections
- `src/config/index.ts`: Config loading and validation

**Core Logic:**
- `src/safety/index.ts`: SafetyModule coordinating all safety checks
- `src/betting/cycle.ts`: CycleManager for bet cycle state
- `src/research/aggregator.ts`: ResearchAggregator parallel fetching
- `src/ai/chain.ts`: AIChain orchestrating estimate generation

**Testing:**
- `tests/research/social.test.ts`: Research source tests
- `tests/position-sizing.test.ts`, `tests/slippage.test.ts`, `tests/arbitrage.test.ts`: Strategy tests

## Naming Conventions

**Files:**
- Modules: `index.ts` for barrel exports, descriptive name for implementation
- Types: `types.ts` for exported interfaces
- Tests: `*.test.ts` pattern

**Directories:**
- Lowercase kebab: `src/websocket/`, `src/bankroll/`
- Singular noun for feature dirs: `src/ai/`, `src/api/`

## Where to Add New Code

**New Research Source:**
- Create in `src/research/[source-name].ts`
- Implement `ResearchSource` interface from `src/research/interface.ts`
- Export from `src/research/` barrel
- Primary location: `src/research/`

**New API Integration:**
- Create in `src/api/[name].ts`
- Follow pattern of `polymarket.ts` (fetch wrapper) or `clob.ts` (client wrapper)
- Primary location: `src/api/`

**New Safety Check:**
- Create in `src/safety/[check-name].ts`
- Implement check returning `{ passed: boolean, checkType: string, message?: string }`
- Register in `src/safety/index.ts` SafetyModule constructor

**New Betting Strategy:**
- Create in `src/execution/[strategy].ts`
- Add to `src/execution/index.ts` barrel
- Primary location: `src/execution/`

**New AI Model:**
- Create in `src/ai/[model].ts`
- Implement estimate generation following `MiniMaxAI` pattern
- Register in `src/ai/chain.ts`

## Special Directories

**src/websocket/:**
- Purpose: WebSocket client management
- Generated: No
- Committed: Yes

**src/db/:**
- Purpose: SQLite database via better-sqlite3 + Drizzle
- Generated: No (runtime creation)
- Committed: Yes

**scripts/ (Python):**
- Purpose: Crawl4ai web crawling scripts
- Generated: No
- Committed: Yes

**dist/:**
- Purpose: Compiled TypeScript output
- Generated: Yes (via `npm run build`)
- Committed: No (.gitignore)

**data/:**
- Purpose: SQLite database file location
- Generated: Yes (runtime)
- Committed: No (.gitignore)

---

*Structure analysis: 2026-05-02*