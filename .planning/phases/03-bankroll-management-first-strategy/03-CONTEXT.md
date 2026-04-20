# Phase 3: Bankroll Management + First Strategy - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Manage capital intelligently and implement the first real strategy. Arbitrage detection is the only documented strategy that survived live testing. Focus on position sizing, exposure limits, slippage protection, and order types.

</domain>

<decisions>
## Implementation Decisions

### Position Sizing
- **D-01:** Use fixed percentage of bankroll (not Kelly Criterion)
- **D-02:** Reason: Simpler, predictable, less AI hallucination, TDH-friendly
- **D-03:** Minimum threshold: If position size < Polymarket minimum (5 tokens), skip bet
- **D-04:** Default: 5% of bankroll per bet

### Exposure Caps
- **D-05:** 10-20% of bankroll per category (conservative to moderate)
- **D-06:** No aggressive (30%+) exposure allowed
- **D-07:** If research quality is low → use conservative (10%)
- **D-08:** If research quality is high → can use moderate (20%)

### Slippage Protection
- **D-09:** 10% maximum slippage tolerance (professional standard)
- **D-10:** If price moves >10% from decision → abort bet
- **D-11:** Reason: Polymarket is slower than Binance, 10% is professional equilibrium

### Order Types
- **D-12:** Limit orders by default (define specific price, wait for market)
- **D-13:** Market order as fallback if limit order fails
- **D-14:** Hybrid approach: try limit first, fall back to market if needed

### Arbitrage Detection
- **D-15:** Implement arbitrage detection as first strategy
- **D-16:** Formula: YES_price + NO_price < $0.99 (accounting for ~1% fees)
- **D-17:** If arbitrage detected → bet on both YES and NO sides
- **D-18:** Guaranteed profit when YES + NO < $0.99

### the agent's Discretion
- Exact percentage for position sizing (5% default)
- Timeout for limit orders before fallback to market
- How to measure research quality for conservative vs moderate exposure
- Exact implementation of arbitrage detection timing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definitions
- `.planning/PROJECT.md` — Core value, constraints
- `.planning/REQUIREMENTS.md` — EXEC-04, EXEC-05, BANK-05
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria
- `.planning/phases/01-core-loop-safety-foundations/01-CONTEXT.md` — Phase 1 decisions (safety module, Railway cron)
- `.planning/phases/02-source-intelligence-ai-guardrails/02-CONTEXT.md` — Phase 2 decisions (Bayes, AI validation)

### Technical
- Polymarket Gamma API docs — market data, order book
- Polymarket CLOB API docs — order placement
- `src/api/polymarket.ts` — market fetching
- `src/api/clob.ts` — CLOB client for trading
- `src/safety/` — existing safety module

</canonical_refs>

<code_context>
## Existing Code Insights

### Phase 1-2 Code
- `src/safety/` — existing safety module (DailyLossTracker, DrawdownTracker)
- `src/api/clob.ts` — CLOB client with getOrderBook
- `src/config/` — YAML config loading
- `src/research/` — research adapters, aggregator, chain

### Integration Points
- Safety module → Phase 3 exposure caps
- CLOB client → Phase 3 order placement
- Research chain → Phase 3 arbitrage detection inputs

</code_context>

<specifics>
## Specific Ideas

- 5% bankroll per bet (not Kelly)
- 10-20% category exposure limits
- 10% slippage tolerance
- Limit orders with market order fallback
- Arbitrage detection: YES + NO < $0.99

</specifics>

<deferred>
## Deferred Ideas

- Multi-instance mutex (Phase 4)
- WebSocket real-time updates (Phase 4)
- Telegram interface (Phase 4)
- Advanced strategies beyond arbitrage

</deferred>

---

*Phase: 03-bankroll-management-first-strategy*
*Context gathered: 2026-04-19*
