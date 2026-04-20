# Codebase Structure

**Analysis Date:** 2026-04-19

## Directory Layout

```
polymarket/
├── src/
│   ├── index.ts              # Entry point
│   ├── main.ts               # Bot cycle logic
│   ├── api/                  # External API clients
│   ├── ai/                   # AI estimation
│   ├── bankroll/             # Position sizing
│   ├── config/               # Configuration loading
│   ├── db/                   # Database (Drizzle + SQLite)
│   ├── execution/            # Order execution
│   ├── logging/              # Pino logger
│   ├── research/             # Source adapters & aggregation
│   ├── safety/               # Risk management
│   └── types/                # TypeScript types
├── tests/                    # Vitest unit tests
├── config.yaml               # Runtime configuration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── railway.json              # Railway deployment config
└── .planning/codebase/       # This documentation
```

## Directory Purposes

**`src/`** - Core TypeScript source code (ESM, Node 20+)

**`src/api/`** - External API clients:
- `polymarket.ts` - Gamma API (market listing)
- `clob.ts` - CLOB client (orderbooks, trading)

**`src/ai/`** - AI estimation:
- `chain.ts` - AIChain orchestrator
- `minimax.ts` - MiniMax 2 API integration
- `validation.ts` - Estimate validation

**`src/bankroll/`** - Bankroll management:
- `index.ts` - Entry point, exports
- `position-sizing.ts` - Kelly criterion sizing
- `exposure-caps.ts` - Category exposure limits
- `types.ts` - Bankroll type definitions

**`src/config/`** - Configuration:
- `index.ts` - `loadConfig()` from config.yaml
- `research.ts` - Research source configuration

**`src/db/`** - Database:
- `index.ts` - Drizzle client singleton
- `schema.ts` - Table definitions (sourceRatings, sourceFeeds, researchResults)
- `push.ts` - (Not read)

**`src/execution/`** - Order execution:
- `index.ts` - Barrel exports
- `limit-orders.ts` - Limit/market order placement
- `slippage.ts` - Slippage validation
- `arbitrage.ts` - Arbitrage detection

**`src/logging/`** - Logging:
- `index.ts` - Pino logger initialization and helpers

**`src/research/`** - Research system:
- `interface.ts` - ResearchSource, ResearchSignal, AggregatedResearch interfaces
- `aggregator.ts` - ResearchAggregator (parallel source fetching)
- `binance.ts` - BinanceAdapter (WebSocket)
- `google.ts` - GoogleAdapter (REST API)
- `chain.ts` - (Not read)
- `confidence.ts` - BayesianScorer for weighted confidence
- `types.ts` - (Not read)

**`src/safety/`** - Risk management:
- `index.ts` - SafetyModule class
- `position-limits.ts` - Max position size check (BANK-01)
- `daily-loss.ts` - Daily loss tracker (BANK-02)
- `drawdown.ts` - Drawdown tracker/kill switch (BANK-03)
- `types.ts` - Safety type definitions

**`src/types/`** - TypeScript types:
- `index.ts` - Market, OrderBook, Config, SafetyState, BetDecision
- `source.ts` - SourceCategory, FeedType, star ratings
- `ai.ts` - AIRequest, AIEstimate, ChainOfThoughtEntry

**`tests/`** - Vitest unit tests:
- `slippage.test.ts`
- `position-sizing.test.ts`
- `arbitrage.test.ts`

## Key File Locations

**Entry Points:**
- `src/index.ts` - Primary entry, creates HTTP server for health checks
- `src/main.ts` - `runBotCycle()` function

**Configuration:**
- `config.yaml` - Runtime configuration (dryRun, safety limits, API hosts)

**Core Logic:**
- `src/main.ts` - Bot cycle orchestration
- `src/safety/index.ts` - SafetyModule class
- `src/api/polymarket.ts` - Market fetching
- `src/api/clob.ts` - Orderbook retrieval

**Database:**
- `src/db/schema.ts` - Drizzle schema definitions

## Where to Add New Code

**New API Source:**
- Create `src/research/{name}.ts` implementing `ResearchSource` interface
- Add to `ResearchAggregator` in `src/research/aggregator.ts`

**New Safety Check:**
- Add to `src/safety/` directory
- Import in `SafetyModule` (`src/safety/index.ts`)

**New Market Category:**
- Add to `SourceCategory` enum in `src/types/source.ts`
- Configure rating/minSources in `config/research.ts`

**New Test:**
- Add to `tests/` directory with `.test.ts` suffix
- Run with `npm test`

## Module Dependencies

```
src/index.ts
  └── src/main.ts
        ├── src/config/index.ts
        ├── src/logging/index.ts
        ├── src/api/polymarket.ts
        ├── src/api/clob.ts
        └── src/safety/index.ts
              ├── src/safety/position-limits.ts
              ├── src/safety/daily-loss.ts
              └── src/safety/drawdown.ts

src/research/aggregator.ts
  ├── src/research/binance.ts
  └── src/research/google.ts

src/ai/chain.ts
  ├── src/ai/minimax.ts
  └── src/ai/validation.ts
```

## Configuration Files

**`package.json`** - Dependencies and scripts:
- Runtime: `@polymarket/clob-client-v2`, `ethers`, `pino`, `ws`, `yaml`
- Dev: `typescript`, `vitest`, `eslint`, `drizzle-orm`, `better-sqlite3`

**`tsconfig.json`** - TypeScript configuration:
- Target: ES2022, Module: ESNext
- Strict mode enabled
- Output: `./dist`

**`railway.json`** - Railway deployment:
- Health check on `/health`
- Node 20 runtime
- Restart on failure (max 3)

---

*Structure analysis: 2026-04-19*
