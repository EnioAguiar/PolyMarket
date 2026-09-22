# Safety Module Correctness — Design Spec

**Date:** 2026-09-21
**Status:** Draft, written without a synchronous approval round-trip, per this session's standing instruction to proceed directly through the sub-project sequence.
**Sub-project 3 of 3** (sub-project 1, Wallet & Trading Correctness, and sub-project 2, Infra Resilience, are both complete).

## Goal

Make the bot's three layers of risk protection — per-cycle bet limit, daily loss limit, drawdown kill switch — actually receive the result of every bet placed, so they can actually block the next one. Today none of them do. Also fix the two related correctness bugs found alongside them (`/pause` crashing, no balance/tx-confirmation guard around real orders) and flip the unsafe committed default (`dryRun: false`).

## Background (evidence from this session's source investigation)

This corrects and deepens `README.md`'s "Problemas Conhecidos" catalog, which under-stated two of these bugs.

- **`cycleManager.addBet()` is defined (`src/betting/cycle.ts:56`) and never called anywhere** (`grep -rn "\.addBet(" src/` → one match, the definition itself). `CycleState.bets` is therefore permanently `[]`.
- **This breaks two independent systems, not one:**
  1. `CycleManager.canAcceptBet()` (`cycle.ts:45`) blocks new bets once `state.bets.length >= maxBetsPerCycle` (3). Since `bets` never grows, this condition is never true — **the 3-bets-per-cycle limit and the 24h cooldown that follows it have never worked.**
  2. `CycleManager.resolveBet()` (`cycle.ts:99-124`) is the *only* call site of `MarketMutex.release()` (`cycle.ts:111`), and it requires finding the bet in `state.bets` first (line 100-104, returns `false` and logs a warning if not found). Since a bet is never added, `resolveBet()` always fails to find it, and the mutex **never releases, on any path, for any market** — not just the error path the old catalog described. `src/index.ts`'s `handleWsEvent` calls `cycleManager.acquireMarket(marketId)` before evaluating a market (line 125) and treats a failed acquire as "already being processed" (line 126) — in reality, once a market has been evaluated even once, it is silently locked out forever.
- **`SafetyModule.recordTrade()` is defined (`safety/index.ts:62-70`) and never called anywhere either.** `DailyLossTracker` and `DrawdownTracker` both hold a shared, mutable `SafetyState` reference (passed by reference from `src/index.ts`'s `initialState` into `SafetyModule`'s constructor, then into both trackers — confirmed: neither tracker clones it). `recordTrade()` is the only thing that ever calls `dailyLossTracker.recordLoss()/recordGain()` or `drawdownTracker.recordTradeResult()`. Without it, `state.dailyLoss` stays `0` and `state.isKillSwitchActive` stays `false` forever, regardless of real trading results.
- **Combined severity: none of the bot's three protection layers has ever received a real trade result.** In production, nothing currently stops the bot from betting on every new market that arrives via WebSocket, indefinitely, with no cap and no loss-triggered shutoff — the only thing that currently limits exposure per-market is the (broken, permanently-locking) mutex, which coincidentally prevents *re-betting the same market* but does nothing to cap *total* exposure across different markets.
- **`/pause` partially works, contrary to the old catalog's "does not work"**: `src/api/telegram.ts:120` sets `isPaused = true` *before* the crash on the next line, and `isBotPaused()` genuinely gates `new_market` events at `src/index.ts:117`. What's actually broken: line 122's `safetyModuleRef.forceKillSwitch(true)` calls a method that does not exist on `SafetyModule` (only `isKillSwitchActive()` and `resetKillSwitch()` exist), throwing inside the command handler before the confirmation reply (line 125) ever sends — the user gets no feedback that `/pause` worked, even though it partially did.
- **No balance check before submitting an order, no on-chain confirmation after** (`src/api/clob.ts`'s `placeMarketOrder`/`placeLimitOrder`, confirmed by reading both in full): the functions trust `result.transactionsHashes?.[0]` from the CLOB response without ever calling `waitForTransactionReceipt` to confirm the transaction landed (vs. reverted, vs. never mined), and never check `getPUSDBalance()` against the requested size before submitting.
- **`config.yaml:4` is committed with `dryRun: false`.** A fresh clone with `PRIVATE_KEY` set trades real money immediately, with no explicit opt-in step.
- **Safety state is process-memory only** (`src/index.ts:179-184`, `src/main.ts:33-38`: `initialState` is always the literal `{ dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false }`, never loaded from anywhere). A restart — including a Railway redeploy — silently resets every counter, including an active kill switch.
- **The geoblock guard added in sub-project 2 doesn't alert or abort** (found during that sub-project's final review): it disables live trading and logs an error, but sends no Telegram notification and doesn't stop the process — if nobody is watching logs, a geoblocked run goes unnoticed.
- **The daily-loss check is mathematically incapable of ever firing, independent of the wiring bug above** — a second, deeper bug that wiring `recordTrade()` alone does NOT fix. `daily-loss.ts:28`'s `recordLoss(amount)` does `this.state.dailyLoss += amount` with `amount = Math.abs(pnl)` (always positive, per `safety/index.ts:64`), so `dailyLoss` accumulates *positively* as losses mount. But `checkDailyLoss()` (`daily-loss.ts:41`) tests `dailyLoss <= -dailyLossLimit` — a *negative* threshold. A positive, growing `dailyLoss` can never be `<=` a negative number, so this check returns `passed: true` forever, no matter how much is lost in a day, even after Design §1's wiring lands. Separately, `recordGain(amount)` (`daily-loss.ts:33`) does `dailyLoss = Math.min(0, dailyLoss - amount)` — under the current (buggy) positive-accumulation convention, subtracting *any* gain amount from a positive `dailyLoss` and flooring at 0 **wipes the entire day's accumulated loss to zero on a single winning trade, regardless of size** (e.g. $500 of accumulated loss + a $1 gain → `min(0, 499) `... actually `min(0, 500-1)=min(0,499)=0` since `Math.min` picks the *lower* value and 0 < 499 — floors to 0 immediately). Both symptoms point to the same root cause: `recordLoss`/`checkDailyLoss`/`recordGain` disagree on whether `dailyLoss` is stored as a positive magnitude or a negative (loss-is-negative) accumulator. `checkDailyLoss` and `recordGain` are both written assuming the negative convention; only `recordLoss` uses the wrong sign.

## Non-Goals

- Rewriting `CycleManager`/`SafetyModule`'s internal algorithms beyond the specific sign-convention bug in Design §1a — position sizing and drawdown math are correct as designed and untouched by this spec.
- A database or external persistence service for safety state — Non-Goal is *scope*, not the whole idea: this spec does add file-based persistence (Design §6), deliberately the simplest option, not a DB.
- Fixing `research/`/`ai/` (deferred by the project owner this session, no funded provider) or connecting Jev/Tavily — separate, later decision.
- Rewriting the WebSocket subscription/event pipeline beyond the one call site this spec touches.
- Retrying a failed/reverted transaction automatically — this spec adds detection (Design §4), not auto-retry.

## Design

### 1a. Fix the daily-loss sign convention — a prerequisite for §1, not optional polish

**File:** `src/safety/daily-loss.ts`

`checkDailyLoss()` and `recordGain()` are both written assuming `dailyLoss` is a negative (loss-is-negative) accumulator; only `recordLoss()` uses the wrong sign. Fix `recordLoss()` to match the other two, not the other way around — `checkDailyLoss`'s `<= -dailyLossLimit` comparison and `recordGain`'s `Math.min(0, ...)` floor both only make sense if losses push the value negative:

```typescript
recordLoss(amount: number): void {
  this.resetIfNewDay();
  this.state.dailyLoss -= amount;
}

recordGain(amount: number): void {
  this.resetIfNewDay();
  this.state.dailyLoss = Math.min(0, this.state.dailyLoss + amount);
}
```

(`checkDailyLoss()` itself is unchanged — it was already correct for the negative convention; `recordLoss` was the only wrong sign.)

With this fix: a sequence of losses moves `dailyLoss` further negative (e.g. `-10`, `-35`, `-60`), and `checkDailyLoss` correctly trips once it crosses below `-dailyLossLimit`. A gain moves `dailyLoss` toward zero by exactly the gain amount (not wiping it to zero outright) and is floored at `0` so gains don't accumulate a same-day "credit" that would let the bot absorb larger losses later in the same day than the configured limit allows — that flooring behavior was already correct in the existing code and is preserved.

This must land in the same task as §1's wiring (Task 1 in the plan) — wiring `recordTrade()` into the real trading path without this fix would make the daily-loss limit *reachable* but still permanently incapable of tripping, which is worse than leaving it visibly disconnected: it would look fixed under a "safety fixed" banner while remaining just as dead.

### 1. Wire `cycleManager.addBet()` and `SafetyModule.recordTrade()` into the real trading path

**File:** `src/websocket/integration.ts`

`evaluateMarketForWebSocket` currently takes `(event, safetyModule, clobClient, config, logger)`. Add a `cycleManager: CycleManager` parameter (import type from `../betting/index.js`).

Immediately after a successful order (the existing `if (execResult.success) { ... }` block, before `updateBotStatus`), add:

```typescript
cycleManager.addBet({
  marketId: event.market,
  assetId: yesTokenId,
  side: 'YES',
  odds,
  size: maxPosition,
});
```

(`addBet`'s signature is `Omit<Bet, 'startedAt' | 'status'>` — the four fields above plus nothing else are required; `cycle.ts`'s `addBet` fills in `startedAt`/`status: 'pending'` itself. Confirm this against `cycle.ts:56-97` at implementation time — read it in full, only its opening lines were read for this spec.)

This makes the market's mutex lock meaningful: a market only stays locked while it has a real pending bet, which is exactly the case `resolveBet()` (already correctly implemented) is built to close out.

**File:** `src/websocket/integration.ts`, `handleMarketResolved`

Currently a bare log line, doesn't touch `cycleManager` or `safetyModule`, and doesn't compute PnL. Change its signature to `handleMarketResolved(marketId, winningOutcome, cycleManager, safetyModule, logger)` and implement:

```typescript
export async function handleMarketResolved(
  marketId: string,
  winningOutcome: string,
  cycleManager: CycleManager,
  safetyModule: SafetyModule,
  logger: pino.Logger
): Promise<void> {
  const bets = cycleManager.getPendingBets().filter((b) => b.marketId === marketId);
  if (bets.length === 0) {
    logger.debug({ marketId }, 'Market resolved, no pending bet for it (never bet, or already resolved)');
    return;
  }
  const bet = bets[0];
  const won = bet.side === winningOutcome;
  // Binary market: a winning YES/NO share pays $1, a losing share pays $0.
  // pnl is relative to the bet's own cost (size = $ staked at time of bet).
  const payout = won ? bet.size / bet.odds : 0;
  const pnl = payout - bet.size;

  cycleManager.resolveBet(marketId, winningOutcome, pnl);

  const newBalance = await getPUSDBalance();
  safetyModule.recordTrade(pnl, newBalance);

  logger.info({ marketId, winningOutcome, won, pnl, newBalance }, 'Market resolution recorded, safety state updated');
}
```

Import `getPUSDBalance` from `../api/clob.js` (already imported elsewhere in this file's sibling `src/index.ts`; add the import here).

**Payout formula note for the implementer:** `bet.odds` was recorded as the mid-price at bet time (`getMidPrice(orderbook)`), used as a proxy for the entry price since `placeMarketOrder` is a FOK market order without a guaranteed fill price. This is an approximation already implicit in the existing code (`executedPrice` is not populated by `placeMarketOrder`, only by `placeLimitOrder` — confirmed in `src/api/clob.ts`); do not invent a more precise figure than the codebase already tracks. If `OrderExecutionResult`'s `executedPrice` field is populated for market orders in the current committed code (verify at implementation time — this spec's investigation found `placeMarketOrder` does not currently set it), prefer that over the pre-trade mid-price.

**File:** `src/index.ts`, the `'market_resolved'` case in `handleWsEvent`

Currently:
```typescript
case 'market_resolved': {
  const resolvedEvent = event as WsMarketResolvedEvent;
  cycleManager?.resolveBet(resolvedEvent.market, resolvedEvent.winning_outcome, 0);
  handleMarketResolved(resolvedEvent.market, resolvedEvent.winning_outcome, logger);
  break;
}
```
This calls `resolveBet` directly (now redundant — `handleMarketResolved` calls it) with a hardcoded `pnl: 0`. Replace with:
```typescript
case 'market_resolved': {
  const resolvedEvent = event as WsMarketResolvedEvent;
  if (cycleManager && safetyModule) {
    handleMarketResolved(resolvedEvent.market, resolvedEvent.winning_outcome, cycleManager, safetyModule, logger)
      .catch((error) => logger.error({ error, marketId: resolvedEvent.market }, 'Failed to record market resolution'));
  }
  break;
}
```

### 2. Fix the mutex leak: release on every non-bet exit path, catch rejections at the call site

**File:** `src/websocket/integration.ts`

`evaluateMarketForWebSocket` has 7 early-return points before a bet is placed (no asset IDs, test-execution mode, orderbook fetch failure, insufficient liquidity, no mid-price, safety check failed, slippage exceeded) plus the dry-run return and the order-failure path. None of these currently touch the mutex — because the mutex is acquired by the *caller* (`src/index.ts`), not this function. Add `cycleManager: CycleManager` to this function's parameters (same import as §1) and wrap the *entire existing body* in try/finally:

```typescript
export async function evaluateMarketForWebSocket(
  event: WsMarketEvent,
  safetyModule: SafetyModule,
  clobClient: any,
  config: Config,
  cycleManager: CycleManager,
  logger: pino.Logger
): Promise<void> {
  let betPlaced = false;
  try {
    // ... existing body unchanged, except:
    // - after a successful order (§1's addBet call), set betPlaced = true;
    // - every existing early `return;` stays a bare `return;` (finally still runs)
  } finally {
    if (!betPlaced) {
      cycleManager.releaseMarket(event.market);
    }
    // if betPlaced is true, the market stays locked until handleMarketResolved's
    // resolveBet() call releases it — this is the intended behavior, not a leak.
  }
}
```

**File:** `src/index.ts`, `handleWsEvent`'s `new_market` case

Currently calls `evaluateMarketForWebSocket(...)` with no `await`, no `.catch()` — an unhandled rejection risk in addition to the mutex issue just fixed. Update the call to pass `cycleManager` (§1's new parameter) and attach a rejection handler as defense-in-depth (the try/finally in §2 should already release the mutex even on a thrown error, but this guards against a bug in that logic crashing the process silently via an unhandled rejection):

```typescript
if (safetyModule && clobClient) {
  evaluateMarketForWebSocket(
    event as WsMarketEvent,
    safetyModule,
    clobClient,
    config,
    cycleManager,
    logger
  ).catch((error) => {
    logger.error({ error, marketId: (event as WsMarketEvent).market }, 'Unhandled error evaluating market, releasing lock');
    cycleManager?.releaseMarket((event as WsMarketEvent).market);
  });
}
```

Do not `await` this call — markets can legitimately be evaluated concurrently (the mutex's job is per-market exclusivity, not global serialization), and `handleWsEvent` is itself called synchronously from the WS message handler.

### 3. Fix `/pause`/`/resume`: remove the call to a method that doesn't exist

**File:** `src/api/telegram.ts`

`isPaused` is already the correct, working mechanism (§ Background). `forceKillSwitch()` conflates two different concepts — a manual operator pause and an automatic risk-triggered kill switch — and doesn't exist. Delete the `forceKillSwitch` calls entirely rather than implementing the method:

```typescript
bot.command('pause', (ctx) => {
  isPaused = true;
  logger.info({ msg: 'Bot paused via Telegram' });
  ctx.reply('⏸️ Bot paused. Use /resume to continue.');
});

bot.command('resume', (ctx) => {
  isPaused = false;
  logger.info({ msg: 'Bot resumed via Telegram' });
  ctx.reply('▶️ Bot resumed.');
});
```

This is a pure deletion (lines 121-123 and 130-132 in the current file) — no new method, no behavior change to the parts that already worked. The confirmation replies now actually send.

### 4. Balance pre-check and on-chain transaction confirmation

**File:** `src/api/clob.ts`

At the top of both `placeMarketOrder` and `placeLimitOrder`, before calling the CLOB client, add a balance check:

```typescript
const requiredAmount = /* placeMarketOrder: amount; placeLimitOrder: price * size */;
const balance = await getPUSDBalance();
if (balance < requiredAmount) {
  logger.error({ tokenId, balance, requiredAmount }, 'Insufficient pUSD balance for order');
  return {
    success: false,
    reason: `Insufficient balance: have ${balance}, need ${requiredAmount}`,
  };
}
```

After a successful order (`result.success` true, inside the existing `if` block), if `result.transactionsHashes?.[0]` is present, confirm it on-chain using the shared public client (`createSharedPublicClient` from `./http.js`, already imported in this file):

```typescript
if (result.transactionsHashes?.[0]) {
  try {
    const publicClient = createSharedPublicClient();
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: result.transactionsHashes[0] as `0x${string}`,
      timeout: 30_000,
    });
    if (receipt.status !== 'success') {
      logger.error({ tokenId, txHash: result.transactionsHashes[0], receipt }, 'Order transaction reverted on-chain');
      return {
        success: false,
        orderID: result.orderID,
        txHash: result.transactionsHashes[0],
        status: result.status,
        reason: `Transaction reverted on-chain (status: ${receipt.status})`,
      };
    }
  } catch (error) {
    // Confirmation timing out or erroring is not the same as a confirmed revert —
    // report it distinctly so callers don't treat an unconfirmed tx as a known failure.
    logger.warn({ tokenId, txHash: result.transactionsHashes[0], error }, 'Could not confirm transaction on-chain within timeout — CLOB accepted it, on-chain status unknown');
  }
}
```

Only add this after the existing `if (!result.success)` early-return block — a rejected order has no tx hash to confirm. Reuse the existing `getPUSDBalance()`/`createSharedPublicClient` imports already present in this file (`getPUSDBalance` is defined in this same file; `createSharedPublicClient` is already imported from `./http.js`).

### 5. Safe default: flip `dryRun` to `true` in `config.yaml`

**File:** `config.yaml`

```yaml
dryRun: true  # true = log decisions only, false = execute real trades. MUST be explicitly
              # flipped to false to trade real money — never commit false as the default.
```

Add a comment to `README.md`'s deploy section (if one doesn't already note this) that production deploys must explicitly override this.

### 6. Persist safety state across restarts — including `peakBankroll`, not just `dailyLoss`/`isKillSwitchActive`

**Files:** new `src/safety/persistence.ts`; modify `src/types/index.ts` (`SafetyState`), `src/safety/drawdown.ts` (`DrawdownTracker`), `src/safety/index.ts` (`SafetyModule.getState()`, `recordTrade()`, `resetKillSwitch()`)

**`DrawdownTracker` holds its own `peakBankroll` as a private constructor-seeded field (`drawdown.ts:10,15`), entirely separate from `SafetyState`.** Persisting only `dailyLoss`/`totalDrawdown`/`isKillSwitchActive` (the original draft of this section) would NOT fix the restart bug for the drawdown kill switch specifically: `DrawdownTracker`'s constructor always sets `this.peakBankroll = initialBankroll` (the *current* real balance read at startup), regardless of what the true historical peak was. After a restart, a bot sitting at $90 with a true historical peak of $100 (10% drawdown, not yet at a 15% kill switch) would restart with `peakBankroll = $90` — collapsing the peak to the current balance and handing the bot a *fresh* 15% allowance to lose from $90, silently erasing the 10% of drawdown "already spent." This must be fixed in the same task as the rest of persistence, not treated as a separate concern — a persistence fix that only covers `dailyLoss`/`isKillSwitchActive` ships under a "restart-safe" banner while leaving the drawdown kill switch exactly as resettable as before.

**Add `peakBankroll` to `SafetyState`** (`src/types/index.ts`):
```typescript
export interface SafetyState {
  dailyLoss: number;
  totalDrawdown: number;
  isKillSwitchActive: boolean;
  peakBankroll?: number; // optional: absent in state files written before this fix, or on first run
  lastTradeTime?: Date;
}
```

**`src/safety/persistence.ts`:**
```typescript
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SafetyState } from '../types/index.js';

const STATE_FILE = process.env.SAFETY_STATE_FILE || 'data/safety-state.json';

export function loadSafetyState(): SafetyState {
  if (!existsSync(STATE_FILE)) {
    return { dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false };
  }
  try {
    const raw = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw) as SafetyState;
  } catch (error) {
    // Corrupt or unreadable state file: fail safe by starting fresh rather than crashing.
    // A fresh start after corruption loses the kill-switch memory — log loudly.
    return { dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false };
  }
}

export function saveSafetyState(state: SafetyState): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}
```

**`src/safety/drawdown.ts`'s `DrawdownTracker` — prefer the restored peak over the current balance:**
```typescript
constructor(config: SafetyModuleConfig, initialState: SafetyState, initialBankroll: number) {
  this.config = config;
  this.state = initialState;
  this.peakBankroll = initialState.peakBankroll && initialState.peakBankroll > initialBankroll
    ? initialState.peakBankroll
    : initialBankroll;
}
```
(A restored peak lower than the current real balance is impossible under correct operation — the peak only ever grows — but falling back to `initialBankroll` in that case is a safe default rather than trusting a stale/corrupt lower number.)

`updatePeak()` must write the new peak back into the shared `state` object so it round-trips through `getState()`/persistence — it currently only updates the local `this.peakBankroll` field:
```typescript
updatePeak(currentBankroll: number): void {
  if (currentBankroll > this.peakBankroll) {
    this.peakBankroll = currentBankroll;
    this.state.peakBankroll = this.peakBankroll;
  }
}
```

**`src/safety/index.ts`'s `SafetyModule.getState()` — expose the peak in the snapshot:**
```typescript
getState(): SafetyState {
  return {
    dailyLoss: this.dailyLossTracker.getDailyLoss(),
    totalDrawdown: this.drawdownTracker.getDrawdown(this.bankroll),
    isKillSwitchActive: this.drawdownTracker.isKillSwitchActive(),
    peakBankroll: this.drawdownTracker.getPeakBankroll(),
  };
}
```
Add a `getPeakBankroll(): number { return this.peakBankroll; }` getter to `DrawdownTracker` (it doesn't currently expose this field at all — confirmed by reading the full class).

Wire persistence in:
- `src/index.ts` and `src/main.ts`: replace the hardcoded `const initialState: SafetyState = { dailyLoss: 0, ... }` literal with `const initialState: SafetyState = loadSafetyState();`.
- `src/safety/index.ts`'s `recordTrade()`: after updating both trackers, call `saveSafetyState(this.getState())`.
- `src/safety/index.ts`'s `resetKillSwitch()`: after resetting, call `saveSafetyState(this.getState())` (an operator resetting the kill switch should persist that decision too).

Add `data/` to `.gitignore` (runtime state, not source).


### 7. Geoblock guard: alert via Telegram

**File:** `src/index.ts`

In the geoblock-guard block added in sub-project 2 (currently `logger.error(...)` only when `geoblock.blocked`), add a call to the existing `notifyError` (already imported from `./api/telegram.js` in `src/websocket/integration.ts`; import it into `src/index.ts` too):

```typescript
if (geoblock.blocked) {
  logger.error({ geoblock }, 'Geoblocked — new orders will be rejected by the CLOB. Trading disabled for this run.');
  notifyError(`Geoblocked (${geoblock.country}/${geoblock.region}, ip ${geoblock.ip}) — live trading disabled for this run.`);
  geoblocked = true;
}
```

Keep the existing "disable trading, keep the process running" behavior (consistent with how `dryRun` is already handled) rather than introducing a harsher process-abort specific to this one condition.

## Testing

- `evaluateMarketForWebSocket`/`handleMarketResolved`'s new cycle/safety wiring: this project's existing test suite (`tests/`) has no coverage of these two functions today (confirmed: `tests/` only covers `slippage`, `arbitrage`, `position-sizing`, `research/social`, `funder-address` — none touch `websocket/integration.ts` or `betting/cycle.ts` end-to-end). Add unit tests for the new PnL computation in `handleMarketResolved` (won/lost cases) and for the mutex-release-on-every-early-return behavior in `evaluateMarketForWebSocket` — these are the two genuinely new pieces of logic, not just wiring.
- **`daily-loss.ts`'s sign-convention fix (Design §1a) MUST have a unit test that would have caught the original bug**: record a loss whose magnitude exceeds `dailyLossLimitPct * bankroll`, then assert `checkDailyLoss()` returns `passed: false`. A test that only checks `dailyLoss`'s stored numeric value without calling `checkDailyLoss()` would not have caught the original bug (the stored value updated fine before this fix — the comparison was what was broken) and does not satisfy this requirement. Also test that `recordGain()` reduces `dailyLoss` by exactly the gain amount (not wiping it to zero) when it doesn't cross zero.
- `/pause`/`/resume`: manual verification only (Telegram integration has no test harness in this project).
- Balance check / tx confirmation: manual verification with a real small order (reuse the pattern from sub-project 1's validation — this project has ~$2.26 pUSD remaining; a balance-check-only smoke test, e.g. attempting to bet more than the balance, requires no real spend and should be the primary test).
- Persistence: unit test `loadSafetyState`/`saveSafetyState` round-trip with a temp file path (override `SAFETY_STATE_FILE`). **MUST include `peakBankroll` in the round-trip** — construct a `DrawdownTracker` with a saved state whose `peakBankroll` exceeds a lower `initialBankroll`, and assert the tracker uses the restored peak (e.g. via `getDrawdown()`/`getPeakBankroll()`), not the lower current balance. A test that only round-trips `dailyLoss`/`isKillSwitchActive` does not satisfy this.
- `config.yaml` default: `grep '^dryRun:' config.yaml` should show `true`.

## Success Criteria

- [ ] `grep -rn "\.addBet(" src/` shows a real call site in `evaluateMarketForWebSocket`, not just the definition.
- [ ] `grep -rn "recordTrade(" src/` shows a real call site in `handleMarketResolved`, not just the definition.
- [ ] `evaluateMarketForWebSocket` releases the market mutex on every path that doesn't end in a placed bet (verified by the new unit test).
- [ ] The `new_market` WS event handler attaches a `.catch()` to `evaluateMarketForWebSocket`'s returned promise.
- [ ] `/pause` and `/resume` no longer call `forceKillSwitch`; both send their confirmation reply (manually verified via a real Telegram interaction, or by reading the code — no crash-inducing call remains).
- [ ] `placeMarketOrder`/`placeLimitOrder` both check `getPUSDBalance()` against the requested amount before submitting, and both attempt `waitForTransactionReceipt` on a returned tx hash before reporting a final `success: true`.
- [ ] `config.yaml`'s `dryRun` is `true`.
- [ ] `src/safety/persistence.ts` exists; `initialState` in both `src/index.ts` and `src/main.ts` is loaded via `loadSafetyState()`, not a hardcoded literal; `recordTrade()` and `resetKillSwitch()` both persist after mutating state.
- [ ] `SafetyState` includes `peakBankroll`; `DrawdownTracker`'s constructor prefers a restored `peakBankroll` over `initialBankroll` when the restored value is higher; `updatePeak()` writes the new peak back into `state.peakBankroll`; a unit test proves the peak survives a simulated restart (lower `initialBankroll`, higher restored `peakBankroll` in the loaded state).
- [ ] `daily-loss.ts`'s `recordLoss()` decrements `dailyLoss` (moves it negative); a unit test records a loss past the configured limit and asserts `checkDailyLoss().passed === false`; `recordGain()` moves `dailyLoss` toward zero by the gain amount rather than flooring it to zero outright when the gain doesn't fully offset the accumulated loss.
- [ ] The geoblock guard calls `notifyError()` when blocked.
- [ ] `npm run build && npx vitest run` passes with the new tests included.
