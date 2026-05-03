---
status: complete
date: 2026-05-03
quick_id: 260503-bnk
slug: bankroll-percentage-telegram-logs
---

## Bankroll Percentage + Telegram Status Logs

**Completed:** 2026-05-03

### Tasks Done

1. ✓ **getUSDCBalance** in clob.ts — reads USDC balance via viem public client
2. ✓ **BANKROLL_USAGE_PCT** config — use X% of real balance (default 50%)
3. ✓ **Telegram status notifications** — notifyBotStatus(), notifyError()
4. ✓ **updateBotStatus** tracking — wsConnected, marketsProcessed, betsPlaced, errorsCount

### Changes

- `src/api/clob.ts` — Added `getWalletAddress()`, `getUSDCBalance()`, `USDC_ADDRESS` constant
- `src/api/telegram.ts` — Added `BotStatus` interface, `updateBotStatus()`, `notifyBotStatus()`, `notifyError()`
- `src/index.ts` — Reads real balance on startup, updates bot status
- `src/websocket/integration.ts` — Updates status on market processed, bet placed, errors
- `config.yaml` — Added `bankrollUsagePct: 0.50`

### Usage

- With $10 USDC and 50% bankroll usage → effective bankroll = $5
- Max position per bet = 8% of $5 = $0.40
- Telegram receives status updates automatically

### Verification

- Build passes ✓
- Commit: `59d50335`