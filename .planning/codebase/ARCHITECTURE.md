# Architecture

**Analysis Date:** 2026-04-19

## Pattern Overview

**Overall:** Railway Cron-triggered TypeScript Bot with Safety-first Design

**Key Characteristics:**
- Single-execution bot cycle (Railway cron triggers, bot runs, exits)
- Safety-first architecture with dedicated SafetyModule
- Dry-run mode for testing without executing trades
- Health check server for Railway monitoring

## Layers

**Entry Point (src/index.ts):**
- Purpose: Bootstrap application, start health server, trigger bot cycle
- Location: `src/index.ts`
- Contains: HTTP health server, config loading, logger initialization, bot cycle execution
- Depends on: `src/config/index.js`, `src/logging/index.js`, `src/main.js`
- Used by: Railway cron (via `node --loader ts-node/esm src/index.ts`)

**Main Bot Logic (src/main.ts):**
- Purpose: Orchestrate market fetching, evaluation, and safety checks
- Location: `src/main.ts`
- Contains: `runBotCycle()` function, `evaluateMarket()` function
- Depends on: `src/api/polymarket.js`, `src/api/clob.js`, `src/safety/index.js`, `src/config/index.js`
- Used by: `src/index.js`

**API Layer (src/api/):**
- Purpose: External service integration
- Location: `src/api/polymarket.ts`, `src/api/clob.ts`
- Contains:
  - `polymarket.ts`: Gamma API client for market data
  - `clob.ts`: CLOB client for orderbook and trading
- Depends on: `@polymarket/clob-client-v2`, `ethers`
- Used by: `src/main.ts`

**Safety Module (src/safety/):**
- Purpose: Risk management and bet safety checks
- Location: `src/safety/index.ts` (coordinator), `src/safety/position-limits.ts`, `src/safety/daily-loss.ts`, `src/safety/drawdown.ts`
- Contains: Position size limits, daily loss tracking, drawdown kill switch
- Depends on: `src/types/index.js`, `src/config/index.js`
- Used by: `src/main.ts`

**Configuration (src/config/index.ts):**
- Purpose: Load and validate config.yaml
- Location: `src/config/index.ts`
- Contains: `loadConfig()`, `isDryRun()`
- Depends on: `config.yaml` file
- Used by: All modules

**Logging (src/logging/index.ts):**
- Purpose: Structured logging with Pino
- Location: `src/logging/index.ts`
- Contains: Logger initialization, structured bet decision logging
- Depends on: `pino`, `pino-pretty`
- Used by: All modules

**Types (src/types/index.ts):**
- Purpose: TypeScript type definitions
- Location: `src/types/index.ts`
- Contains: `Market`, `OrderBook`, `Config`, `SafetyState`, `BetDecision` interfaces
- Used by: All modules

## Data Flow

**Railway Cron Trigger Flow:**

1. Railway cron invokes `node --loader ts-node/esm src/index.ts`
2. `src/index.ts::main()` executes:
   ```
   loadConfig() → initLogger() → startServer() → runBotCycle()
   ```
3. Health server starts on port 3000 (for Railway health checks)
4. `runBotCycle()` executes:
   ```
   fetchMarkets() → for each market:
     getOrderBook() → evaluateMarket() → SafetyModule.checkBet() → logBetDecision()
   ```
5. Bot cycle completes, process exits with code 0
6. Railway skips next run if previous still executing

**Market Evaluation Flow:**

1. Fetch markets from Gamma API (5min-24h horizon)
2. For each market with YES token:
   - Fetch orderbook via CLOB API
   - Check liquidity threshold
   - Calculate mid-price (odds)
   - Compute max position size from SafetyModule
   - Run safety checks (position, daily loss, drawdown)
   - Log bet decision

## Key Abstractions

**SafetyModule (src/safety/index.ts):**
- Purpose: Centralized safety coordinator
- Examples: `SafetyModule.checkBet()`, `SafetyModule.getMaxPositionSizeForOdds()`
- Pattern: Class with composed trackers (DailyLossTracker, DrawdownTracker)

**ClobClient (src/api/clob.ts):**
- Purpose: Singleton CLOB client for trading
- Examples: `createClobClient()`, `getOrderBook()`
- Pattern: Singleton pattern with lazy initialization

## Entry Points

**Primary Entry:**
- Location: `src/index.ts`
- Triggers: Railway cron executing `node --loader ts-node/esm src/index.ts`
- Responsibilities: Bootstrap, config load, logger init, health server, bot cycle

**Health Check Endpoint:**
- Path: `/health` (GET)
- Returns: `{ status: 'healthy'|'initializing', timestamp, service }`
- Purpose: Railway health check for cron job monitoring

## Error Handling

**Strategy:** Fail-fast with structured logging

**Patterns:**
- Config validation throws on missing required fields (`config.yaml`)
- Logger must be initialized before use (throws if not)
- CLOB client throws if not initialized before use
- Bot cycle catches per-market errors and continues
- Fatal errors logged and cause `process.exit(1)`

## Cross-Cutting Concerns

**Logging:** Pino with structured JSON (pretty mode in dev)
**Validation:** Config schema enforced at startup
**Health:** HTTP server on port 3000 with `/health` endpoint
**Authentication:** Ethers wallet with PRIVATE_KEY env var for CLOB

## Railway Deployment

**Build:** Nixpacks with Node 20
**Deploy:** Single replica, restart on failure (max 3 retries)
**Health Check:** GET `/health` every 30s, timeout 5s, startup 30s
**Cron:** Triggers execution, bot must exit for next run

---

*Architecture analysis: 2026-04-19*
