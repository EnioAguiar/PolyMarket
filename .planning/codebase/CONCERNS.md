# Codebase Concerns

**Analysis Date:** 2026-05-02

## Tech Debt

### Hardcoded Bankroll Value
- **Issue:** `bankroll = 1000` hardcoded in `src/main.ts:150` instead of using persistent tracked bankroll
- **Files:** `src/main.ts:150`
- **Impact:** Bankroll state resets every cycle, daily loss tracking ineffective, drawdown calculations meaningless
- **Fix approach:** Pass actual bankroll state to `evaluateMarket()`, integrate with `BankrollModule` for persistent tracking

### Dry Run Mode Safety Checks
- **Issue:** Safety module in `src/safety/index.ts:34-39` bypasses all safety checks when `isDryRun` is true, but dry run is not checked consistently throughout the codebase
- **Files:** `src/safety/index.ts:34-39`, `src/main.ts:15-17`
- **Impact:** When `dryRun: true`, bets pass safety checks without actual position size validation, giving false confidence in safety module behavior
- **Fix approach:** Either remove dry-run bypass entirely (safety checks should always run for simulation accuracy) or add explicit `skipSafetyChecks: true` flag only where intentional

### Phase 1 Comment Stubs
- **Issue:** `src/main.ts:172-175` returns action `'monitor'` with comment "Phase 1 - monitoring only, no execution" indicating incomplete implementation
- **Files:** `src/main.ts:172-175`
- **Impact:** Bot only monitors markets, never actually bets. Full research chain (`src/research/chain.ts`) and AI chain (`src/ai/chain.ts`) are implemented but never called from main evaluation loop
- **Fix approach:** Wire up `ResearchChain` and `AIChain` into `evaluateMarket()` to complete Phase 2+ implementation

### Research Chain Unused in Main Loop
- **Issue:** `ResearchChain` (`src/research/chain.ts`) is fully implemented with Bayesian scoring, source aggregation, but never invoked from `main.ts`
- **Files:** `src/research/chain.ts`, `src/main.ts:63-86`
- **Impact:** Market analysis via research sources never happens. Bot fetches orderbook only (liquidity check) without any fundamental analysis
- **Fix approach:** Call `researchChain.research()` before `evaluateMarket()` or integrate research output into bet decision logic

### CLOB Client Singleton Pattern
- **Issue:** Module-level singleton `clobClient` in `src/api/clob.ts:5` with `getClobClient()` that throws if not initialized
- **Files:** `src/api/clob.ts:5,30-34`
- **Impact:** If `createClobClient()` called multiple times, client reference replaced but existing consumers still hold old reference. `getClobClient()` throws at runtime if called before initialization
- **Fix approach:** Use dependency injection or ensure single initialization with error if called twice

## Known Bugs

### Market Fetch Date Filter Mismatch
- **Symptoms:** Debug logs at `src/main.ts:34-49` show date range calculation for 5min-24h markets, but comment at line 46 says "API already filters by date, no need for extra time filter" yet `filterByTimeHorizon()` is never called
- **Files:** `src/main.ts:34-49`, `src/api/polymarket.ts:19-25`
- **Trigger:** Running bot cycle - the time filtering depends entirely on API's `end_date_min/end_date_max` params which may not behave as expected
- **Workaround:** None identified - market selection may include markets outside 5min-24h window

### Orderbook Price Type Coercion
- **Symptoms:** `getOrderBook()` at `src/api/clob.ts:46-53` coerces string prices to numbers with fallback
- **Files:** `src/api/clob.ts:46-53`
- **Trigger:** If CLOB API returns non-string, non-number price values, fallback `parseFloat` returns NaN
- **Workaround:** NaN mid-price returns null at `src/main.ts:140`, causing market to be skipped silently

### clobTokenIds JSON Parsing
- **Issue:** `src/api/polymarket.ts:43-47` has fallback JSON.parse for `clobTokenIds` that could throw on malformed data
- **Files:** `src/api/polymarket.ts:43-47`
- **Trigger:** If Gamma API returns `clobTokenIds` as string but not valid JSON, parse fails
- **Workaround:** Try-catch not implemented, would crash market fetch

## Security Considerations

### Environment Variable Validation
- **Risk:** `src/api/clob.ts:12-15` reads `PRIVATE_KEY` but only checks if it exists, doesn't validate format
- **Files:** `src/api/clob.ts:12-15`
- **Current mitigation:** None - malformed private key will cause ethers.js to fail at runtime
- **Recommendations:** Add format validation (hex string, correct length) before passing to Wallet constructor

### API Key Logging
- **Risk:** `src/ai/minimax.ts:134` includes `Authorization: Bearer ${this.apiKey}` header in logs via pino's default serialization
- **Files:** `src/ai/minimax.ts:134`
- **Current mitigation:** Pino's default config doesn't serialize Authorization headers, but custom logging could leak
- **Recommendations:** Use pino's `redact` option to mask `Authorization` header values

### No Rate Limiting on External APIs
- **Risk:** `src/research/aggregator.ts:20-27` fires all source requests in parallel with no throttling
- **Files:** `src/research/aggregator.ts:20-27`
- **Current mitigation:** None
- **Recommendations:** Implement request queuing with per-source rate limits, especially for Binance API

## Performance Bottlenecks

### Polling-Based Limit Orders
- **Problem:** `src/execution/limit-orders.ts:40-63` uses `while` loop with 100ms sleep to poll for price fills
- **Files:** `src/execution/limit-orders.ts:40-63`
- **Cause:** CPU busy-waiting during limit order wait. At 30s timeout, could execute 300 iterations
- **Improvement path:** Use `setTimeout` with callback pattern, or WebSocket price updates if available

### All Markets Processed Sequentially
- **Problem:** `src/main.ts:63-86` processes markets one-by-one with `for...of` await
- **Files:** `src/main.ts:63-86`
- **Cause:** Sequential evaluation means if one market's orderbook fetch hangs, entire cycle delays
- **Improvement path:** Use `Promise.allSettled()` for parallel market evaluation with concurrency limit

### Research Sources Parallel Fetch Without Timeout
- **Problem:** `src/research/aggregator.ts:20-27` uses `Promise.allSettled` but no timeout per source
- **Files:** `src/research/aggregator.ts:20-27`
- **Cause:** Slow source (e.g., Reddit API) blocks entire aggregation until completion
- **Improvement path:** Add per-source `Promise.race()` with timeout fallback

## Fragile Areas

### WebSocket Reconnection Logic
- **Files:** `src/websocket/client.ts:134-157`
- **Why fragile:** Exponential backoff with max 10 attempts. If Polymarket WS is down > ~1 hour, client gives up permanently
- **Safe modification:** Any changes should preserve the reconnect attempt counter across connection attempts, add health-check ping
- **Test coverage:** No tests found for reconnection scenarios

### Confidence Scoring Magic Numbers
- **Files:** `src/research/confidence.ts`
- **Why fragile:** Multiple magic numbers: evidence strength denominator (10), confidence multiplier, posterior clamping (0.01-0.99)
- **Safe modification:** Extract to named constants with comments explaining rationale
- **Test coverage:** No unit tests for `BayesianScorer` class

### Orderbook Type Assumptions
- **Files:** `src/api/clob.ts:46-53`
- **Why fragile:** Assumes `bid.price/size` have either string or number type. If API returns unexpected type (e.g., BigInt), `parseFloat` returns NaN
- **Safe modification:** Add explicit type guard before coercion
- **Test coverage:** No tests with mocked orderbook data

## Scaling Limits

### SQLite Database (better-sqlite3)
- **Current capacity:** Single SQLite file, designed for ~10k source ratings and research results
- **Limit:** File-based SQLite has write lock contention; concurrent reads OK but writes serialize
- **Scaling path:** Migrate to PostgreSQL on Railway (already in STACK.md recommendation but not implemented). Railway provides PostgreSQL template with persistent volumes

### No Connection Pooling
- **Current capacity:** Each API call creates new fetch connection
- **Limit:** Under high-frequency polling, connection overhead significant
- **Scaling path:** Implement persistent HTTP agent (node:http.Agent) or use GraphQL for batched market queries

## Dependencies at Risk

### @polymarket/clob-client-v2 (latest)
- **Risk:** Using `latest` tag in `package.json:13`. API could break with minor version bump
- **Impact:** Breaking changes to CLOB API client would require immediate fix deployment
- **Migration plan:** Pin to specific version (e.g., `^1.2.3`) and test upgrades before production deployment

### pino-pretty (^13.0.0)
- **Risk:** Dev dependency for pretty logging in development. Production typically uses JSON logs
- **Impact:** Minor - only affects local dev logging readability

## Missing Critical Features

### Market Resolution Tracking
- **Problem:** Bot never checks if markets have resolved to update positions and record P&L
- **Blocks:** Cannot track open positions vs closed, cannot calculate actual vs projected P&L, cannot trigger cycle reset on market resolution

### Persistent Bankroll State
- **Problem:** Bankroll only exists in-memory per cycle run
- **Blocks:** Cannot track daily/total P&L across Railway cron restarts, cannot persist drawdown state

### Order Execution
- **Problem:** Full execution flow (`src/execution/index.ts`) exists but is never called from main loop
- **Blocks:** Bot only monitors, never actually places orders on Polymarket

## Test Coverage Gaps

### No Unit Tests for Core Business Logic
- **What's not tested:** `SafetyModule`, `BankrollModule`, `ResearchChain`, `AIChain`, `CycleManager`
- **Files:** `src/safety/index.ts`, `src/bankroll/index.ts`, `src/research/chain.ts`, `src/ai/chain.ts`, `src/betting/cycle.ts`
- **Risk:** Refactoring any safety check or bankroll calculation could break without detection
- **Priority:** High - these contain core business logic

### No Integration Tests
- **What's not tested:** Full flow from market fetch → research → AI estimate → bet decision
- **Risk:** Components work in isolation but integration points could fail
- **Priority:** High

### WebSocket Tests
- **What's not tested:** Reconnection logic, message routing, subscription management
- **Files:** `src/websocket/client.ts`, `src/websocket/events.ts`, `src/websocket/subscription.ts`
- **Risk:** WebSocket failures in production would be unexpected
- **Priority:** Medium

### API Client Tests
- **What's not tested:** `clob.ts`, `polymarket.ts` with mocked API responses
- **Files:** `src/api/clob.ts`, `src/api/polymarket.ts`
- **Risk:** API format changes break parsing silently
- **Priority:** Medium

### No Test for Market Resolution Date Filtering
- **What's not tested:** Whether date filtering actually produces 5min-24h markets
- **Files:** `src/main.ts:34-49`, `src/api/polymarket.ts:19-25`
- **Risk:** Incorrect date filtering causes wrong market selection
- **Priority:** High

---

*Concerns audit: 2026-05-02*