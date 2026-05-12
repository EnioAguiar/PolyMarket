# Testing

## Framework

**Vitest** (`^1.0.0`) — configured via `package.json` script `"test": "vitest"`. No separate vitest config file found.

Run tests: `npm test`

## Test Files

```
tests/
├── arbitrage.test.ts       # 3 tests — checkArbitrage(), calculateArbitrageProfit()
├── slippage.test.ts        # 4 tests — checkSlippage() boundary conditions
├── position-sizing.test.ts # Position size / bankroll sizing tests
└── research/
    └── social.test.ts      # Social research source tests
```

All test files use `describe` / `it` / `expect` from `vitest`.

## What Is Tested

| Module | Coverage |
|--------|----------|
| `src/execution/arbitrage.ts` | YES — happy path, non-arbitrage case, profit calc |
| `src/execution/slippage.ts` | YES — 5% allowed, 10% boundary, >10% rejected, price improvement |
| `src/bankroll/position-sizing.ts` | YES (position-sizing.test.ts) |
| `src/research/` social sources | YES (social.test.ts) |

## What Is NOT Tested

| Module | Notes |
|--------|-------|
| `src/safety/` | No tests for `SafetyModule`, `DailyLossTracker`, `DrawdownTracker`, position-limits |
| `src/betting/cycle.ts` | `CycleManager` state machine untested |
| `src/betting/mutex.ts` | `MarketMutex` untested |
| `src/websocket/` | No WS integration tests |
| `src/api/clob.ts` | No tests — requires live CLOB credentials |
| `src/api/telegram.ts` | No tests |
| `src/index.ts` / `src/main.ts` | No integration or end-to-end tests |
| `src/execution/limit-orders.ts` | Untested |

## Test Patterns

- Tests import directly from `src/` via relative paths with `.js` extension
- Pure unit tests — no mocking, no DB, no network calls
- Tests focus on pure computation functions (arbitrage math, slippage percentage)
- No test fixtures or factories

## Coverage

No coverage configuration found (`c8`, `istanbul` not configured). Coverage not enforced in CI.

## CI

No `.github/workflows/` or CI config found. Tests not automatically run on push.

## Gaps and Risks

- Core safety logic (`SafetyModule`, kill-switch, daily-loss) has zero test coverage — highest risk given financial consequences
- `CycleManager` state machine (open → closed → waiting_24h) has zero test coverage
- No integration tests against Polymarket staging/sandbox environment
- `config.dryRun: false` is committed — no safeguard preventing accidental live execution in tests
