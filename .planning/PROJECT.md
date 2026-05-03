# Polymarket Bot

## What This Is

AI-driven prediction market bot for Polymarket that continuously monitors markets, researches relevant sources, and executes short-term bets (5min-24h) automatically. Each market category has optimized research systems (APIs, scrapers, order books). Built with TypeScript + Python, deployed on Railway.

## Core Value

Make profitable short-term betting decisions through systematic AI-powered research, source classification, and disciplined bankroll management.

## Current Milestone: v1.1 Production Betting

**Goal:** Bot places real bets with full research pipeline and AI decision support.

**Target features:**
- Real order execution (not dry-run)
- Full research flow (10+ sources)
- AI-powered bet/skip decisions

## Requirements

### Validated (v1.0)

- ✓ **LOOP-01** — Continuous loop: monitor markets → research → analyze → decide → execute — v1.0
- ✓ **LOOP-02** — Support markets from 5 minutes to 24 hours — v1.0
- ✓ **CATEG-01** — Category-specific research systems — v1.0
- ✓ **SOURCE-01** — Source database with star rating — v1.0
- ✓ **EXEC-01** — Polymarket API client (dry-run) — v1.0
- ✓ **BANK-01** — Daily bankroll limit with configurable stake — v1.0
- ✓ **STACK-01** — TypeScript + Python stack — v1.0
- ✓ **DEPLOY-01** — Railway deployment — v1.0

### Active (v1.1)

- [ ] **EXEC-01v2**: Bot places market orders (not dry-run)
- [ ] **EXEC-02**: Position size follows bankroll rules (5% fixed)
- [ ] **EXEC-03**: Slippage protection on orders
- [ ] **RES-01**: ResearchChain collects from all sources
- [ ] **RES-02**: Minimum 10 sources enforced before decision
- [ ] **RES-03**: Bayesian confidence scoring applied
- [ ] **AI-01**: MiniMax receives research summary
- [ ] **AI-02**: AI outputs probability estimate

### Out of Scope

- Limit orders — market orders first, limit later
- Kelly Criterion — fixed 5% is simpler
- Non-Polymarket markets — Polymarket only for v1
- Manual betting — fully automated only

## Context

- Polymarket API docs: docs.polymarket.com
- v1.0 infrastructure complete: WebSocket, research adapters, safety module, Telegram
- Wallet connected with PRIVATE_KEY in Railway env vars
- Next: wire up actual order execution

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript + Python | Type safety + AI/data libraries | ✓ Validated v1.0 |
| Railway deployment | Scheduler + continuous loop | ✓ Validated v1.0 |
| ★3 minimum source rating | Filter noise, keep quality | ✓ Validated v1.0 |
| 10 source minimum | Statistical confidence before bet | ✓ Validated v1.0 |
| Fixed 5% position sizing | Simpler than Kelly, less AI hallucination | ✓ Validated v1.0 |
| Telegram for control | Human oversight via /pause, /resume | ✓ Validated v1.0 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 after v1.0 milestone complete, starting v1.1*