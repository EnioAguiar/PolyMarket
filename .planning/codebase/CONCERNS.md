# Concerns

## CRITICAL — Bugs That Break Core Safety

### C-01: `forceKillSwitch()` Does Not Exist — `/pause` Is Broken
**File:** `src/api/telegram.ts:122`  
The Telegram `/pause` command calls `safetyModuleRef.forceKillSwitch(true)`, but `SafetyModule` (`src/safety/index.ts`) has no such method — only `resetKillSwitch()`. The call silently fails at runtime. The `isPaused` flag still sets correctly (so new WS events are gated), but the kill switch is never actually activated. `/resume` has the same problem.

### C-02: `evaluateMarketForWebSocket` Not Awaited — Errors Silently Swallowed
**File:** `src/index.ts:120-127`  
`handleWsEvent` is a synchronous function that calls the async `evaluateMarketForWebSocket()` without `await`. Any rejection (CLOB API error, order failure) becomes an unhandled promise rejection that is silently discarded. The market mutex acquired before the call is also never released on failure (see C-04).

### C-03: `recordTrade()` Never Called — Loss Limits Are Dead Code
**File:** `src/websocket/integration.ts:144-178` (no `recordTrade` call)  
After a successful or failed order, `safetyModule.recordTrade()` is never invoked. This means `DailyLossTracker` and `DrawdownTracker` never receive trade results — **BANK-02 (daily loss limit) and BANK-03 (drawdown kill switch) never trigger**. The safety module accumulates no state and will never halt the bot regardless of losses.

### C-04: Market Mutex Leaks on Evaluation Failure
**File:** `src/index.ts:115`, `src/websocket/integration.ts`  
`cycleManager.acquireMarket()` locks a market before `evaluateMarketForWebSocket()` is called. If evaluation throws (and since it's not awaited, C-02 means the error is swallowed), `cycleManager.releaseMarket()` is never called. After enough failed markets, all mutex slots are locked and no new bets can be accepted for the rest of the cycle.

### C-05: No USDC Balance Check Before Order Submission
**File:** `src/websocket/integration.ts:144`  
`placeMarketOrder()` is called without verifying available USDC balance. If the wallet is underfunded, the order fails at the CLOB layer with a generic error. No guard, no early abort, no notification beyond the error log.

### C-06: No On-Chain Transaction Confirmation
**File:** `src/api/clob.ts:178-204`  
After `createAndPostMarketOrder()` returns, the bot treats the order as confirmed and notifies Telegram. The `txHash` is logged but never waited on. If the on-chain transaction is dropped or reverted, the bot has no awareness of it and `cycleManager.resolveBet()` would only trigger if a `market_resolved` WS event arrives.

---

## HIGH — Security

### H-01: Private Key Directly in Environment
**File:** `src/api/clob.ts:37`, `src/api/clob.ts:22`  
`PRIVATE_KEY` env var is loaded inline, normalized, and passed to viem's `privateKeyToAccount`. No key derivation, no HSM, no KMS. Compromise of the `.env` file or Railway environment = full wallet compromise.

### H-02: `config.dryRun: false` Committed
**File:** `config.yaml:5`  
Live trading is the committed default. A fresh clone + `npm start` executes real trades immediately if `PRIVATE_KEY` is set. Should default to `true`.

### H-03: No Input Validation on WebSocket Events
**File:** `src/websocket/client.ts:83`  
WebSocket messages are parsed with `JSON.parse()` and cast directly (`as WsEvent`) with no schema validation. A malformed/malicious message could cause silent incorrect behavior (e.g., wrong `yesTokenId`, incorrect odds).

### H-04: Wallet Address Mutable Global
**File:** `src/api/clob.ts:9-10`  
`clobClient` and `walletAddress` are module-level mutable singletons. Resetting `sharedPublicClient` via `resetSharedPublicClient()` (`src/api/http.ts:18`) leaves them out of sync — potential for stale state if reinit is attempted.

---

## HIGH — Financial Risk

### H-05: Safety Module Bypassed in Dry-Run
**File:** `src/safety/index.ts:34-39`  
When `config.dryRun === true`, `checkBet()` returns `passed: true` unconditionally — all safety logic is skipped. This means switching from dry-run to live trading can expose logic bugs that were hidden during testing.

### H-06: Bankroll Initialized to 0 on Dry-Run
**File:** `src/index.ts:174`  
`SafetyModule` instantiated with `bankroll = 0` when `dryRun = true`, then re-created with real balance if live. If startup fails mid-way and falls back, position size calculations (`getMaxPositionSize`) could divide by zero edge cases.

### H-07: Safety State Not Persisted
**File:** `src/safety/index.ts` — no persistence  
`dailyLoss`, `totalDrawdown`, and `isKillSwitchActive` are in-memory only. A bot restart resets all safety counters. A kill switch triggered by drawdown is cleared on restart — potential for repeated violations across restart cycles.

### H-08: CycleManager State Not Persisted
**File:** `src/betting/cycle.ts` — in-memory only  
Bet cycle state (`bets`, `openedAt`, `waiting24hSince`) is lost on restart. Bot could restart mid-cycle and accept 3 more bets, effectively doubling exposure.

---

## MEDIUM — Reliability

### M-01: WebSocket Reconnect Gives Up After 10 Attempts
**File:** `src/websocket/client.ts:145-148`  
After 10 reconnect attempts (max delay 30s), the bot stops reconnecting and continues running as a health-check-only service. No alert, no exit. Health endpoint reports `wsConnected: false` but the process stays alive.

### M-02: Debug `console.log` Calls in Production Code
**Files:** `src/main.ts:48-53`, `src/api/polymarket.ts:28,36`, `src/api/http.ts:9`  
Leftover debug statements bypass the structured pino logger. They will appear in production logs and cannot be filtered or suppressed without code changes.

### M-03: Orderbook Fetch Has No Retry
**File:** `src/websocket/integration.ts:58-65`  
If `getOrderBook()` fails (network blip, rate limit), the market is silently skipped. No retry logic. High-value market opportunities could be lost on transient errors.

### M-04: Market Order Uses FOK — No Partial Fill Recovery
**File:** `src/api/clob.ts:184`  
Fill-or-kill means the entire order is rejected if it can't be fully filled. No fallback to partial fill or limit order. Bot logs failure and moves on.

### M-05: `clobClient: any` Type
**File:** `src/index.ts:20`  
The CLOB client is typed as `any`. Type errors in API usage will not be caught at compile time.

### M-06: Telegram Module Uses Module-Level Mutable Globals
**File:** `src/api/telegram.ts`  
Bot state, safety module reference, and cycle manager reference are module-level mutable variables set via setters (`setSafetyModule`, `setCycleManager`). Race conditions possible if called out of order.

---

## MEDIUM — Technical Debt

### M-07: Two Parallel Entry Points
**Files:** `src/index.ts` (event-driven), `src/main.ts` (polling)  
`main.ts` is a legacy polling loop that is no longer the primary entry point but remains in codebase and is still exported. The two paths diverge on execution logic (e.g., `main.ts` doesn't use `CycleManager`). Risk of confusion about which path a fix applies to.

### M-08: Research + AI Pipeline Unconnected
**Files:** `src/research/`, `src/ai/`  
Both directories contain substantial code (aggregator, 8+ data sources, AI chain, MiniMax client) that is not imported anywhere in the execution path. The bot makes pure price/liquidity decisions with no market research signal.

### M-09: Dual Position-Sizing Systems
**Files:** `src/safety/position-limits.ts`, `src/bankroll/position-sizing.ts`  
Two separate position-sizing implementations exist. Only `safety/position-limits.ts` is wired in. The `bankroll/` module appears to implement Kelly criterion sizing but is unused.

### M-10: `bankrollUsagePct` Config Field Not Used
**File:** `src/types/index.ts:30` defines `bankrollUsagePct`, `config.yaml` does not set it, `src/main.ts:20` references it but event-driven path ignores it.

---

## LOW — Code Quality

### L-01: `test-apis.ts` in `src/`
**File:** `src/test-apis.ts`  
Manual test/smoke-test script lives in the production source directory. It uses `console.log` throughout and is not part of the test suite.

### L-02: `test-google.cjs` at Root
**File:** `test-google.cjs`  
CJS test script at project root, outside `src/` and `tests/`. Unclear purpose.

### L-03: `safetyModule` Assigned Twice at Startup
**File:** `src/index.ts:174,190,199`  
`SafetyModule` is instantiated 3 times during startup — once with bankroll 0, once with real balance (if live), once in else branch. The first two instances are discarded. Confusing ordering.

### L-04: No Rate Limiting on Market Processing
**File:** `src/websocket/integration.ts`  
Each `new_market` event triggers a CLOB API call (`getOrderBook`). If the WS feed delivers many events rapidly, this could exhaust API rate limits.
