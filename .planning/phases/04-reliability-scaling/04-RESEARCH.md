# Phase 4: Reliability + Scaling - Research

**Researched:** 2026-04-19
**Phase:** 04-reliability-scaling
**Mode:** Event-driven real-time architecture

---

## Research: Polymarket WebSocket Integration

### Endpoint & Connection

**WebSocket URL:** `wss://ws-subscriptions-clob.polymarket.com/ws/market`

**Connection type:** Public (no authentication required for market channel)

**Connection setup:**
1. Connect to WebSocket URL
2. Send subscription message immediately after connection (server closes connections that don't subscribe within timeout)
3. Send `PING` heartbeat every 10 seconds

---

## Subscription Protocol

### Initial Subscription Message

```json
{
  "assets_ids": ["<token_id_1>", "<token_id_2>"],
  "type": "market",
  "custom_feature_enabled": true,
  "initial_dump": true,
  "level": 2
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `assets_ids` | string[] | Yes | Token IDs to subscribe to |
| `type` | string | Yes | Must be `"market"` |
| `custom_feature_enabled` | boolean | No | Enable `best_bid_ask`, `new_market`, `market_resolved` events |
| `initial_dump` | boolean | No | Send full orderbook snapshot on subscribe (default: true) |
| `level` | integer | No | Subscription level 1-3 (default: 2) |

### Dynamic Subscription Updates

**Subscribe to more assets:**
```json
{
  "assets_ids": ["new_asset_id_1", "new_asset_id_2"],
  "operation": "subscribe",
  "custom_feature_enabled": true
}
```

**Unsubscribe:**
```json
{
  "assets_ids": ["asset_id_to_remove"],
  "operation": "unsubscribe"
}
```

---

## Heartbeat Protocol

**Send:** `PING` (plain text, not JSON) every 10 seconds

**Server responds:** `PONG` (plain text)

**Critical:** If no `PONG` received within some timeout, connection will be closed. Must keep connection alive with regular heartbeats.

---

## Event Types Received

### Standard Events (always available)

| Event | Description | Trigger |
|-------|-------------|---------|
| `book` | Full orderbook snapshot | On subscribe, after trades |
| `price_change` | Price level delta updates | Order placed/cancelled |
| `last_trade_price` | Trade execution | Trade occurs |
| `tick_size_change` | Market tick size update | Price approaches limits |

### Custom Feature Events (requires `custom_feature_enabled: true`)

| Event | Description | Use Case |
|-------|-------------|----------|
| `best_bid_ask` | Best bid/ask prices updated | Arbitrage detection, odds tracking |
| `new_market` | New market created | Trigger research pipeline |
| `market_resolved` | Market resolved | Close positions, record outcome |

---

## Event Payloads

### `book` - Orderbook Snapshot

```json
{
  "event_type": "book",
  "asset_id": "65818619657568813474341868652308942079804919287380422192892211131408793125422",
  "market": "0xbd31dc8a20211944f6b70f31557f1001557b59905b7738480ca09bd4532f84af",
  "bids": [{"price": "0.48", "size": "30"}],
  "asks": [{"price": "0.52", "size": "25"}],
  "timestamp": "1757908892351",
  "hash": "0xabc123..."
}
```

### `price_change` - Price Level Delta

```json
{
  "event_type": "price_change",
  "market": "0x5f65177b394277fd294cd75650044e32ba009a95022d88a0c1d565897d72f8f1",
  "price_changes": [{
    "asset_id": "71321045679252212594626385532706912750332728571942532289631379312455583992563",
    "price": "0.5",
    "size": "200",
    "side": "BUY",
    "hash": "56621a121a47ed9333273e21c83b660cff37ae50",
    "best_bid": "0.5",
    "best_ask": "1"
  }],
  "timestamp": "1757908892351"
}
```

### `best_bid_ask` - Best Prices (custom_feature)

```json
{
  "event_type": "best_bid_ask",
  "market": "0x0005c0d312de0be897668695bae9f32b624b4a1ae8b140c49f08447fcc74f442",
  "asset_id": "85354956062430465315924116860125388538595433819574542752031640332592237464430",
  "best_bid": "0.73",
  "best_ask": "0.77",
  "spread": "0.04",
  "timestamp": "1766789469958"
}
```

### `new_market` - Market Created (custom_feature)

```json
{
  "event_type": "new_market",
  "id": "1031769",
  "question": "Will NVIDIA (NVDA) close above $240 end of January?",
  "market": "0x311d0c4b6671ab54af4970c06fcf58662516f5168997bdda209ec3db5aa6b0c1",
  "slug": "nvda-above-240-on-january-30-2026",
  "assets_ids": ["76043073756653678226373981964075571318267289248134717369284518995922789326425", "..."],
  "outcomes": ["Yes", "No"],
  "timestamp": "1766790415550",
  "tags": ["stocks"],
  "active": true
}
```

### `market_resolved` - Market Resolved (custom_feature)

```json
{
  "event_type": "market_resolved",
  "id": "1031769",
  "market": "0x311d0c4b6671ab54af4970c06fcf58662516f5168997bdda209ec3db5aa6b0c1",
  "assets_ids": ["76043073756653678226373981964075571318267289248134717369284518995922789326425", "..."],
  "winning_asset_id": "76043073756653678226373981964075571318267289248134717369284518995922789326425",
  "winning_outcome": "Yes",
  "timestamp": "1766790415550"
}
```

---

## Architecture Implications

### Current State (Railway Cron)
- Bot triggered every 5 minutes via Railway cron
- Fetches markets via Gamma API polling
- Processes each market in sequence
- Exits after processing

### Target State (Event-Driven)
- Bot runs continuously 24/7 on Railway
- Single WebSocket connection to Polymarket
- Real-time events trigger research/execution
- No polling needed

### Changes Required

| Component | Current | New |
|-----------|---------|-----|
| Entry point (`src/index.ts`) | HTTP server for health checks | WebSocket client |
| Main loop (`src/main.ts`) | Cron-triggered `runBotCycle()` | Event-driven `handleEvent()` |
| Market discovery | Gamma API polling | WebSocket `new_market` events |
| Odds tracking | Periodic CLOB API calls | WebSocket `best_bid_ask` events |
| Railway config | Cron schedule | Always-on service |

---

## Reconnection Strategy

**Issue:** Connection may drop (network issues, server restart)

**Recommended approach:**
1. On disconnect event, wait 1 second
2. Attempt reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
3. After reconnect, re-subscribe with last known asset IDs
4. Log reconnection events for monitoring

**Note:** No explicit reconnection protocol documented — implement standard WebSocket reconnection patterns.

---

## Railway Deployment Changes

### Current (Cron-based)
- Railway cron: every 5 minutes
- Service starts, runs one cycle, exits
- Shortest interval: 5 minutes

### New (Always-on)
- Railway persistent service (no cron)
- Monitor process keeps running
- Health check on `/health` endpoint
- Auto-restart on failure (Railway handles)

---

## Implementation Approach

### WebSocket Client Options for Node.js

1. **Native WebSocket** (`ws` package) - Lightweight, manual heartbeat
2. **ws with ping/pong handling** - Built-in heartbeat support
3. **Polymarket SDK** (if available) - Official client with reconnection handling

**Recommendation:** Use `ws` package with custom heartbeat management for full control.

### Event Handler Architecture

```
WebSocket Message
    │
    ▼
Parse JSON
    │
    ▼
Switch on event_type
    │
    ├── "new_market"     → triggerResearch(market)
    ├── "best_bid_ask"   → updateOdds(asset_id, bid, ask)
    ├── "price_change"   → evaluatePosition(asset_id, changes)
    ├── "market_resolved" → closePosition(market, winning_outcome)
    └── "book"           → updateOrderBook(asset_id, bids, asks)
```

---

## Dependencies

- `ws` - WebSocket client for Node.js
- No additional packages required (using native WebSocket API)

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| WebSocket connection drops | Exponential backoff reconnection |
| Missed events during reconnect | Re-subscribe to asset IDs, poll briefly on reconnect |
| Server closes connection (no heartbeat) | Strict 10-second PING interval |
| High message volume | Implement message queue / throttling |
| Asset IDs become stale | Periodic refresh of subscribed assets |

---

## Telegram Integration (Future)

**Note:** Telegram command interface for bot control was mentioned in CONTEXT.md (D-15, D-16) but is deferred. Not in current phase scope.

---

## References

- [Polymarket WebSocket Overview](https://docs.polymarket.com/market-data/websocket/overview)
- [Polymarket Market Channel API](https://docs.polymarket.com/api-reference/wss/market)