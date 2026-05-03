# Roadmap: Polymarket Bot

**Created:** 2026-04-13
**Granularity:** Standard (4 phases, 3-5 plans each)
**Mode:** YOLO (auto-approved)

---

## Milestone v1.1: Production Betting

**Goal:** Bot places real bets with full research pipeline and AI decision support.

**Previous milestone:** v1.0 (Monitoring only - complete)

**Key decisions from v1.0:**
- TypeScript + Python stack
- Railway deployment
- Telegram for control
- 10 source minimum before bet decision

---

## Phase Summary

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|-----------------|
| 1 | Real Bet Execution | Place actual orders on Polymarket | EXEC-01, EXEC-02 | 4 criteria |
| 2 | Research Pipeline | Full research flow before bet decision | RES-01, RES-02 | 4 criteria |
| 3 | AI Integration | MiniMax decision chain for bet/skip | AI-01, AI-02 | 3 criteria |

---

## Phase 1: Real Bet Execution

**Goal:** Bot executes real trades on Polymarket. Wallet connected, orders placed.

**Requirements:** EXEC-01, EXEC-02

**Success Criteria:**
1. Bot places market orders via CLOB client (not dry-run)
2. Position size follows bankroll rules (5% fixed)
3. Slippage protection triggers if price moves beyond threshold
4. Order confirmation logged with transaction hash

**Plans:**
- [x] 01-01-PLAN.md — Place order function (connect wallet, call API)
- [x] 01-02-PLAN.md — Slippage protection and order validation
- [x] 01-03-PLAN.md — Test with real small bet

---

## Phase 2: Research Pipeline

**Goal:** Research 10+ sources before any bet decision. Full flow integrated.

**Requirements:** RES-01, RES-02

**Success Criteria:**
1. ResearchChain.collectSignals() fetches from all available sources
2. Minimum 10 sources enforced before decision
3. Bayesian confidence scoring applied
4. Research quality affects position size

**Plans:**
- [ ] 02-01-PLAN.md — ResearchChain integration with all sources
- [ ] 02-02-PLAN.md — 10 source minimum enforcement
- [ ] 02-03-PLAN.md — Research quality → position size adjustment

---

## Phase 3: AI Integration

**Goal:** MiniMax decides bet/skip based on research signals and confidence.

**Requirements:** AI-01, AI-02

**Success Criteria:**
1. MiniMax receives research summary and confidence
2. AI outputs probability estimate with reasoning
3. AI decision overrides rule-based when confidence is high

**Plans:**
- [ ] 03-01-PLAN.md — AI chain with research input
- [ ] 03-02-PLAN.md — AI decision → bet execution flow
- [ ] 03-03-PLAN.md — Fallback to rule-based when AI unavailable

---

## Phase Dependencies

```
Phase 1 (Real Bet Execution)
    │
    ├── Phase 2 (Research Pipeline) — depends on place-order working
    │
    └── Phase 3 (AI Integration) — depends on research pipeline
```

---

## Milestone v1.1

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1 | ○ Pending | 3/3 | 0% |
| 2 | ○ Pending | 3/3 | 0% |
| 3 | ○ Pending | 3/3 | 0% |

**Overall:** 0/9 plans complete (0%)

---