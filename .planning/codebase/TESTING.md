# Testing Patterns

**Analysis Date:** 2026-04-19

## Test Framework

**Runner:** Vitest (`vitest@^1.0.0`)

**Config:** No `vitest.config.ts` found - uses Vitest defaults

**Assertion Library:** Built-in Vitest (`expect`)

**Run Commands:**
```bash
npm test              # Run all tests (vitest)
npm run test -- --watch  # Watch mode
```

## Test File Organization

**Location:** `tests/` directory (co-located at project root, not alongside source)

**Files found:**
- `tests/arbitrage.test.ts` - arbitrage detection logic
- `tests/position-sizing.test.ts` - bankroll position sizing calculations
- `tests/slippage.test.ts` - slippage tolerance checks

**Naming:** `{module-name}.test.ts`

## Test Structure

**Import pattern:**

```typescript
import { describe, it, expect } from 'vitest';
import { checkArbitrage, calculateArbitrageProfit } from '../src/execution/arbitrage.js';
```

**Suite organization:**

```typescript
describe('arbitrage', () => {
  it('should detect arbitrage when YES + NO < 0.99', () => {
    const orderbook = {
      bids: [{ price: 0.45, size: 100 }],
      asks: [{ price: 0.50, size: 100 }],
    };
    
    const result = checkArbitrage(orderbook);
    
    expect(result.isArbitrage).toBe(true);
    expect(result.combinedPrice).toBe(0.95);
    expect(result.profitPct).toBeGreaterThan(0);
  });
  // ... more tests
});
```

**Pattern:**
- `describe()` blocks for module/feature grouping
- `it()` or `test()` for individual test cases
- Descriptive test names: "should detect X when Y"
- Arrange-Act-Assert (AAA) pattern with inline arrange

## Assertion Patterns

**Basic assertions:**
```typescript
expect(result.isArbitrage).toBe(true);
expect(result.combinedPrice).toBe(0.95);
```

**Numeric comparisons:**
```typescript
expect(result.positionSize).toBeCloseTo(50);  // For floating point
expect(result.slippagePct).toBeCloseTo(0.05);
```

**Boundary testing:**
```typescript
// From tests/slippage.test.ts
it('should allow exactly 10% slippage (boundary)', () => {
  const result = checkSlippage(
    { expectedPrice: 1.0, executionPrice: 1.099 },
    0.10
  );
  expect(result.allowed).toBe(true);
});
```

**Negative/edge cases:**
```typescript
// From tests/slippage.test.ts
it('should handle price improvement', () => {
  const result = checkSlippage(
    { expectedPrice: 1.0, executionPrice: 0.90 },
    0.10
  );
  expect(result.allowed).toBe(true);
});
```

## Test Data

**Inline fixture objects** (no separate fixture files):

```typescript
const orderbook = {
  bids: [{ price: 0.45, size: 100 }], // NO side
  asks: [{ price: 0.50, size: 100 }], // YES side
};
```

**Typed inputs using source types:**

```typescript
// From tests/position-sizing.test.ts
import type { PositionSizingInput } from '../src/bankroll/types.js';

const input: PositionSizingInput = {
  bankroll: 1000,
  odds: 2.0,
  category: 'crypto',
  researchQuality: 'medium',
};
```

## Mocking

**No mocking framework detected** in current test files.

**Direct function calls** - tests import actual implementation:
```typescript
import { checkArbitrage, calculateArbitrageProfit } from '../src/execution/arbitrage.js';
import { checkSlippage } from '../src/execution/slippage.js';
import { calculatePositionSize } from '../src/bankroll/position-sizing.js';
```

## Coverage

**No coverage configuration or reporting detected.**

No `coverage` script in package.json, no `@vitest/coverage-*` packages installed.

## What IS Tested

**Current test coverage:**

| Module | Functions Tested | Coverage Focus |
|--------|------------------|----------------|
| `execution/arbitrage.ts` | `checkArbitrage`, `calculateArbitrageProfit` | YES+NO price detection, profit calculation |
| `execution/slippage.ts` | `checkSlippage` | Boundary conditions, price improvement |
| `bankroll/position-sizing.ts` | `calculatePositionSize` | Quality multipliers, minimum thresholds |

## What IS NOT Tested

- No API calls tested (would require mocking)
- No database operations
- No integration tests
- No E2E tests
- No safety module tests
- No config loading tests

---

*Testing analysis: 2026-04-19*
