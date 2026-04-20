# Phase 4: Reliability + Scaling - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Event-driven real-time architecture. Replace polling (Railway cron) with Polymarket WebSocket. Bot connects once, listens for events, reacts instantly. This is a fundamental architecture change from "ask every 5 min" to "get notified in real-time".

</domain>

<decisions>
## Implementation Decisions

### WebSocket Connection
- **D-01:** Polymarket WebSocket at `wss://ws-subscriptions-clob.polymarket.com/ws/market`
- **D-02:** Use Market Channel (public, no auth needed)
- **D-03:** Subscribe to asset IDs of interest
- **D-04:** Enable `custom_feature_enabled: true` for `best_bid_ask`, `new_market`, `market_resolved` events

### Event Types to Handle
- **D-05:** `new_market` — New market created, triggers research
- **D-06:** `price_change` — Price changed, could trigger re-evaluation
- **D-07:** `best_bid_ask` — Best prices updated, for arbitrage detection
- **D-08:** `market_resolved` — Market resolved, close position

### Connection Management
- **D-09:** Reconnection with exponential backoff on disconnect
- **D-10:** Heartbeat: send `PING` every 10 seconds
- **D-11:** Response to server `PONG` within timeout

### Architecture Change
- **D-12:** Bot runs continuously (not cron-based polling)
- **D-13:** Railway runs 24/7, not 5-min intervals
- **D-14:** No mutex lock needed (single process)

### Telegram (future)
- **D-15:** Telegram command interface deferred to Phase 4 (already planned)
- **D-16:** Quais comandos - discutir depois

### Deferred
- Discord/PagerDuty alerts - deferred
- Graceful shutdown - no longer applies (event-driven)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Polymarket WebSocket Docs
- `https://docs.polymarket.com/market-data/websocket/overview` — Overview
- `https://docs.polymarket.com/api-reference/wss/market` — Market channel API

### Project Context
- `.planning/PROJECT.md` — Core value, constraints
- `.planning/REQUIREMENTS.md` — MON-05, DEPL-05, DEPL-06
- `.planning/phases/01-core-loop-safety-foundations/01-CONTEXT.md` — Phase 1 decisions
- `.planning/phases/02-source-intelligence-ai-guardrails/02-CONTEXT.md` — Phase 2 decisions
- `.planning/phases/03-bankroll-management-first-strategy/03-CONTEXT.md` — Phase 3 decisions

### Codebase
- `src/api/polymarket.ts` — Current polling implementation
- `src/main.ts` — Current main loop

</canonical_refs>

<code_context>
## Existing Code Insights

### What Stays the Same
- Bankroll module (Phase 3) — unchanged
- Execution module (Phase 3) — unchanged
- Research adapters (Phase 2) — unchanged
- AI validation (Phase 2) — unchanged

### What Changes
- Main loop (`src/main.ts`) — from cron-based to event-driven
- Entry point (`src/index.ts`) — from HTTP server to WebSocket client
- Deployment (Railway) — from cron to 24/7 service

### Integration Points
- WebSocket events → trigger existing research pipeline
- WebSocket events → trigger existing execution module
- Research/execution already handle market data format

</code_context>

<specifics>
## Specific Ideas

- Polymarket WebSocket: `wss://ws-subscriptions-clob.polymarket.com/ws/market`
- Market channel with `custom_feature_enabled: true`
- Heartbeat: PING every 10 seconds
- Subscribe to YES/NO token IDs of monitored markets

</specifics>

<deferred>
## Deferred Ideas

- Telegram command interface (Phase 4 scope, but can be discussed)
- Discord/PagerDuty alerts
- Binance WebSocket (not needed — Polymarket has its own)

</deferred>

---

*Phase: 04-reliability-scaling*
*Context gathered: 2026-04-19*
