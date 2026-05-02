---
phase: 03-bankroll-management-first-strategy
plan: 01
subsystem: bankroll
tags: [bankroll, position-sizing, exposure-caps, typescript]

# Dependency graph
requires:
  - phase: 01
    provides: Polymarket API client, safety module
provides:
  - Bankroll module with position sizing and category exposure caps
affects: [03-02, 04]

# Tech tracking
tech-stack:
  added:
    - src/bankroll/types.ts
    - src/bankroll/position-sizing.ts
    - src/bankroll/exposure-caps.ts
    - src/bankroll/index.ts
  patterns:
    - "Fixed percentage position sizing (5% default)"
    - "Category-level exposure caps (10-20%)"
    - "Research quality adjusts effective position percentage"

key-files:
  created:
    - src/bankroll/types.ts
    - src/bankroll/position-sizing.ts
    - src/bankroll/exposure-caps.ts
    - src/bankroll/index.ts

key-decisions:
  - "Fixed 5% position sizing (NOT Kelly Criterion) — simpler, predictable"
  - "Minimum 5 token threshold enforced — skip bet if below"
  - "Category exposure capped at 10-20% based on research quality"

patterns-established:
  - "BankrollState interface for persistent state tracking"
  - "CategoryExposure tracking per category"
  - "Research quality adjusts effective position percentage"

requirements-completed:
  - BANK-05

# Metrics
duration: unknown (retroactively documented)
completed: 2026-04-19
---

# Phase 03-01: Bankroll Management Summary

**Bankroll module with position sizing and category exposure caps implemented**

## Accomplishments
- BankrollState interface tracks total bankroll, available, open positions, P&L
- Fixed 5% position sizing (not Kelly) — predictable, less AI hallucination
- Minimum 5 token threshold enforced per D-03
- Category exposure caps at 10-20% based on research quality
- All functions have TypeScript types

## Files Created/Modified
- `src/bankroll/types.ts` — BankrollState, CategoryExposure, PositionSizingInput, PositionSizingResult types
- `src/bankroll/position-sizing.ts` — calculatePositionSize, getEffectivePositionPct
- `src/bankroll/exposure-caps.ts` — calculateCategoryExposure, calculateAllExposures, checkExposureCap
- `src/bankroll/index.ts` — Module entry point exporting all functions

## Key Implementation Details

### Position Sizing (D-01, D-04)
- Fixed 5% of bankroll per bet
- NOT Kelly Criterion — simpler, predictable
- Minimum 5 token threshold (D-03)

### Category Exposure (D-05 to D-08)
- Crypto: 20%, Financial: 15%, News: 10%, Sports: 10%
- Research quality adjusts effective cap:
  - Low quality → conservative (max 10%)
  - High quality → moderate (up to 20%)

## Success Criteria
- [x] BankrollState tracks total, available, open positions, P&L
- [x] calculatePositionSize uses fixed 5% (not Kelly)
- [x] Minimum 5 token threshold enforced
- [x] Category exposure capped at 10-20%
- [x] Research quality adjusts effective cap
- [x] All functions have TypeScript types

---
*Phase: 03-01*
*Completed: 2026-04-19 (retroactively documented)*
