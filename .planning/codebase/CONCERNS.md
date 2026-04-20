# Codebase Concerns

**Analysis Date:** 2026-04-19

## Security Concerns

**Wallet Private Key in Memory:**
- `src/api/clob.ts:12-17` reads `PRIVATE_KEY` directly from `process.env`
- Key loaded into `ethers.Wallet` and held in memory for signing
- No encryption at rest or in memory for wallet keys
- If process is compromised, key is exposed
- **Recommendation:** Use hardware wallet or encrypted key file. Consider BLSigner or similar for production.

**Environment Variable Secrets:**
- `config.yaml` notes "All configuration is managed through this file (not env vars)"
- But `PRIVATE_KEY` and `FUNDER_ADDRESS` are env vars (see `src/api/clob.ts:12` comment)
- No validation of private key format before passing to ethers
- **Recommendation:** Add format validation for private key. Document required env vars clearly.

**CLOB Client Singleton:**
- `src/api/clob.ts:5` uses module-level singleton `let clobClient: ClobClient | null = null`
- Client persists until process restart, but wallet signing key remains in memory
- **Risk:** Client could be used after key rotation without re-initialization

---

## Reliability Concerns

**Safety State Not Persistent:**
- `SafetyModule` in `src/safety/index.ts` tracks daily loss, drawdown, and kill switch in memory
- `DrawdownTracker` in `src/safety/drawdown.ts:10` stores `peakBankroll` in memory
- `DailyLossTracker` in `src/safety/daily-loss.ts:10` tracks session date in memory
- **Problem:** On Railway cron restart, all safety state resets. Bot could execute trades that exceed daily loss or drawdown limits because state is blank.
- **Impact:** BANK-02 and BANK-03 protections ineffective across restarts

**No Bankroll Persistence:**
- Bankroll hardcoded as `1000` in `src/main.ts:24` and `src/main.ts:150`
- No database or file storage for actual bankroll
- `SafetyModule.recordTrade()` exists but is never called in `main.ts`
- **Impact:** No tracking of actual P&L. Safety module uses fictional bankroll.

**No Retry Logic:**
- `src/api/polymarket.ts:30-33` throws on any HTTP failure
- `src/api/clob.ts:40-54` propagates orderbook errors with no retry
- Network blips or rate limits cause entire cycle to fail
- **Impact:** Missed trading opportunities, no resilience

**Error Handling Too Broad:**
- `src/main.ts:72-86` catches errors at market level but only logs them
- Continues to next market, but no backoff or circuit breaker
- One malformed market could cause cascade issues
- **Impact:** Silent degradation

**Missing `lastTradeTime` Implementation:**
- `src/types/index.ts:56` defines `lastTradeTime?: Date` in SafetyState
- Never populated or used anywhere in safety module
- **Impact:** No time-based safety rules possible

---

## Missing Pieces (Phase 2+ Not Implemented)

**Phase 2 Requirements (Not Started):**
- Source database (SQLite/Postgres) — RES-01
- Research adapters (Binance, news APIs) — RES-02 to RES-05
- Star rating system (★1-5) — SRC-01 to SRC-04
- AI integration (probability estimates) — AI-01 to AI-03
- Weighted confidence scoring — AI-04

**Phase 3 Requirements (Not Started):**
- Kelly Criterion position sizing — BANK-05
- Category exposure caps — EXEC-04
- Slippage protection — EXEC-04
- Limit orders (not just market orders) — EXEC-04
- Arbitrage detection — EXEC-05

**Phase 4 Requirements (Not Started):**
- WebSocket for real-time orderbook — MON-05
- Multi-instance mutex lock — DEPL-05
- Graceful shutdown — DEPL-05
- Alerting (Discord/PagerDuty) — DEPL-06
- Telegram command interface — DEPL-06

**Evidence:** Only `main.ts:174` returns `"Phase 1 - monitoring only, no execution"`.

---

## Known Limitations

**Dry-Run Only Mode:**
- `config.yaml:4` has `dryRun: true` hardcoded
- `src/main.ts:14-17` only creates CLOB client when `!dryRun`
- `src/api/clob.ts` comment says "wallet connection" but never actually connects in current mode
- **Impact:** No real trading possible without code changes

**No NO Token Evaluation:**
- `src/main.ts:64` only gets YES token ID
- `src/api/polymarket.ts:76-78` has `getNoTokenId()` but it's never called
- Bot only considers buying YES, never selling/shorting NO
- **Impact:** Half the market opportunities missed

**Basic Pricing Only:**
- `src/api/clob.ts:70-74` calculates mid-price from best bid/ask
- No arbitrage detection (Phase 3 requirement)
- No slippage modeling
- No liquidity-adjusted pricing
- **Impact:** Orders may execute at unfavorable prices

**No Source Quality Enforcement:**
- `src/main.ts:92-176` `evaluateMarket()` has no research step
- No star ratings checked
- No minimum 10 sources requirement
- **Impact:** Betting decisions without proper research (Phase 1 success criteria #3 states "Minimum 10 sources gathered before any bet decision" but not implemented)

---

## Technical Debt

**Debug Console Logs:**
- `src/main.ts:44,48,49` — `console.log('[DEBUG] ...')`
- `src/api/polymarket.ts:28,36` — `console.log('[DEBUG] ...')`
- Not using structured logger (Pino)
- **Impact:** Inconsistent logging, hard to filter in production

**Hardcoded Bankroll:**
- `src/main.ts:24` and `src/main.ts:150` hardcode `1000`
- No config option for initial bankroll
- **Impact:** Cannot adjust for different capital sizes without code changes

**Unused Interface Field:**
- `src/types/index.ts:56` `lastTradeTime?: Date` never set
- `src/safety/types.ts` `BetCheckInput` has no timestamp field
- **Impact:** Dead code, potential confusion

**No Input Validation:**
- `src/config/index.ts:10-16` only checks required fields exist
- No type validation (e.g., `dryRun` could be string "true")
- `src/api/polymarket.ts:35-51` blindly trusts Gamma API response shape
- **Impact:** Malformed data could cause runtime errors

**CLOB Client Error on Dry-Run:**
- `src/api/clob.ts:11-14` throws if `PRIVATE_KEY` missing
- But dry-run mode doesn't need CLOB client
- However, `getOrderBook()` at `src/api/clob.ts:40` calls `getClobClient()` which will throw
- `main.ts:118` calls `getOrderBook()` even in dry-run (needs client for market data)
- **Impact:** Confusing error flow in dry-run mode

**Drawdown Peak Never Updates After Loss:**
- `src/safety/drawdown.ts:18-22` only updates peak if `currentBankroll > peakBankroll`
- After a loss, peak stays at previous high
- But if bankroll never exceeds peak again, drawdown kill switch could trigger incorrectly
- **Impact:** Potential false kill switch activation after recovery

---

## Test Coverage Gaps

**No Tests Found:**
- `package.json:9` has `"test": "vitest"` script
- But no test files found via glob
- **Impact:** No regression protection, safety-critical code untested

**Priority:** High — Safety module (BANK-01, BANK-02, BANK-03) should have unit tests

---

## Configuration Gaps

**No Environment-Specific Overrides:**
- `config.yaml` is static, no env var interpolation
- Railway secrets cannot override specific values
- **Impact:** Cannot change safety limits per environment without redeploy

**Missing Polymarket Config:**
- `config.yaml:11-14` has `polymarket.host`, `gammaHost`, `chainId`
- But `FUNDER_ADDRESS` mentioned in `src/api/clob.ts:9` comment is not in config or types
- **Impact:** Incomplete configuration documentation

---

## Summary Table

| Category | Severity | Files | Issue |
|----------|----------|-------|-------|
| Safety state persistence | HIGH | `src/safety/*.ts` | State lost on restart |
| Bankroll persistence | HIGH | `src/main.ts` | Hardcoded fictional value |
| No tests | HIGH | (none) | Safety critical code untested |
| Wallet key security | MEDIUM | `src/api/clob.ts` | Key in memory unencrypted |
| Phase 2+ not implemented | MEDIUM | (none) | Core functionality missing |
| Debug logs not structured | LOW | `src/main.ts`, `src/api/polymarket.ts` | Inconsistent logging |
| Hardcoded bankroll | LOW | `src/main.ts` | Inflexible configuration |

---

*Concerns audit: 2026-04-19*
