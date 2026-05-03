---
quick_id: 260503-tst
slug: test-clob-execution
status: pending
date: 2026-05-03
---

## Test CLOB Execution Flow

Validate the CLOB client order execution works end-to-end.

### Context

After fixing the viem wallet issue, we need to test:
1. CLOB client initializes correctly
2. Order placement works (with TEST_EXECUTION=true first)
3. Telegram notifications fire on order events

### must_haves
- truths:
  - "Bot initializes CLOB client without errors"
  - "TEST_EXECUTION=true logs would-be orders without placing"
  - "Order confirmation logged with txHash/orderID"
- artifacts:
  - path: "src/websocket/integration.ts"
    provides: "placeMarketOrder() called with correct params"
  - path: "src/api/clob.ts"
    provides: "placeMarketOrder() returns OrderExecutionResult"

### Tasks

1. **Add API key derivation step** ✓
   - files: src/api/clob.ts
   - action: Add createOrDeriveApiKey() call after client creation for L2 auth
   - verify: Build passes
   - done: true

2. **Test with TEST_EXECUTION mode**
   - files: src/api/clob.ts, src/websocket/integration.ts
   - action: Run bot with TEST_EXECUTION=true, verify logs show would-be orders
   - verify: Logs show order details without actual transaction
   - done: false

3. **Verify Telegram notification on bet**
   - files: src/api/telegram.ts
   - action: Check telegram sends notification on logBetDecision with action='bet'
   - verify: /status shows last bet info after execution
   - done: false