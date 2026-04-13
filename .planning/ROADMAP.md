# Roadmap: Polymarket Bot

**Created:** 2026-04-13
**Granularity:** Standard (4 phases, 3-5 plans each)
**Mode:** YOLO (auto-approved)

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | Core Loop + Safety Foundations | Polymarket API client, dry-run, non-negotiable safety features | MON-01-04, AI-04, EXEC-01-03, BANK-01-04, DEPL-01-04 | 7 criteria |
| 2 | Source Intelligence + AI Guardrails | Star rating system, multi-source pipeline, AI validation | RES-01-05, AI-01-03, SRC-01-04 | 8 criteria |
| 3 | Bankroll Management + First Strategy | Kelly Criterion, exposure caps, first real strategy | EXEC-04-05, BANK-05 | 5 criteria |
| 4 | Reliability + Scaling | WebSocket, mutex, graceful shutdown, alerting | MON-05, DEPL-05-06 | 5 criteria |

---

## Phase 1: Core Loop + Safety Foundations

**Goal:** Establish the foundational loop with non-negotiable safety features. Real-world failures prove that building execution before limits exists causes blowouts.

**Requirements:** MON-01, MON-02, MON-03, MON-04, AI-04, EXEC-01, EXEC-02, EXEC-03, BANK-01, BANK-02, BANK-03, BANK-04, DEPL-01, DEPL-02, DEPL-03, DEPL-04

**Success Criteria:**
1. Bot connects to Polymarket API and fetches market list filtered by category and time (5min-24h)
2. Bot fetches odds and orderbook depth for selected markets
3. Bot operates in dry-run mode (logs decisions without executing trades)
4. Max position size enforced (5-10% per market, configurable)
5. Daily loss limit enforced (stops trading when threshold exceeded)
6. Drawdown kill switch halts all trading on extreme drawdown
7. Bot deploys to Railway with health checks, secrets management, and structured logging

---

## Phase 2: Source Intelligence + AI Guardrails

**Goal:** Build the research brain with star rating system and AI output validation. Source quality is the #1 driver of AI trading bot failures.

**Requirements:** RES-01, RES-02, RES-03, RES-04, RES-05, AI-01, AI-02, AI-03, SRC-01, SRC-02, SRC-03, SRC-04

**Success Criteria:**
1. Source database stores categories, ratings (★1-5), and feed configs per category
2. Minimum ★3 rating enforced by code (not aspirational)
3. Minimum 10 sources gathered before any bet decision
4. Research pipeline per category (Crypto: exchange APIs/Glassnode, Financial: market APIs, News: news APIs, Sports: sports APIs)
5. Sources classified by recency, quality, and confidence
6. Weighted confidence scoring implemented (multiple low-rated sources vs single high-rated)
7. LLM integration produces probability estimates from research signals with chain-of-thought logging
8. AI output validated by rule-based sanity check before execution

---

## Phase 3: Bankroll Management + First Strategy

**Goal:** Manage capital intelligently and run first real strategy. Arbitrage detection is the only documented strategy that survived live testing.

**Requirements:** EXEC-04, EXEC-05, BANK-05

**Success Criteria:**
1. Kelly Criterion or fixed % position sizing implemented
2. Category-level exposure caps (e.g., max 20% in Crypto markets)
3. Slippage protection (abort if price moved beyond threshold)
4. Limit orders placed at specific prices (not just market orders)
5. Arbitrage detection implemented (binary complement: YES + NO < $1 minus fees)

---

## Phase 4: Reliability + Scaling

**Goal:** Operational maturity for production. Ensure bot survives real-world conditions.

**Requirements:** MON-05, DEPL-05, DEPL-06

**Success Criteria:**
1. WebSocket connection for real-time orderbook updates (replaces polling)
2. Multi-instance mutex lock prevents duplicate trades on restart
3. Graceful shutdown finishes in-progress trades before stopping
4. Alerting system notifies on bot failure (Discord/PagerDuty webhook)
5. Telegram command interface for bot control and status queries

---

## Milestone v1.0

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1 | ○ Planned | 0/3 | 0% |
| 2 | ○ Planned | 0/4 | 0% |
| 3 | ○ Planned | 0/2 | 0% |
| 4 | ○ Planned | 0/2 | 0% |

**Overall:** 0/11 plans complete (0%)

---

## Phase Dependencies

```
Phase 1 (Core Loop)
    │
    ├── Phase 2 (Source Intelligence) — depends on clean market data from Phase 1
    │
    ├── Phase 3 (Bankroll) — depends on safety features from Phase 1
    │
    └── Phase 4 (Reliability) — depends on all previous phases
```

---

*Roadmap created: 2026-04-13*
*Auto-approved via --auto mode*
