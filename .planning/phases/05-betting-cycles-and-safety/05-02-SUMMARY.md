---
phase: 05-betting-cycles-and-safety
plan: 02
subsystem: telegram
tags: [telegram, bot, commands, pause, resume]

# Dependency graph
requires:
  - phase: 05-01
    provides: CycleManager, kill switch
provides:
  - Telegram bot with commands for status, pause, resume
affects: [index]

# Tech tracking
tech-stack:
  added:
    - src/api/telegram.ts
    - package.json (telegraf)
  patterns:
    - "Telegram bot with telegraf library"
    - "Commands: /status, /cycle, /pause, /resume, /bankroll"

key-files:
  created:
    - src/api/telegram.ts
  modified:
    - src/index.ts
    - package.json

key-decisions:
  - "telegraf library for TypeScript-friendly Telegram bot"
  - "Pause sets kill switch via safetyModule.forceKillSwitch()"
  - "Telegram disabled if TELEGRAM_BOT_TOKEN not set"

patterns-established:
  - "Telegram bot as module with init/stop lifecycle"
  - "References to cycleManager and safetyModule via setters"

requirements-completed:
  - MON-05
  - DEPL-06

# Metrics
duration: ~30 minutes
completed: 2026-05-02
---

# Phase 05-02: Telegram Bot Summary

**Telegram bot interface implemented for bot control and status visibility**

## Accomplishments
- Telegram bot with commands: /start, /help, /status, /cycle, /pause, /resume, /bankroll
- Integration with cycleManager and safetyModule via setter injection
- Pause/resume toggles kill switch via safetyModule.forceKillSwitch()
- Graceful shutdown handles Telegram bot stop
- TELEGRAM_BOT_TOKEN env var enables/disables bot

## Files Created/Modified
- `src/api/telegram.ts` — Telegram bot module (new)
- `src/index.ts` — Added Telegram initialization and pause check
- `package.json` — Added telegraf dependency

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message with available commands |
| `/status` | Quick overview: cycle status, open bets, P&L |
| `/cycle` | Detailed cycle info: bets, times, state transitions |
| `/pause` | Activate kill switch to stop betting |
| `/resume` | Deactivate kill switch to allow betting |
| `/bankroll` | Current bankroll state |

## Success Criteria
- [x] Telegram bot responds to /status with cycle and bankroll info
- [x] Telegram bot responds to /cycle with detailed cycle state
- [x] /pause activates kill switch to stop betting
- [x] /resume deactivates kill switch
- [x] TypeScript compilation passes
- [x] Bot disabled when TELEGRAM_BOT_TOKEN not set

---
*Phase: 05-02*
*Completed: 2026-05-02*
