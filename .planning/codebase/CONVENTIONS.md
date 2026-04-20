# Coding Conventions

**Analysis Date:** 2026-04-19

## Naming Patterns

**Files:**
- Directories: kebab-case (`src/api/`, `src/safety/`)
- Source files: kebab-case with `index.js` barrel pattern

**Functions:**
- camelCase: `fetchMarkets`, `filterByCategory`, `getYesTokenId`, `getMidPrice`, `hasLiquidity`
- Examples:
  - `src/api/polymarket.ts`: `fetchMarkets`, `filterByCategory`, `filterByTimeHorizon`, `getYesTokenId`, `getNoTokenId`
  - `src/api/clob.ts`: `createClobClient`, `getClobClient`, `getOrderBook`, `getBestPrices`, `getMidPrice`, `hasLiquidity`

**Types/Interfaces:**
- PascalCase: `Market`, `OrderBook`, `OrderBookEntry`, `SafetyCheckResult`, `BetCheckInput`
- Examples from `src/types/index.ts`:
  ```typescript
  export interface Market { ... }
  export interface OrderBook { ... }
  export interface SafetyCheckResult { ... }
  ```

**Classes:**
- PascalCase: `SafetyModule`, `DrawdownTracker`, `DailyLossTracker`
- Examples from `src/safety/`: `SafetyModule`, `DrawdownTracker`, `DailyLossTracker`

## Import Organization

**ES Modules with `.js` extension:**
```typescript
import { loadConfig, isDryRun } from './config/index.js';
import { initLogger, getLogger, logBetDecision } from './logging/index.js';
import type { Market, SafetyState } from './types/index.js';
```

**Barrel files:** Each directory has `index.js` that re-exports contents:
- `src/config/index.ts` → re-exports `loadConfig`, `isDryRun`
- `src/logging/index.ts` → re-exports `initLogger`, `getLogger`, `logBetDecision`
- `src/safety/index.ts` → re-exports `SafetyModule`

**Type-only imports:**
```typescript
import type { Config, OrderBook, OrderBookEntry } from '../types/index.js';
import type { SafetyCheckResult, SafetyModuleConfig, BetCheckInput } from './types.js';
```

## Error Handling

**Throwing descriptive errors:**
```typescript
// src/api/clob.ts
throw new Error('PRIVATE_KEY environment variable is required for CLOB client');
throw new Error('CLOB client not initialized. Call createClobClient(config) first.');

// src/config/index.ts
throw new Error('config.yaml must contain "dryRun" field');
throw new Error('config.yaml must contain "safety.maxPositionSizePct"');
```

**Try/catch with graceful degradation:**
```typescript
// src/main.ts - evaluateMarket function
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
```

**Error logging with context:**
```typescript
// src/main.ts
catch (error) {
  logger.error({ marketId: market.id, error }, 'Error processing market');
}
```

## Logging Patterns

**Framework:** Pino (`pino@^10.0.0`)

**Structured logging with object prefix:**
```typescript
// src/logging/index.ts
logger = pino({
  level: config.logging.level || 'debug',
  transport,
  base: {
    service: 'polymarket-bot',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Usage in src/main.ts
logger.info({ dryRun: config.dryRun }, 'Bot cycle starting');
logger.warn({ msg: 'KILL SWITCH ACTIVE - bot halted' });
logger.error({ error, msg: 'Fatal error in bot cycle' });
```

**Custom log helpers:**
```typescript
// src/logging/index.ts
export function logBetDecision(decision: { marketId: string; ... }): void
export function logSafetyCheck(result: { passed: boolean; ... }): void
```

## JSDoc Usage

**Function documentation:**
```typescript
// src/api/clob.ts
/**
 * Initialize the CLOB client (EXEC-01: wallet connection)
 * Requires PRIVATE_KEY and FUNDER_ADDRESS environment variables
 */
export function createClobClient(config: Config): ClobClient { ... }

/**
 * Fetch orderbook for a specific token (MON-02: fetch odds and orderbook depth)
 */
export async function getOrderBook(tokenId: string): Promise<OrderBook> { ... }
```

**Class documentation:**
```typescript
// src/safety/index.ts
/**
 * Main safety module class (per D-03: dedicated module separate from execution flow)
 * Coordinates all safety checks for betting decisions
 */
export class SafetyModule { ... }

// src/safety/drawdown.ts
/**
 * Track total drawdown and trigger kill switch if exceeded (BANK-03)
 */
export class DrawdownTracker { ... }
```

## Code Style

**Semicolons:** Not used ( ASI assumed)

**TypeScript:** Strict typing with interface/type exports

**Named exports for utilities, default not used**

**Functional style for data manipulation, class-based for stateful modules**

---

*Convention analysis: 2026-04-19*
