# Testing Patterns

**Analysis Date:** 2026-05-02

## Test Framework

**Runner:**
- Vitest v1.0.0
- Config: `vitest.config.ts` not found (uses defaults)

**Assertion Library:**
- Vitest built-in `expect`

**Run Commands:**
```bash
npm test               # Run all tests
npm run dev            # Development with ts-node
npm run build          # Compile TypeScript
npm run lint           # Run ESLint
```

## Test File Organization

**Location:**
- `tests/` directory at project root (co-located, not in src/)
- Separate from source files

**Naming:**
- `*.test.ts` suffix
- Mirror source structure where practical: `tests/arbitrage.test.ts`, `tests/position-sizing.test.ts`

**Structure:**
```
tests/
├── arbitrage.test.ts
├── position-sizing.test.ts
├── research/
│   └── social.test.ts
└── slippage.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('arbitrage', () => {
  it('should detect arbitrage when YES + NO < 0.99', () => {
    const orderbook = { ... };
    const result = checkArbitrage(orderbook);
    expect(result.isArbitrage).toBe(true);
  });
});
```

**Patterns:**
- `describe()` blocks group related tests by function/module
- `it()` or `test()` for individual test cases
- Clear test descriptions: "should detect X when Y"
- Arrange-Act-Assert pattern

## Mocking

**Framework:** Vitest built-in `vi`

**Pattern:**
```typescript
import { vi } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn()
}));
```

**Usage in `tests/research/social.test.ts`:**
- Mock Node.js `child_process` module
- Use `vi.fn()` for function mocks
- Reset in `beforeEach` when needed

## Fixtures and Factories

**Test Data:**
- Inline object literals for test data
- Constants defined in test body for readability

**Example from `tests/arbitrage.test.ts`:**
```typescript
const orderbook = {
  bids: [{ price: 0.45, size: 100 }],
  asks: [{ price: 0.50, size: 100 }],
};
```

**Environment Variables:**
- Tests modify `process.env` directly
- Cleanup with `delete process.env.VAR_NAME`

**Example from `tests/research/social.test.ts`:**
```typescript
it('isAvailable returns true when TWITTER_BEARER_TOKEN is set', () => {
  process.env.TWITTER_BEARER_TOKEN = 'test-token';
  const result = adapter.isAvailable();
  expect(result).toBe(true);
  delete process.env.TWITTER_BEARER_TOKEN;
});
```

## Coverage

**Requirements:** None enforced

**View Coverage:** Not configured

## Test Types

**Unit Tests:**
- Pure functions tested in isolation: `calculatePositionSize`, `checkSlippage`, `checkArbitrage`
- No external dependencies mocked where possible
- Example: `tests/arbitrage.test.ts`, `tests/slippage.test.ts`

**Integration Tests:**
- Adapters tested with mocked dependencies: `tests/research/social.test.ts`
- Tests verify class instances and their behavior

**E2E Tests:** Not used

## Common Patterns

**Async Testing:** Not observed in current tests

**Error Testing:**
- Tests pass when functions handle errors gracefully
- Example: `expect(true).toBe(true)` for void operations

**Boundary Testing:**
- Explicit tests at boundaries: "should allow exactly 10% slippage (boundary)"
- `toBeCloseTo()` for floating point comparison

## Test Organization Conventions

**Descriptive Names:**
- `describe('arbitrage')` - groups by function
- `describe('position-sizing')` - groups by module
- `describe('TwitterAdapter')` - groups by class

**Assertion Patterns:**
- `expect(result.isArbitrage).toBe(true)`
- `expect(result.positionSize).toBeCloseTo(50)`
- `expect(result.allowed).toBe(false)`
- `expect(result.slippagePct).toBeCloseTo(0.05)`

**Test Independence:**
- Each test sets up its own data
- No shared mutable state between tests
- Environment variables cleaned up after each test

---

*Testing analysis: 2026-05-02*