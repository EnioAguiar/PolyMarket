# Architecture

**Analysis Date:** 2026-04-19

## Pattern Overview

**Overall:** Railway Cron + Event-Driven Research Pipeline

**Key Characteristics:**
- Railway cron triggers execution on 5-minute intervals
- Single-pass market analysis with safety-gated decisions
- Research aggregation with Bayesian confidence scoring
- Dry-run mode by default (no actual trading)

## Execution Model (Railway Cron)

```
Railway Cron Trigger (every 5 min)
    │
    ▼
src/index.ts: main()
    │
    ├── loadConfig()          ← Load config.yaml
    ├── initLogger()          ← Initialize Pino logger
    │
    ▼
src/main.ts: runBotCycle()
    │
    ├── createClobClient()    ← (skip if dryRun)
    ├── SafetyModule          ← Kill switch check
    │
    ├── fetchMarkets()        ← Gamma API (5min-24h markets)
    │
    ▼
For Each Market:
    │
    ├── getOrderBook()        ← CLOB API
    ├── getMidPrice()         ← Calculate odds
    ├── hasLiquidity()        ← Minimum size check
    │
    ├── SafetyModule.checkBet()   ← Position/drawdown checks
    │
    └── logBetDecision()      ← Structured logging
```

**Railway Configuration** (`railway.json`):
- Health check: `GET /health` on port 3000
- Restart policy: `ON_FAILURE` (max 3 retries)
- Builder: `NIXPACKS` with Node 20

## Layers

**Entry Point (`src/index.ts`):**
- Purpose: Initialize bot, start health server, trigger cycle
- Location: `src/index.ts`
- Creates HTTP server for Railway health checks
- Calls `runBotCycle()` and exits with code

**Bot Logic (`src/main.ts`):**
- Purpose: Orchestrate single bot cycle
- Location: `src/main.ts`
- Fetches markets, evaluates each, logs decisions
- Currently in **monitor-only mode** (Phase 1)

**API Layer (`src/api/`):**
- `polymarket.ts` - Gamma API for market listing
- `clob.ts` - CLOB client for orderbooks and trading
- Both use native `fetch` for HTTP requests

**Safety Layer (`src/safety/`):**
- Purpose: Risk management and kill switches
- Components:
  - `position-limits.ts` - Max bet size (BANK-01)
  - `daily-loss.ts` - Daily loss limit (BANK-02)
  - `drawdown.ts` - Kill switch on 15% drawdown (BANK-03)
- Entry: `src/safety/index.ts` - `SafetyModule` class

**Research Layer (`src/research/`):**
- Purpose: Gather signals from external sources
- `interface.ts` - `ResearchSource`, `ResearchSignal`, `AggregatedResearch`
- `aggregator.ts` - `ResearchAggregator` class (parallel fetch)
- Sources: `binance.ts` (WebSocket), `google.ts` (REST API)
- `confidence.ts` - `BayesianScorer` for weighted confidence

**AI Layer (`src/ai/`):**
- Purpose: Estimate probability from research signals
- `chain.ts` - `AIChain` orchestrator
- `minimax.ts` - `MiniMaxAI` (MiniMax 2 model)
- `validation.ts` - Estimate validation

**Bankroll Layer (`src/bankroll/`):**
- Purpose: Position sizing and exposure tracking
- Entry: `src/bankroll/index.ts` - `BankrollModule`
- `position-sizing.ts` - Kelly criterion calculations
- `exposure-caps.ts` - Per-category exposure limits

**Execution Layer (`src/execution/`):**
- Purpose: Order placement and slippage checks
- `limit-orders.ts` - Limit order with market fallback
- `slippage.ts` - Slippage validation
- `arbitrage.ts` - Cross-exchange arbitrage detection

**Logging (`src/logging/index.ts`):**
- Pino logger with `pino-pretty` transport
- Structured bet decisions via `logBetDecision()`
- `logSafetyCheck()` for safety events

**Database (`src/db/`):**
- Drizzle ORM + SQLite (`better-sqlite3`)
- Schema: `sourceRatings`, `sourceFeeds`, `researchResults`
- Path: `process.env.DATA_DIR || ./data/sources.db`

**Types (`src/types/`):**
- `index.ts` - Market, OrderBook, Config, SafetyState
- `source.ts` - SourceCategory, FeedType, MIN_SOURCES=10
- `ai.ts` - AIRequest, AIEstimate, ChainOfThoughtEntry

## Data Flow

**Market Fetching:**
```
Gamma API → fetchMarkets() → Market[]
```

**Odds Extraction:**
```
CLOB API → getOrderBook() → OrderBook → getMidPrice() → odds
```

**Bet Decision:**
```
Market + OrderBook + SafetyModule
    ↓
evaluateMarket() → { action, odds, positionSize, safetyCheck }
    ↓
logBetDecision() → Pino structured log
```

**Research Pipeline (not yet integrated in main cycle):**
```
Market.question → ResearchAggregator
    ↓
[BinanceAdapter, GoogleAdapter, ...] (parallel)
    ↓
BayesianScorer → AggregatedResearch
    ↓
AIChain.run() → AIEstimate
    ↓
AIValidator.validate() → validation result
```

## Error Handling

**Strategy:** Fail-safe with graceful degradation

**Patterns:**
- Kill switch halts all trading on drawdown threshold
- Dry-run mode skips actual trading
- Individual market failures don't halt cycle
- All errors logged with full context

## Cross-Cutting Concerns

**Logging:** Pino (JSON in prod, pretty in dev)
**Configuration:** `config.yaml` via `loadConfig()`
**Health Checks:** HTTP server on `/health`
**Type Safety:** TypeScript strict mode

---

*Architecture analysis: 2026-04-19*
