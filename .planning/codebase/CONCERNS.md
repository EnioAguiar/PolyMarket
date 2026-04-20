# Codebase Concerns

**Analysis Date:** 2026-04-19

## Security Concerns

### Private Key Exposure via Environment Variables
- **Files:** `src/api/clob.ts:12-17`
- **Issue:** `PRIVATE_KEY` read directly from `process.env` without validation. If logged or mishandled, wallet private key is exposed.
- **Current:** Throws error if missing, but key must be set in Railway environment variables.
- **Risk:** Key could be inadvertently logged via pino's default serialization if error objects contain env vars.
- **Recommendation:** Validate key format before use, never log full key.

### Hardcoded Demo API Key
- **File:** `src/ai/chain.ts:12`
- **Issue:** `new MiniMaxAI(process.env.MINIMAX_API_KEY || 'demo-key')` silently falls back to `'demo-key'`.
- **Risk:** If `MINIMAX_API_KEY` is unset, the bot uses a fake key without alerting operators.
- **Recommendation:** Fail fast if required API keys are missing.

### API Credentials via Environment (Google)
- **File:** `src/research/google.ts:13-14`
- **Issue:** `GOOGLE_API_KEY` and `GOOGLE_SEARCH_ENGINE_ID` are checked at runtime via `isAvailable()`, but no error is thrown if missing.
- **Risk:** Silent failure of Google research source if credentials not configured.

### Config File Contains Production Settings
- **File:** `config.yaml`
- **Issue:** Contains `dryRun: true` but also real Polymarket endpoints (`host: "https://clob.polymarket.com"`, `chainId: 137`).
- **Risk:** If accidentally set to `dryRun: false`, bot would attempt real trades.
- **Recommendation:** Separate dry-run config from production config, require explicit flag.

---

## Reliability Concerns

### Hardcoded Bankroll Values
- **Files:**
  - `src/main.ts:24` - `const initialBankroll = 1000;`
  - `src/main.ts:150` - `const bankroll = 1000;`
- **Issue:** Bankroll is hardcoded to 1000 instead of loading from persistent state or config.
- **Impact:** Safety calculations use wrong bankroll, position sizing is incorrect.
- **Recommendation:** Load from database or config.

### In-Memory Safety State (Not Persisted)
- **File:** `src/safety/index.ts`
- **Issue:** Safety state (`dailyLoss`, `totalDrawdown`, `isKillSwitchActive`) exists only in memory.
- **Impact:** Restarting the bot resets all safety tracking. Kill switch state lost.
- **Recommendation:** Persist to PostgreSQL database.

### SQLite Database on Ephemeral Filesystem
- **Files:** `src/db/index.ts:6`, `src/db/push.ts`
- **Issue:** `DB_PATH = resolve(process.env.DATA_DIR || './data', 'sources.db')` writes to local filesystem.
- **Impact:** On Railway, `./data` is in the container's ephemeral filesystem. Data is lost on every redeploy.
- **Recommendation:** Use Railway's PostgreSQL template for persistence.

### WebSocket Reconnection Logic Incomplete
- **File:** `src/research/binance.ts:14-15,69-71`
- **Issue:** `maxReconnectAttempts = 3` but `reconnectAttempts` is never incremented. `isAvailable()` always returns true if reconnectAttempts < 3.
- **Impact:** WebSocket failures won't trigger proper reconnection.

### Error Swallowing in Market Loop
- **File:** `src/main.ts:84-86`
- **Issue:** Catch block logs error but continues processing other markets.
- **Impact:** One bad market doesn't stop the cycle, but errors aren't propagated for alerting.

---

## Missing Pieces (Phase 4 Not Implemented)

### Research Phase Not Wired to Main Loop
- **File:** `src/main.ts:73`
- **Issue:** `evaluateMarket()` never calls `ResearchChain` or `AIChain`. The `research/` and `ai/` modules exist but are never invoked from `runBotCycle()`.
- **Evidence:** `evaluateMarket()` returns `action: 'monitor'` (line 172) with reason "Phase 1 - monitoring only, no execution".
- **Impact:** Bot only fetches markets and checks liquidity/safety, never performs actual research.

### Execution Module Never Called
- **Files:** `src/execution/limit-orders.ts`, `src/execution/slippage.ts`, `src/execution/arbitrage.ts`
- **Issue:** Functions `placeLimitOrder`, `placeMarketOrder`, `checkSlippage`, `checkArbitrage` exist but are never imported or called from `main.ts`.
- **Impact:** Even if `dryRun: false`, no actual order placement code runs.

### Research Sources Not Initialized
- **Files:** `src/research/binance.ts`, `src/research/google.ts`
- **Issue:** `BinanceAdapter` and `GoogleAdapter` classes exist but are never instantiated and passed to `ResearchChain`.
- **Impact:** Even if research phase were wired, no sources would be available.

### Database Schema Push Script
- **File:** `src/db/push.ts`
- **Issue:** Manual script to create tables, but no migration system.
- **Impact:** Schema changes require manual intervention.

---

## Known Limitations

### Dry-Run Mode Only
- **File:** `config.yaml:4`
- **Current State:** `dryRun: true` - all decisions are logged but no trades executed.
- **Impact:** Bot is for monitoring only, cannot generate real P&L.

### Safety Module Skips All Checks in Dry-Run
- **File:** `src/safety/index.ts:34-40`
- **Issue:** `checkBet()` returns `passed: true` immediately if `isDryRun` is true, bypassing all safety checks.
- **Impact:** Safety logic is untested in real conditions.

### Hardcoded Polymarket Constants
- **Files:**
  - `src/bankroll/position-sizing.ts:3-4` - `POLYMARKET_MIN_TOKENS = 5`, `POLYMARKET_MIN_USD = 1`
- **Issue:** Minimum trade sizes hardcoded, not from API or config.

### No Input Validation on Config
- **File:** `src/config/index.ts:10-16`
- **Issue:** Only checks `dryRun` and `safety.maxPositionSizePct` exist. Other fields silently use defaults or undefined behavior.

---

## Technical Debt

### Duplicate Comment Block
- **File:** `src/bankroll/index.ts:27-31`
- **Issue:** Same comment block appears twice with `D-01 to D-08` reference.

### Self-Import in Research Confidence
- **File:** `src/research/confidence.ts:2`
- **Issue:** Imports type from `./interface.js` but also exports `ConfidenceResult` interface in same file (line 4-11), creating confusion.

### Research Quality Not Implemented
- **File:** `src/bankroll/position-sizing.ts:14-18`
- **Issue:** `researchQuality` parameter expects `'low' | 'medium' | 'high'` but no code calculates this quality score.

### Category Exposure Calculation Bug
- **File:** `src/bankroll/exposure-caps.ts:33`
- **Issue:** `newPct = newTotalValue` - should be divided by bankroll. `currentPct` stored as absolute value, not percentage.
- **Impact:** Exposure cap checks may not work correctly.

### Limit Order Polling Busy-Waits
- **File:** `src/execution/limit-orders.ts:40-64`
- **Issue:** `while (Date.now() - startTime < timeoutMs)` with 100ms sleep is CPU-inefficient polling.
- **Impact:** High CPU usage during limit order waiting period.

### No Test Coverage for Critical Paths
- **Files:** All execution paths lack tests.
- **Impact:** Safety module, position sizing, and execution logic cannot be safely modified.

### Single TODOs Found
- **File:** `src/ai/minimax.ts:126`
- **Content:** `// TODO: Implement actual MiniMax API call when API key is available`
- **Impact:** AI estimation uses Bayesian fallback instead of actual LLM.

### Railway Deployment Restart Policy
- **File:** `railway.json:11-12`
- **Issue:** `restartPolicyType: ON_FAILURE` with `restartPolicyMaxRetries: 3` - if bot crashes repeatedly, Railway stops restarting it.
- **Impact:** Long-running degradation if bot enters crash loop.

### Order Book Type Casting
- **File:** `src/api/clob.ts:46-53`
- **Issue:** Assumes `bid.price` and `bid.size` are strings or numbers, parses them. API response structure not fully validated.
- **Risk:** Runtime error if API returns unexpected format.

---

## Summary Table

| Category | Count | Critical Issues |
|----------|-------|-----------------|
| Security | 4 | Private key handling, demo key fallback |
| Reliability | 5 | Hardcoded bankroll, in-memory state, SQLite on ephemeral fs |
| Missing Pieces | 4 | Research not wired, execution not called, sources not initialized |
| Limitations | 4 | Dry-run only, safety bypassed in dry-run |
| Technical Debt | 9 | Duplicate code, bugs, missing tests, TODO items |
| **Total** | **26** | |

---

*Concerns audit: 2026-04-19*
