# 05-01 Cycle Management + Mutex Lock — SUMMARY

**Phase:** 05-betting-cycles-and-safety
**Plan:** 01
**Status:** COMPLETE ✅
**Date:** 2026-04-20

## Artifacts Created

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `src/betting/types.ts` | 39 | Bet, CycleState, CycleStatus, BettingConfig types | ✅ |
| `src/betting/mutex.ts` | 45 | MarketMutex with acquire/release/isLocked | ✅ |
| `src/betting/cycle.ts` | 204 | CycleManager state machine | ✅ |
| `src/betting/index.ts` | 3 | Barrel exports | ✅ |

## Cycle State Machine

```
STATUS TRANSITIONS:
  'open' → 'closed' (when bets.length >= maxBetsPerCycle)
  'closed' → 'waiting_24h' (when all bets resolved)
  'waiting_24h' → 'open' (when 24h elapsed after last resolution)

CONFIG (default):
  maxBetsPerCycle: 3
  cycleWait24hMs: 24 * 60 * 60 * 1000 (24 hours)
```

## Mutex Lock Semantics

```
MarketMutex.acquire(marketId) → boolean (true if acquired)
MarketMutex.release(marketId) → void
MarketMutex.isLocked(marketId) → boolean
```

**Protection against:**
- WebSocket reconnect replaying events
- Same market triggering multiple bet decisions

## Integration in index.ts

- `cycleManager = createCycleManager({ maxBetsPerCycle: 3 })`
- `new_market` handler: checks `canAcceptBet()` + `acquireMarket(marketId)`
- `market_resolved` handler: calls `cycleManager.resolveBet()`
- Health check includes cycle stats (status, betsTotal, betsPending, betsResolved)

## Next: 05-02 Telegram Interface

Telegram bot commands:
- `/status` - Quick overview
- `/cycle` - Detailed cycle info
- `/pause` - Stop betting
- `/resume` - Allow betting
- `/bankroll` - Bankroll state
