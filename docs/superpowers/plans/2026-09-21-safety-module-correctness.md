# Safety Module Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bot's three risk-protection layers (per-cycle bet cap, daily loss limit, drawdown kill switch) actually receive real trade results, fix `/pause` crashing, add a balance check and on-chain tx confirmation around real orders, flip the unsafe committed `dryRun` default, persist safety state across restarts, and alert via Telegram when the geoblock guard trips.

**Spec:** `docs/superpowers/specs/2026-09-21-safety-module-correctness-design.md`

## Global Constraints

- `cycleManager.addBet()` and `SafetyModule.recordTrade()` are currently defined but never called anywhere in `src/` (confirmed by grep) — this is the load-bearing bug this plan exists to fix. Any task touching `src/websocket/integration.ts` or `src/index.ts`'s WS event handling MUST NOT leave these still uncalled.
- **`src/safety/daily-loss.ts` has an independent sign-convention bug that wiring `recordTrade()` alone does NOT fix**: `recordLoss()` accumulates `dailyLoss` positively, but `checkDailyLoss()` compares against a negative threshold (`dailyLoss <= -dailyLossLimit`) and `recordGain()` assumes a negative accumulator too — so even after Task 1's wiring lands, the daily-loss limit would still be mathematically incapable of ever tripping. This MUST be fixed in Task 1, in the same commit as the wiring — see spec Design §1a. Task 1 is not complete without it, and its own test coverage (Step 6) MUST include a test that records a loss past the limit and asserts `checkDailyLoss().passed === false` — a test that only inspects the stored `dailyLoss` value without calling `checkDailyLoss()` does not satisfy this.
- The market mutex (`CycleManager`/`MarketMutex`) only releases via `resolveBet()`, which requires the bet to exist in `state.bets` first — it currently never does. A market must stay locked ONLY while it has a real pending bet; every other exit path (no liquidity, safety check failed, dry run, order rejected, etc.) MUST release the lock immediately, not wait for a resolution event that will never come for a market with no open position.
- `SafetyState` (`{ dailyLoss, totalDrawdown, isKillSwitchActive }`) is shared by reference between `DailyLossTracker` and `DrawdownTracker` (both store the same object passed into their constructors, neither clones it) — persistence only needs to read `SafetyModule.getState()`'s snapshot, not manage each tracker's internal reference separately. **`DrawdownTracker`'s `peakBankroll` is NOT part of `SafetyState` today and must be added to it (Task 5)** — persisting only `dailyLoss`/`isKillSwitchActive` without `peakBankroll` would leave the drawdown kill switch resettable on every restart, defeating Task 5's own purpose.
- Do not implement `SafetyModule.forceKillSwitch()` — delete the calls to it in `telegram.ts` instead. `isPaused` is already the correct, working mechanism for stopping new bets; conflating it with the automatic drawdown kill switch is the bug, not the fix.
- `placeMarketOrder`'s FOK orders do not currently populate `OrderExecutionResult.executedPrice` (verify this hasn't changed since the spec was written — if it has, prefer the real executed price over the pre-trade mid-price for PnL math).
- No new test framework or mocking beyond plain Vitest, matching this project's existing convention.
- This project's real trading balance is small (~$2.26 pUSD as of this plan's writing) — any live verification step MUST prefer read-only checks (balance reads, dry-run evaluation) over placing new real orders unless a task explicitly calls for one.

---

### Task 1: Wire `addBet()`/`recordTrade()` into the real trading path, fix the mutex leak, and fix the daily-loss sign bug

**Files:**
- Modify: `src/safety/daily-loss.ts` (fix `recordLoss()`/`recordGain()` sign convention — spec Design §1a)
- Modify: `src/websocket/integration.ts` (`evaluateMarketForWebSocket`, `handleMarketResolved`)
- Modify: `src/index.ts` (`handleWsEvent`'s `new_market` and `market_resolved` cases)

**Interfaces:**
- `evaluateMarketForWebSocket` gains a `cycleManager: CycleManager` parameter (import type from `../betting/index.js`), inserted before the existing `logger` parameter.
- `handleMarketResolved` changes signature from `(marketId, winningOutcome, logger)` to `(marketId, winningOutcome, cycleManager, safetyModule, logger): Promise<void>` (was synchronous `void`, now async).

This is the single most safety-critical task in this plan — read the full spec's Design §1 and §2 before starting, not just this brief.

- [ ] **Step 1: Fix the daily-loss sign convention in `src/safety/daily-loss.ts`**

`checkDailyLoss()` and `recordGain()` are both written assuming `dailyLoss` is a negative (loss-is-negative) accumulator; only `recordLoss()` uses the wrong sign. Fix `recordLoss()` to match — `checkDailyLoss()` itself is unchanged:

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

Without this, wiring `recordTrade()` in the steps below would make the daily-loss limit *reachable* but still mathematically incapable of ever tripping (`checkDailyLoss()` compares against a negative threshold; the old `recordLoss()` only ever pushed `dailyLoss` positive) — see spec Design §1a for the full trace.

- [ ] **Step 2: Read the current full bodies of `evaluateMarketForWebSocket` and `handleMarketResolved`**

Read `src/websocket/integration.ts` in full before editing — this brief describes the changes relative to the code as it existed when the spec was written; confirm line numbers and exact current content first.

- [ ] **Step 3: Add `cycleManager.addBet()` after a successful order in `evaluateMarketForWebSocket`**

Add the `cycleManager: CycleManager` parameter. Inside the existing `if (execResult.success) { ... }` block (after order placement), before `updateBotStatus`, add:

```typescript
cycleManager.addBet({
  marketId: event.market,
  assetId: yesTokenId,
  side: 'YES',
  odds,
  size: maxPosition,
});
```

Verify `addBet`'s exact parameter shape against `src/betting/cycle.ts`'s current `addBet` signature and the `Bet` type in `src/betting/types.ts` before writing this call — the spec's investigation read only `addBet`'s opening lines.

- [ ] **Step 4: Wrap the whole function body in try/finally, releasing the mutex on every non-bet exit**

Introduce a `let betPlaced = false;` at the top of the function body, set it to `true` only in the success path from Step 3, and wrap everything else in:

```typescript
try {
  // existing body
} finally {
  if (!betPlaced) {
    cycleManager.releaseMarket(event.market);
  }
}
```

Every existing early `return;` in the function stays exactly as it is — the `finally` block runs regardless of which `return` fires. Do not add per-branch release calls; the single `finally` covers all of them.

- [ ] **Step 5: Rewrite `handleMarketResolved` to compute PnL and call `resolveBet()` + `recordTrade()`**

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
  const payout = won ? bet.size / bet.odds : 0;
  const pnl = payout - bet.size;

  cycleManager.resolveBet(marketId, winningOutcome, pnl);

  const newBalance = await getPUSDBalance();
  safetyModule.recordTrade(pnl, newBalance);

  logger.info({ marketId, winningOutcome, won, pnl, newBalance }, 'Market resolution recorded, safety state updated');
}
```

Add `import { getPUSDBalance } from '../api/clob.js';` (this file already imports other things from `../api/clob.js` — add to that existing import line rather than a new one, if one exists; check first).

- [ ] **Step 6: Update `src/index.ts`'s `handleWsEvent` — both WS event cases**

`new_market` case: pass `cycleManager` into `evaluateMarketForWebSocket`, and replace the current fire-and-forget call with one that attaches `.catch()`:

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

Do not `await` this call.

`market_resolved` case: replace the current two-call version (a direct `cycleManager?.resolveBet(...)` with hardcoded `pnl: 0`, plus a separate `handleMarketResolved(...)` call) with a single call to the now-async `handleMarketResolved`:

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

- [ ] **Step 7: Add unit tests for the daily-loss fix and the two genuinely new pieces of logic**

In a new `tests/` file (match the existing naming convention, e.g. `tests/market-resolution.test.ts`):
- **Daily-loss sign fix (required, see Global Constraints)**: record a loss whose magnitude exceeds `dailyLossLimitPct * bankroll` via `DailyLossTracker.recordLoss()`, then assert `checkDailyLoss(bankroll).passed === false`. Also test `recordGain()` reduces `dailyLoss` toward zero by the gain amount rather than flooring it to zero outright when the gain doesn't fully offset the accumulated loss.
- Test `handleMarketResolved`'s PnL computation: a won bet returns a positive PnL matching `size/odds - size`; a lost bet returns PnL `-size`; a market with no matching pending bet is a no-op (doesn't call `resolveBet`/`recordTrade`).
- Test that `evaluateMarketForWebSocket` releases the mutex (verify via `cycleManager.isMarketLocked(marketId)` returning `false` after the call resolves) for at least two of its early-return paths (e.g. insufficient liquidity, safety check failed) without needing a live network call — construct fakes/stubs for `getOrderBook`/`hasLiquidity`/etc. matching this project's existing test patterns (check `tests/slippage.test.ts` or `tests/position-sizing.test.ts` for the project's stubbing conventions before writing new ones).

- [ ] **Step 8: Verify build and tests**

Run: `npm run build && npx vitest run`
Expected: build passes, new tests pass, all pre-existing tests (23) still pass.

- [ ] **Step 9: Commit**

```bash
git add src/safety/daily-loss.ts src/websocket/integration.ts src/index.ts tests/market-resolution.test.ts
git commit -m "fix(safety): wire addBet()/recordTrade() into the real trading path, fix universal mutex leak and daily-loss sign bug

cycleManager.addBet() and SafetyModule.recordTrade() were defined but never
called anywhere — the 3-bets-per-cycle limit, daily loss limit, and drawdown
kill switch never received a single real trade result. The market mutex
also never released on any path, because release only happens inside
resolveBet(), which requires the bet to exist in state.bets first.

Also fixed an independent bug that wiring alone would not have caught:
recordLoss() accumulated dailyLoss positively while checkDailyLoss()
compared against a negative threshold, making the daily-loss limit
mathematically incapable of tripping even once wired up.

evaluateMarketForWebSocket now calls addBet() after a successful order and
releases the mutex immediately on every other exit path via try/finally.
handleMarketResolved now computes real PnL and calls both resolveBet() and
recordTrade(), closing the loop all three protection layers were missing."
```

---

### Task 2: Fix `/pause`/`/resume` — remove the call to a nonexistent method

**Files:**
- Modify: `src/api/telegram.ts`

**Interfaces:** None changed — pure deletion within existing command handlers.

- [ ] **Step 1: Remove the `forceKillSwitch` calls**

Change:
```typescript
bot.command('pause', (ctx) => {
  isPaused = true;
  if (safetyModuleRef) {
    safetyModuleRef.forceKillSwitch(true);
  }
  logger.info({ msg: 'Bot paused via Telegram' });
  ctx.reply('⏸️ Bot paused. Use /resume to continue.');
});

bot.command('resume', (ctx) => {
  isPaused = false;
  if (safetyModuleRef) {
    safetyModuleRef.forceKillSwitch(false);
  }
  logger.info({ msg: 'Bot resumed via Telegram' });
  ctx.reply('▶️ Bot resumed.');
});
```
to:
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

Do not implement `forceKillSwitch` on `SafetyModule` — this is a deliberate deletion, not a stub to fill in. If `safetyModuleRef` becomes unused as a result anywhere else in this file, leave its declaration and setter (`setSafetyModule`) in place — it's still used elsewhere in this file (e.g. status/bankroll reporting); verify this by reading the full file before assuming it's now dead.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/api/telegram.ts
git commit -m "fix(telegram): remove /pause and /resume's call to SafetyModule.forceKillSwitch(), which doesn't exist

isPaused was already being set correctly and is the real, working
mechanism gating new bets (checked in src/index.ts's handleWsEvent). The
forceKillSwitch call crashed the command handler before the confirmation
reply could send, and conflated a manual operator pause with the
automatic drawdown kill switch — two different concepts. Deleted rather
than implemented."
```

---

### Task 3: Balance pre-check and on-chain transaction confirmation for real orders

**Files:**
- Modify: `src/api/clob.ts`

**Interfaces:** `OrderExecutionResult`'s existing fields are sufficient — no new fields needed, only new failure paths using the existing `success`/`reason` shape.

- [ ] **Step 1: Add a balance pre-check to both `placeMarketOrder` and `placeLimitOrder`**

At the top of each function (before constructing `orderSide`/calling the CLOB client), add:

```typescript
const requiredAmount = amount; // placeMarketOrder
// or: const requiredAmount = price * size; // placeLimitOrder
const balance = await getPUSDBalance();
if (balance < requiredAmount) {
  logger.error({ tokenId, balance, requiredAmount }, 'Insufficient pUSD balance for order');
  return {
    success: false,
    reason: `Insufficient balance: have ${balance}, need ${requiredAmount}`,
  };
}
```

`getPUSDBalance` is already defined in this same file — no new import needed.

- [ ] **Step 2: Add on-chain transaction confirmation after a successful order**

Inside the existing `if (result.success)` branch (after the early-return for `!result.success` has already been handled), before the final `return { success: true, ... }`, add:

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
    logger.warn({ tokenId, txHash: result.transactionsHashes[0], error }, 'Could not confirm transaction on-chain within timeout — CLOB accepted it, on-chain status unknown');
  }
}
```

`createSharedPublicClient` is already imported from `./http.js` in this file (used by `getPUSDBalance`) — reuse the existing import, do not add a duplicate.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual verification (read-only, no new spend)**

Write a throwaway script (delete after, do not commit) that calls `placeMarketOrder` or `placeLimitOrder` with an amount larger than the real current balance (e.g. `getPUSDBalance() + 100`), confirming it returns `{ success: false, reason: "Insufficient balance..." }` without ever reaching the CLOB client — this proves the balance check fires before any network call that could cost money. Do not test the tx-confirmation path with a new real order; the balance-check test alone is sufficient given this project's limited remaining balance (per Global Constraints).

- [ ] **Step 5: Commit**

```bash
git add src/api/clob.ts
git commit -m "fix(clob): add balance pre-check and on-chain tx confirmation to placeMarketOrder/placeLimitOrder

Both functions previously trusted the CLOB's returned transactionsHashes
without confirming the transaction actually landed on-chain (vs. reverted
or never mined), and never checked the real pUSD balance before
submitting an order that could exceed it."
```

---

### Task 4: Safe `dryRun` default and geoblock Telegram alert

**Files:**
- Modify: `config.yaml`
- Modify: `src/index.ts`

Batched together — both are small, independent, same-shape safety-default fixes with no shared code.

- [ ] **Step 1: Flip `config.yaml`'s `dryRun` default**

```yaml
dryRun: true  # true = log decisions only, false = execute real trades. MUST be explicitly
              # flipped to false to trade real money — never commit false as the default.
```

- [ ] **Step 2: Add a Telegram alert to the geoblock guard**

In `src/index.ts`'s geoblock-guard block (added in sub-project 2), inside the `if (geoblock.blocked) { ... }` branch, add a call to `notifyError` (import from `./api/telegram.js`, alongside this file's other `./api/telegram.js` imports):

```typescript
if (geoblock.blocked) {
  logger.error({ geoblock }, 'Geoblocked — new orders will be rejected by the CLOB. Trading disabled for this run.');
  notifyError(`Geoblocked (${geoblock.country}/${geoblock.region}, ip ${geoblock.ip}) — live trading disabled for this run.`);
  geoblocked = true;
}
```

Keep the existing "disable trading, keep process running" behavior — do not add a process exit/abort here.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add config.yaml src/index.ts
git commit -m "fix(safety): flip committed dryRun default to true, alert via Telegram when geoblocked

A fresh clone with PRIVATE_KEY set previously traded real money
immediately with no explicit opt-in. The geoblock guard (sub-project 2)
disabled trading correctly but never notified anyone — a geoblocked run
would go unnoticed without someone watching logs."
```

---

### Task 5: Persist safety state across restarts — including `peakBankroll`

**Files:**
- Modify: `src/types/index.ts` (`SafetyState` gains optional `peakBankroll`)
- Create: `src/safety/persistence.ts`
- Modify: `src/safety/drawdown.ts` (`DrawdownTracker` — prefer restored peak, add `getPeakBankroll()`, `updatePeak()` writes back into `state`)
- Modify: `src/safety/index.ts` (`getState()` exposes `peakBankroll`; `recordTrade()`, `resetKillSwitch()` persist after mutating)
- Modify: `src/index.ts` (replace hardcoded `initialState` literal)
- Modify: `src/main.ts` (same)
- Modify: `.gitignore` (add `data/`)

**Interfaces:** `export function loadSafetyState(): SafetyState` and `export function saveSafetyState(state: SafetyState): void` from `src/safety/persistence.ts`; `DrawdownTracker` gains `getPeakBankroll(): number`.

Read spec Design §6 in full before starting — `DrawdownTracker` holds `peakBankroll` as a field entirely separate from `SafetyState`, and persisting only `dailyLoss`/`isKillSwitchActive` would leave the drawdown kill switch just as resettable as before. This task is not complete without the `peakBankroll` fix — it is not a nice-to-have addition to persistence, it's the part of persistence that makes the drawdown kill switch survive a restart at all.

- [ ] **Step 1: Add `peakBankroll` to `SafetyState`**

In `src/types/index.ts`:
```typescript
export interface SafetyState {
  dailyLoss: number;
  totalDrawdown: number;
  isKillSwitchActive: boolean;
  peakBankroll?: number;
  lastTradeTime?: Date;
}
```

- [ ] **Step 2: Create `src/safety/persistence.ts`**

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
    return { dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false };
  }
}

export function saveSafetyState(state: SafetyState): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}
```

- [ ] **Step 3: Fix `DrawdownTracker` to prefer a restored peak over the current balance**

In `src/safety/drawdown.ts`, change the constructor:
```typescript
constructor(config: SafetyModuleConfig, initialState: SafetyState, initialBankroll: number) {
  this.config = config;
  this.state = initialState;
  this.peakBankroll = initialState.peakBankroll && initialState.peakBankroll > initialBankroll
    ? initialState.peakBankroll
    : initialBankroll;
}
```

Change `updatePeak()` to write the new peak back into the shared state object (it currently only updates the local field):
```typescript
updatePeak(currentBankroll: number): void {
  if (currentBankroll > this.peakBankroll) {
    this.peakBankroll = currentBankroll;
    this.state.peakBankroll = this.peakBankroll;
  }
}
```

Add a new getter (this class does not currently expose `peakBankroll` at all):
```typescript
getPeakBankroll(): number {
  return this.peakBankroll;
}
```

- [ ] **Step 4: Expose `peakBankroll` in `SafetyModule.getState()`**

In `src/safety/index.ts`:
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

- [ ] **Step 5: Wire `loadSafetyState()` into both entry points**

In `src/index.ts` and `src/main.ts`, replace the hardcoded literal:
```typescript
const initialState: SafetyState = {
  dailyLoss: 0,
  totalDrawdown: 0,
  isKillSwitchActive: false,
};
```
with:
```typescript
const initialState: SafetyState = loadSafetyState();
```
Add the import `import { loadSafetyState } from './safety/persistence.js';` to both files. `src/index.ts` has exactly one such literal (confirmed at line 179, reused at 3 call sites further down `main()`) — replacing that single declaration covers all 3 uses automatically since they all reference the same `initialState` variable. `src/main.ts` has one literal (line 33), same treatment.

- [ ] **Step 6: Persist after every state mutation in `SafetyModule`**

In `src/safety/index.ts`, add `import { saveSafetyState } from './persistence.js';`. At the end of `recordTrade()`:
```typescript
recordTrade(pnl: number, newBankroll: number): void {
  // ... existing body ...
  saveSafetyState(this.getState());
}
```
At the end of `resetKillSwitch()`:
```typescript
resetKillSwitch(): void {
  this.drawdownTracker.resetKillSwitch();
  saveSafetyState(this.getState());
}
```

- [ ] **Step 7: Add `data/` to `.gitignore`**

Append `data/` if not already present.

- [ ] **Step 8: Unit test the persistence round-trip, including `peakBankroll` survival**

New test file `tests/safety-persistence.test.ts`:
- `loadSafetyState`/`saveSafetyState` round-trip with a temp file path (override `SAFETY_STATE_FILE`), including a state with `peakBankroll` set.
- `loadSafetyState` returns the zeroed default when the file doesn't exist, and when it contains invalid JSON.
- **Required**: construct a `DrawdownTracker` with an `initialState` whose `peakBankroll` (e.g. `100`) exceeds a lower `initialBankroll` (e.g. `90`, simulating a restart after a loss) — assert `getPeakBankroll()` returns `100`, not `90`. This is the test that would have caught the original gap; a test that only round-trips `dailyLoss`/`isKillSwitchActive` does not satisfy this requirement.
- Clean up the temp file after each test.

- [ ] **Step 9: Verify build and tests**

Run: `npm run build && npx vitest run`
Expected: build passes, new tests pass, all pre-existing tests still pass.

- [ ] **Step 10: Commit**

```bash
git add src/types/index.ts src/safety/persistence.ts src/safety/drawdown.ts src/safety/index.ts src/index.ts src/main.ts .gitignore tests/safety-persistence.test.ts
git commit -m "fix(safety): persist safety state to disk including peakBankroll, survives same-container restarts

initialState was always the hardcoded zeroed literal — a restart silently
reset every counter, including an active kill switch. Critically,
DrawdownTracker's peakBankroll was never part of SafetyState at all, so
even naive dailyLoss/isKillSwitchActive persistence would have left the
drawdown kill switch collapsing its peak to the current balance on every
restart, silently erasing already-accumulated drawdown. Fixed by adding
peakBankroll to SafetyState and having DrawdownTracker prefer the restored
value over the current balance.

Note this survives a same-container restart but not necessarily a fresh
Railway deploy onto a new filesystem unless a persistent volume is
mounted at data/."
```


---

### Task 6: End-to-end verification and README update

**Files:** None modified besides `README.md`.

- [ ] **Step 1: Full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds, all tests pass (pre-existing 23 plus this plan's new tests from Tasks 1 and 5).

- [ ] **Step 2: Static confirmation of the wiring**

Read `src/websocket/integration.ts` and `src/index.ts` and confirm by inspection:
- `cycleManager.addBet(...)` is called in the success path of `evaluateMarketForWebSocket`.
- `SafetyModule.recordTrade(...)` is called in `handleMarketResolved`.
- The mutex-release `finally` block covers every early-return path.
- `/pause`/`/resume` no longer reference `forceKillSwitch`.

- [ ] **Step 3: Manual read-only verification of the balance check**

Reproduce Task 3 Step 4's throwaway-script result (or reuse its evidence from that task's report if the same session) — confirm an over-balance order attempt is rejected before any network call.

- [ ] **Step 4: Update README.md**

- "Problemas Conhecidos" section: mark every item this plan fixed as resolved (referencing this plan's commits), following the same `~~strikethrough~~ ✅` pattern used for the resolved items in "Próximos Passos".
- "Próximos Passos" item 8 ("Corrigir os bugs críticos do Safety Module...") — mark done, referencing `docs/superpowers/plans/2026-09-21-safety-module-correctness.md`.
- Note the persistence limitation from Task 5 (survives same-container restart, not necessarily a fresh deploy without a mounted volume) explicitly — do not let this read as a full fix if the Railway deployment doesn't have a persistent volume attached (confirm current Railway volume config if determinable from `railway.json`/`railpack.json`; if not determinable from the repo, say so).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: mark safety module correctness sub-project complete"
```
