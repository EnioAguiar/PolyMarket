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
| 5 | Betting Cycles + Safety | Cycle management, mutex lock, Telegram interface | MON-05, DEPL-06 | 5 criteria |
| 6 | Research Infrastructure | Research tools (APIs, Crawl4AI), data persistence, Railway volume | RES-06, DEPL-07 | TBD |

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

**Plans:**
- [x] 01-01-PLAN.md — Project foundation (package.json, tsconfig, config, types, logging)
- [x] 01-02-PLAN.md — Polymarket API client and safety module
- [x] 01-03-PLAN.md — Railway deployment and main bot loop

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

**Plans:**
- [x] 03-01-PLAN.md — Bankroll management (position sizing, exposure caps)
- [x] 03-02-PLAN.md — Order execution (slippage, limit orders, arbitrage)

---

## Phase 4: Reliability + Scaling

**Goal:** Event-driven real-time architecture. Replace polling with Polymarket WebSocket. Bot connects once, listens for events, reacts instantly.

**Requirements:** MON-05, DEPL-05, DEPL-06

**Success Criteria:**
1. Polymarket WebSocket connected (market channel) — receives `new_market`, `price_change`, `best_bid_ask`, `market_resolved`
2. Event handler processes incoming events and triggers research/execution pipeline
3. WebSocket reconnection with exponential backoff on disconnect
4. Heartbeat (PING/PONG) every 10 seconds to keep connection alive
5. Telegram command interface for bot control and status queries (moved to Phase 5)

**Key Insight:** Polymarket WebSocket at `wss://ws-subscriptions-clob.polymarket.com/ws/market` provides real-time market events. No polling needed.

**Plans:**
- [x] 04-01-PLAN.md — WebSocket client infrastructure (types, client, events, subscription)
- [x] 04-02-PLAN.md — Integration layer and Railway always-on deployment

---

## Phase 5: Betting Cycles + Safety

**Goal:** Discipline through betting sessions. Prevent duplicate trades via mutex lock. Human control via Telegram.

**Requirements:** MON-05, DEPL-06

**Success Criteria:**
1. Cycle respects maxBetsPerCycle limit (e.g., 3 bets per cycle)
2. Cycle waits 24h after all bets resolve before opening new cycle
3. Same market event never triggers duplicate bet (mutex works)
4. Telegram bot responds to /status, /cycle, /pause, /resume
5. Bot can be paused/resumed via Telegram

**Key Design:**
```
Cycle: open → closed (max bets) → waiting_24h (all resolved) → open
Mutex: Prevents duplicate bets on same market from reconnections
```

**Plans:**
- [x] 05-01-PLAN.md — Cycle management (max bets, 24h wait) + Mutex lock
- [x] 05-02-PLAN.md — Telegram bot interface (status, pause, resume)

---

## Milestone v1.0

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1 | ✅ Complete | 3/3 | 100% |
| 2 | ✅ Complete | 4/4 | 100% |
| 3 | ✅ Complete | 2/2 | 100% |
| 4 | ✅ Complete | 2/2 | 100% |
| 5 | ✅ Complete | 2/2 | 100% |

**Overall:** 13/13 plans complete (100%)

---

## Phase 1: Plans

Plans:
- [x] 01-01-PLAN.md — Project foundation (package.json, tsconfig, config, types, logging)
- [x] 01-02-PLAN.md — Polymarket API client and safety module
- [x] 01-03-PLAN.md — Railway deployment and main bot loop

---

## Phase 2: Plans

Plans:
- [x] 02-01-PLAN.md — Source database foundation (SQLite, schema, types, config)
- [x] 02-02-PLAN.md — Research adapters (Binance, Google News, Adapter Pattern)
- [x] 02-03-PLAN.md — Bayesian confidence scoring and Research Chain
- [x] 02-04-PLAN.md — AI integration (MiniMax 2) and sanity check validation

---

## Phase 3: Plans

Plans:
- [x] 03-01-PLAN.md — Bankroll management (position sizing, exposure caps)
- [x] 03-02-PLAN.md — Order execution (slippage, limit orders, arbitrage)

---

## Phase 4: Plans

Plans:
- [x] 04-01-PLAN.md — WebSocket client infrastructure (types, client, events, subscription)
- [x] 04-02-PLAN.md — Integration layer and Railway always-on deployment

---

## Phase 5: Plans

Plans:
- [x] 05-01-PLAN.md — Cycle management (max bets, 24h wait) + Mutex lock
- [ ] 05-02-PLAN.md — Telegram bot interface (status, pause, resume)

---

## Phase 6: Research Infrastructure

**Goal:** Research tools (APIs, Crawl4AI) and data persistence (Railway volume).

**Requirements:** RES-06, DEPL-07

**Success Criteria:**
1. Categorized research tools by market type (Crypto, Sports, News, etc)
2. Railway volume for persistent SQLite storage
3. Research sources configured and rated (Binance, Google News, Crawl4AI)
4. Minimum research quality enforced before bet decision

**Key Decisions Needed:**
- Categories of research tools
- Data persistence strategy (Railway volume vs managed database)
- Integration with existing research chain

**Plans:**
- [ ] 06-01-PLAN.md — Research tools and categorization
- [ ] 06-02-PLAN.md — Railway volume and persistence

---

## Phase Dependencies
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

### Phase 7: Crawl4AI Social Sources - Twitter and Reddit scraping for social media prediction markets

**Goal:** Integrate Twitter and Reddit as research sources via Crawl4AI + Python scrapers. Add social media intelligence to prediction market research pipeline.

**Requirements:** (to be assigned from RES-01-05, SRC-01-04)

**Success Criteria:**
1. TwitterAdapter and RedditAdapter implement ResearchSource interface
2. Python scrapers output JSON via subprocess to TypeScript
3. SourceCategory.SOCIAL enum added for social media sources
4. Social sources integrated into ResearchChain via aggregator
5. Configuration exposed for enabling/disabling social sources
6. Unit tests cover social adapter functionality

**Plans:**
- [x] 07-01-PLAN.md — Python scraper scripts + TypeScript adapters (Twitter, Reddit)
- [ ] 07-02-PLAN.md — ResearchChain integration, config, and tests

---

*Roadmap created: 2026-04-13*
*Auto-approved via --auto mode*
