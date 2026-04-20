# Coding Conventions

**Analysis Date:** 2026-04-19

## Naming Patterns

**Files:**
- **PascalCase** for TypeScript files: `arbitrage.ts`, `position-sizing.ts`, `slippage.ts`
- **kebab-case** for directory names: `src/execution/`, `src/bankroll/`, `src/safety/`
- Barrel files named `index.ts`

**Functions:**
- **camelCase**: `calculatePositionSize`, `checkArbitrage`, `getMidPrice`, `isKillSwitchActive`
- Predicate functions use `is` prefix: `isArbitrage`, `isKillSwitchActive`, `isDryRun`
- Query functions use `get` prefix: `getLogger`, `getClobClient`, `getMidPrice`, `getMaxPositionSizeForOdds`
- Check/validation functions: `checkSlippage`, `checkBet`, `checkPositionSize`, `checkDailyLoss`, `checkDrawdown`

**Variables:**
- **camelCase**: `clobClient`, `orderbook`, `maxPositionSizePct`
- Constants: **UPPER_SNAKE_CASE** for magic numbers at module level: `FEE_THRESHOLD`, `POLYMARKET_MIN_TOKENS`
- Interface properties: **camelCase** (from TypeScript defaults)

**Types:**
- **PascalCase** interfaces: `ArbitrageCheckResult`, `SlippageCheckResult`, `PositionSizingInput`, `SafetyModuleConfig`
- Suffix with purpose: `Input`, `Result`, `Config`, `State`, `Entry`

## Code Style

**Formatting:**
- Tool: Not configured (no Prettier/ESLint config files present)
- TypeScript strict mode enabled in `tsconfig.json`
- 2-space indentation
- Trailing semicolons

**Module System:**
- ESNext modules (`"type": "module"` in package.json)
- `.js` extensions in imports: `import { checkArbitrage } from '../src/execution/arbitrage.js'`
- `moduleResolution: "bundler"` in tsconfig

**Import Organization:**
1. External packages (e.g., `vitest`, `@polymarket/clob-client-v2`, `ethers`, `pino`)
2. Internal path aliases or relative imports (e.g., `../types/index.js`)

## Error Handling

**Pattern: Early returns with result objects**

```typescript
// From src/execution/arbitrage.ts
if (!bestBid || !bestAsk) {
  return {
    isArbitrage: false,
    yesPrice: bestAsk || 0,
    noPrice: bestBid || 0,
    combinedPrice: 0,
    feeThreshold: FEE_THRESHOLD,
    profitPct: 0,
    reason: 'Insufficient orderbook data',
  };
}
```

**Pattern: Try-catch with string interpolation in error message**

```typescript
// From src/main.ts
try {
  const decision = await evaluateMarket(market, safetyModule, config);
} catch (error) {
  logger.error({ marketId: market.id, error }, 'Error processing market');
}
```

**Pattern: Guard clauses at function start**

```typescript
// From src/api/clob.ts
export function createClobClient(config: Config): ClobClient {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required for CLOB client');
  }
  // ... rest of function
}
```

**Pattern: Nullable returns**

```typescript
// From src/api/clob.ts
export function getMidPrice(orderbook: OrderBook): number | null {
  const { bestBid, bestAsk } = getBestPrices(orderbook);
  if (bestBid === null || bestAsk === null) return null;
  return (bestBid + bestAsk) / 2;
}
```

## Logging

**Framework:** Pino (`pino@^10.0.0`)

**Initialization pattern:**

```typescript
// From src/logging/index.ts
export function initLogger(config: Config): pino.Logger {
  const transport = config.logging.pretty
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } }
    : undefined;

  logger = pino({
    level: config.logging.level || 'debug',
    transport,
    base: { service: 'polymarket-bot' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
  return logger;
}
```

**Usage patterns:**

```typescript
// Structured logging with object + message
logger.info({ dryRun: config.dryRun, msg: 'Polymarket Bot starting' });

// With step context
logger.info({ step: 'monitor' }, 'Fetching markets from Polymarket');

// Error with context
logger.error({ marketId: market.id, error }, 'Error processing market');

// Warn with msg prefix
logger.warn({ msg: 'KILL SWITCH ACTIVE - bot halted' });
```

**Specialized log helpers:**

```typescript
// From src/logging/index.ts
export function logBetDecision(decision: {...}): void {
  getLogger().info({...}, `Bet decision: ${decision.action}`);
}
```

## JSDoc Comments

**Used for documentation on exported functions:**

```typescript
// From src/api/clob.ts
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

## Class Patterns

**Module classes with dependency injection via constructor:**

```typescript
// From src/safety/index.ts
export class SafetyModule {
  private config: SafetyModuleConfig;
  private dailyLossTracker: DailyLossTracker;
  private drawdownTracker: DrawdownTracker;
  private bankroll: number;

  constructor(config: Config, initialState: SafetyState, initialBankroll: number) {
    this.config = { ... };
    this.bankroll = initialBankroll;
    this.dailyLossTracker = new DailyLossTracker(this.config, initialState);
    this.drawdownTracker = new DrawdownTracker(this.config, initialState, initialBankroll);
  }
}
```

## Constants

**Module-level constants for magic numbers:**

```typescript
// From src/execution/arbitrage.ts
const FEE_THRESHOLD = 0.99; // D-16: YES + NO < $0.99 for arbitrage

// From src/bankroll/position-sizing.ts
const POLYMARKET_MIN_TOKENS = 5;
const POLYMARKET_MIN_USD = 1;
```

## Type Exports

**Centralized in `src/types/index.ts`:**
- `Market`, `OrderBook`, `OrderBookEntry` - data types
- `Config`, `SafetyConfig`, `SafetyState` - configuration/state
- `BetDecision` - action types

**Module-specific types** in respective `types.ts` files:
- `src/bankroll/types.ts` - `PositionSizingInput`, `PositionSizingResult`, `BankrollState`
- `src/safety/types.ts` - `SafetyCheckResult`, `SafetyModuleConfig`, `BetCheckInput`

---

*Convention analysis: 2026-04-19*
