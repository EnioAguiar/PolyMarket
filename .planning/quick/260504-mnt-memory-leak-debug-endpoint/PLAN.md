---
quick_id: 260504-mnt
slug: memory-leak-debug-endpoint
status: completed
date: 2026-05-04
---

## Memory Leak Fix + Debug Endpoint

### Context

Bot was getting `MaxListenersExceededWarning: 11 error listeners added to [TLSSocket]` - memory leak from creating new HTTP agents for each request.

### Changes

1. **src/api/http.ts** (new file)
   - Created `createSharedPublicClient()` singleton
   - Reuses single public client across all requests

2. **src/api/clob.ts**
   - Updated `getUSDCBalance()` to use `createSharedPublicClient()`
   - Now reuses the same public client instead of creating new one each call

3. **src/api/telegram.ts**
   - Added `process.setMaxListeners(20)` to increase limit

4. **src/websocket/client.ts**
   - Changed `handleMessage()` from DEBUG to INFO level
   - Added more context to subscription logs (assets list, full message)

5. **src/websocket/subscription.ts**
   - Added logging for add/remove/clear operations
   - Debug logs for subscription management

6. **src/index.ts**
   - Added `/debug` endpoint with comprehensive system status:
     - WS connection state + reconnect attempts
     - Safety module state (daily loss, drawdown, kill switch)
     - Cycle stats (status, bets, locked markets)
     - Mutex locked count

### Verification

- Build passes ✅
- 6 files changed, 53 insertions, 6 deletions