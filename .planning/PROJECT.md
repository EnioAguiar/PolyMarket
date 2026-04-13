# Polymarket Bot

## What This Is

AI-driven prediction market bot for Polymarket that continuously monitors markets, researches relevant sources, and executes short-term bets (5min-24h) automatically. Each market category has optimized research systems (APIs, scrapers, order books). Built with TypeScript + Python, deployed on Railway.

## Core Value

Make profitable short-term betting decisions through systematic AI-powered research, source classification, and disciplined bankroll management.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] **LOOP-01**: Continuous loop: monitor markets → research → analyze → decide → execute
- [ ] **LOOP-02**: Support markets from 5 minutes to 24 hours
- [ ] **CATEG-01**: Category-specific research systems (Crypto, Financial, News, Sports)
- [ ] **SOURCE-01**: Source database with star rating (1-5), minimum ★3 to use
- [ ] **SOURCE-02**: Minimum 10 sources researched before decision
- [ ] **RESEARCH-01**: Research system per category optimized for best sources in that domain
- [ ] **ANALYSIS-01**: AI-powered source classification and odds analysis
- [ ] **EXEC-01**: Automatic bet execution via Polymarket API
- [ ] **BANK-01**: Daily bankroll limit with configurable stake per bet
- [ ] **STACK-01**: TypeScript + Python stack
- [ ] **DEPLOY-01**: Railway deployment with scheduler for continuous loop

### Out of Scope

- Long-term bets (>24h) — too much exposure, not the focus
- Manual betting — fully automated execution only
- Non-Polymarket markets — Polymarket only for v1

## Context

- Polymarket API documented at docs.polymarket.com
- Each category needs different data sources:
  - Crypto: exchange APIs (order books, accumulation), Glassnode, CoinGecko, Twitter
  - Financial: market APIs (order books, indices), Bloomberg, Reuters
  - News/Politics: search engines, scrapers, Twitter/X
  - Sports: sports APIs, Twitter
- Source database will grow over time with successful bets
- Railway for deployment with cron/scheduler for loop timing

## Constraints

- **Tech Stack**: TypeScript (core) + Python (data/ML) — why: TS for type safety, Python for data/AI
- **Execution**: Fully automated — no manual approval for bets
- **Timeframe**: Short-term only (5min-24h)
- **Minimum Research**: 10 sources minimum before bet decision

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| TypeScript + Python | Type safety + AI/data libraries | — Pending |
| Railway deployment | Scheduler + continuous loop | — Pending |
| ★3 minimum source rating | Filter noise, keep quality | — Pending |
| 10 source minimum | Statistical confidence before bet | — Pending |
| Daily bankroll limit | Risk management | — Pending |

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
*Last updated: 2026-04-13 after initialization*
