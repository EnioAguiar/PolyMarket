# State: Polymarket Bot

**Last updated:** 2026-04-13 after initialization

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-13)

**Core value:** Make profitable short-term betting decisions through systematic AI-powered research, source classification, and disciplined bankroll management.

## Session Context

**Current phase:** Not started (milestone v1.0)

## Decisions Log

| Phase | Decision | Rationale | Outcome |
|-------|----------|-----------|--------|
| Init | TypeScript + Python stack | Type safety + AI/data libraries | — Pending |
| Init | Railway deployment | Scheduler + continuous loop | — Pending |
| Init | ★3 minimum source rating | Filter noise, keep quality | — Pending |
| Init | 10 source minimum | Statistical confidence before bet | — Pending |
| Init | Daily bankroll limit | Risk management | — Pending |
| Init | Auto-approve roadmap | Research provides strong foundation | — Pending |

## Blockers

(None yet)

## Current Work

(None — project initialized, ready for Phase 1)

## Notes

- Polymarket API docs: https://docs.polymarket.com/
- Railway cron min 5-min interval, exits after execution
- PostgreSQL on Railway is persistent (via volumes)
- SQLite loses data on redeploy (do not use)

---
*State updated: 2026-04-13 after initialization*
