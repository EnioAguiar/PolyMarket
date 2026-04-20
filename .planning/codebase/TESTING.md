# Testing Patterns

**Analysis Date:** 2026-04-19

## Test Framework

**Runner:** Vitest `^1.0.0`
- Configured in `package.json` scripts
- Located in `devDependencies`

**Package.json test scripts:**
```json
{
  "scripts": {
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  }
}
```

**Run commands:**
```bash
npm test          # Run all tests
npm run lint      # Lint source files
```

## Test File Organization

**Test files found:** None

**Current state:** No test files exist in the codebase.

**Expected patterns (from Vitest default):**
- Files: `*.test.ts` or `*.spec.ts` co-located with source
- Example: `src/api/polymarket.test.ts`

## Coverage

**Coverage enforcement:** None detected

**No coverage configuration found** in `package.json` or any config files.

## Testing Gaps

**Critical gaps:**
- No unit tests for safety module (`src/safety/`)
- No unit tests for API clients (`src/api/clob.ts`, `src/api/polymarket.ts`)
- No unit tests for config loading (`src/config/index.ts`)
- No integration tests

**High-priority areas for testing:**
1. `SafetyModule.checkBet()` - safety checks are critical for bankroll management
2. `DrawdownTracker.checkDrawdown()` - kill switch logic
3. `DailyLossTracker.checkDailyLoss()` - daily loss limit logic
4. `fetchMarkets()` - API integration
5. `getMidPrice()` / `hasLiquidity()` - trading logic

## Mocking

**Framework:** Vitest native mocking (no external mock library detected in dependencies)

**Expected patterns:**
```typescript
import { vi, describe, it, expect } from 'vitest';
vi.mock('../api/clob.js', () => ({ ... }));
```

## Linting

**ESLint configuration** detected:
- `@typescript-eslint/eslint-plugin@^8.0.0`
- `@typescript-eslint/parser@^8.0.0`
- `eslint@^9.0.0`

**Lint command:**
```bash
npm run lint    # eslint src --ext .ts
```

---

*Testing analysis: 2026-04-19*
