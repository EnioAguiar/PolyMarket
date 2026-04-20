# Codebase Structure

**Analysis Date:** 2026-04-19

## Directory Layout

```
polymarket/
├── src/                      # TypeScript source code
│   ├── api/                  # External API clients
│   ├── config/               # Configuration loading
│   ├── logging/              # Pino logger setup
│   ├── safety/               # Safety module components
│   ├── types/                # TypeScript type definitions
│   ├── index.ts              # Entry point
│   └── main.ts               # Main bot cycle logic
├── .planning/                # GSD planning artifacts
├── config.yaml               # Runtime configuration
├── railway.json              # Railway deployment config
├── package.json             # NPM dependencies
├── tsconfig.json             # TypeScript config
└── .env.example              # Environment template
```

## Directory Purposes

**src/:**
- Purpose: All TypeScript source code
- Contains: Entry point, main logic, API clients, safety module, types

**src/api/:**
- Purpose: External API integrations
- Contains: `polymarket.ts` (Gamma API), `clob.ts` (CLOB trading)
- Key patterns: Fetch-based HTTP calls, CLOB client wrapper

**src/config/:**
- Purpose: Configuration loading from YAML
- Contains: `index.ts` with `loadConfig()` function
- Key patterns: YAML parsing with `yaml` package

**src/logging/:**
- Purpose: Structured logging setup
- Contains: `index.ts` with Pino logger initialization
- Key patterns: Singleton logger, structured bet decision logs

**src/safety/:**
- Purpose: Risk management and safety checks
- Contains: SafetyModule coordinator, position limits, daily loss, drawdown trackers
- Key patterns: Composed tracker classes, per-check results

**src/types/:**
- Purpose: TypeScript type definitions
- Contains: Interfaces for Market, OrderBook, Config, SafetyState, BetDecision
- Key patterns: Shared type definitions exported for all modules

**.planning/:**
- Purpose: GSD workflow planning artifacts (not deployed)
- Contains: Phases, requirements, research documents

## Key File Locations

**Entry Points:**
- `src/index.ts`: Application bootstrap, health server, bot cycle trigger
- `src/main.ts`: Main `runBotCycle()` and `evaluateMarket()` functions

**Configuration:**
- `config.yaml`: Runtime config (dryRun, safety limits, Polymarket hosts, logging)
- `railway.json`: Railway deployment (build, deploy, health check settings)
- `package.json`: Dependencies and npm scripts

**Core Logic:**
- `src/main.ts`: `runBotCycle()`, `evaluateMarket()` - market fetching and evaluation
- `src/safety/index.ts`: `SafetyModule` class - safety check coordinator
- `src/safety/position-limits.ts`: `checkPositionSize()`, `getMaxPositionSize()`
- `src/safety/daily-loss.ts`: `DailyLossTracker` class
- `src/safety/drawdown.ts`: `DrawdownTracker` class

**API Clients:**
- `src/api/polymarket.ts`: `fetchMarkets()`, `filterByCategory()`, `getYesTokenId()`
- `src/api/clob.ts`: `createClobClient()`, `getOrderBook()`, `getMidPrice()`, `hasLiquidity()`

**Types:**
- `src/types/index.ts`: All TypeScript interfaces

**Logging:**
- `src/logging/index.ts`: `initLogger()`, `getLogger()`, `logBetDecision()`

## Naming Conventions

**Files:**
- TypeScript files: `kebab-case.ts` or `camelCase.ts`
- Config files: `kebab-case.yaml` or `camelCase.json`

**Directories:**
- TypeScript source: No enforced convention (using `api/`, `config/`, `safety/`, `types/`)

**Functions:**
- CamelCase: `loadConfig`, `runBotCycle`, `fetchMarkets`, `getOrderBook`

**Classes:**
- PascalCase: `SafetyModule`, `DailyLossTracker`, `DrawdownTracker`

**Interfaces:**
- PascalCase: `Market`, `OrderBook`, `Config`, `SafetyState`, `BetDecision`

## Where to Add New Code

**New API Client:**
- Primary: `src/api/new-service.ts`
- Export from: `src/api/index.ts` (if barrel file needed)
- Types: Add to `src/types/index.ts`

**New Safety Check:**
- Primary: `src/safety/new-check.ts`
- Integrate in: `src/safety/index.ts` SafetyModule class
- Types: Add to `src/safety/types.ts`

**New Market Evaluation Logic:**
- Primary: Add to `src/main.ts` `evaluateMarket()` function
- Or refactor to: `src/evaluation/` module if complexity grows

**Utilities:**
- Shared helpers: Consider `src/utils/` if needed
- Currently: No utils directory, logic co-located with usage

## Special Directories

**src/api/:**
- Purpose: API client modules
- Generated: No
- Committed: Yes

**src/safety/:**
- Purpose: Safety module with sub-trackers
- Generated: No
- Committed: Yes

**.planning/:**
- Purpose: GSD workflow planning
- Generated: Yes (by GSD workflow)
- Committed: Yes

## File Dependencies

```
src/index.ts
├── src/config/index.ts
├── src/logging/index.ts
└── src/main.ts
    ├── src/config/index.ts
    ├── src/logging/index.ts
    ├── src/api/polymarket.ts
    ├── src/api/clob.ts
    ├── src/safety/index.ts
    │   ├── src/config/index.ts
    │   ├── src/safety/position-limits.ts
    │   ├── src/safety/daily-loss.ts
    │   └── src/safety/drawdown.ts
    └── src/types/index.ts
```

## Configuration Flow

1. `config.yaml` contains all runtime settings
2. `src/config/index.ts` loads and validates at startup
3. Config passed to logger init and SafetyModule
4. No environment variables for app config (only wallet credentials)

---

*Structure analysis: 2026-04-19*
