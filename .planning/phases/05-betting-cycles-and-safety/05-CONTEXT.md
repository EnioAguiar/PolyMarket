# Phase 5: Betting Cycles + Safety

**Created:** 2026-04-19

## Context

Phase 4 introduced WebSocket event-driven architecture. Phase 5 adds critical safety controls:

1. **Cycle Management** - Limits exposure through betting sessions
2. **Mutex Lock** - Prevents duplicate trades from WebSocket reconnections
3. **Telegram Interface** - Human control and status visibility

## Why This Matters

**Without Cycle Management:**
- Bot could accumulate unlimited open positions
- Bankroll gets spread too thin
- No disciplined "stop and wait" period

**Without Mutex:**
- WebSocket reconnect replays events
- Same market bet placed twice
- Double exposure = double risk

**Without Telegram:**
- No visibility into bot status
- Can't intervene if something goes wrong
- Black box = dangerous with real money

## Cycle Management Design

```
BET INTERVAL: 5 min → 24 hours (market resolution time)

CONFIG:
  maxBetsPerCycle: 3 (configurable)

CYCLE STATES:
  'open'      - Cycle active, can accept new bets
  'closed'    - Max bets reached, waiting for resolutions
  'waiting_24h' - All resolved, waiting 24h before new cycle

TRANSITIONS:
  open → closed  : when bets.length >= maxBetsPerCycle
  closed → waiting_24h : when all bets resolved (last one)
  waiting_24h → open   : when 24h elapsed since last resolution
```

**Example Timeline:**
```
DIA 20 - 10:00
  → Cycle: 'open'
  → Bet A (10 min), Bet B (1h), Bet C (24h)
  → bets = [A, B, C], Cycle: 'closed'

DIA 20 - 10:10 → A resolved
  → Cycle: 'closed' (still waiting B, C)

DIA 20 - 11:00 → B resolved
  → Cycle: 'closed' (still waiting C)

DIA 21 - 11:00 → C resolved (24h after start)
  → Cycle: 'waiting_24h', lastResolvedAt = 2026-04-21 11:00

DIA 22 - 11:00 → 24h elapsed
  → Cycle: 'open', bets = [], new cycle ready
```

## Mutex Lock Design

```
PURPOSE: Prevent duplicate bets on same market

IMPLEMENTATION:
  const marketMutex = new Set<string>();

  function acquireMarket(marketId: string): boolean {
    if (marketMutex.has(marketId)) return false;
    marketMutex.add(marketId);
    return true;
  }

  function releaseMarket(marketId: string): void {
    marketMutex.delete(marketId);
  }

  function isMarketLocked(marketId: string): boolean {
    return marketMutex.has(marketId);
  }
```

**Usage in bet flow:**
```
1. Market event received
2. if (!acquireMarket(marketId)) → skip (already processing)
3. Do research, make decision...
4. If bet placed → stays locked until resolved
5. On resolution → releaseMarket(marketId)
```

## Telegram Integration

**Commands:**
- `/status` - Current cycle state, open bets, P&L
- `/cycle` - Show cycle info (bets count, time remaining)
- `/pause` - Pause betting (sets kill switch)
- `/resume` - Resume betting
- `/bankroll` - Current bankroll state

## Files to Create/Modify

| File | Purpose |
|------|---------|
| `src/betting/cycle.ts` | Cycle state machine |
| `src/betting/mutex.ts` | Market mutex lock |
| `src/betting/index.ts` | Exports all betting controls |
| `src/api/telegram.ts` | Telegram bot interface |
| `src/index.ts` | Integrate cycle + mutex |

## Success Criteria

1. Cycle respects maxBetsPerCycle limit
2. Cycle waits 24h after all bets resolve before opening
3. Same market event never triggers duplicate bet
4. Telegram commands return accurate cycle/bankroll status
5. Kill switch pauses/resumes betting cycle
