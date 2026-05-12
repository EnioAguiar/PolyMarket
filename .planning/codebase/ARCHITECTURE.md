# Architecture

## Overview

Event-driven autonomous betting bot for Polymarket prediction markets. Runs as a long-lived Node.js service that connects to Polymarket's WebSocket feed, evaluates new markets in real-time, passes bets through a safety pipeline, and executes orders via the CLOB (Central Limit Order Book) API on Polygon.

## Execution Modes

Two overlapping execution paths exist:

**Primary (event-driven):** `src/index.ts` — entry point for production. Connects to WebSocket, listens for `new_market` events, routes each through safety checks, and calls `placeMarketOrder` if live.

**Legacy (polling):** `src/main.ts` — batch-style loop that calls Gamma REST API to fetch markets, iterates, evaluates each. Still importable but not the primary entry point.

## Data Flow (Event-Driven)

```
Polymarket WebSocket (wss://ws-subscriptions-clob.polymarket.com/ws/market)
    │ WsEvent (new_market, best_bid_ask, market_resolved, price_change, book)
    ▼
PolymarketWsClient (src/websocket/client.ts)
    │ parsed JSON, heartbeat PING/PONG, exponential backoff reconnect
    ▼
EventRouter (src/websocket/events.ts)
    │ dispatches by event_type
    ▼
handleWsEvent (src/index.ts)
    │ checks CycleManager.canAcceptBet() + acquireMarket()
    ▼
evaluateMarketForWebSocket (src/websocket/integration.ts)
    │ fetches orderbook via CLOB API
    │ checks liquidity + mid-price
    ▼
SafetyModule.checkBet() (src/safety/index.ts)
    │ position size limit (BANK-01)
    │ daily loss limit (BANK-02)
    │ drawdown kill switch (BANK-03)
    ▼
checkSlippage() (src/execution/slippage.ts)
    │ 10% max slippage tolerance
    ▼
placeMarketOrder() / placeLimitOrder() (src/api/clob.ts)
    │ FOK market order via @polymarket/clob-client-v2
    ▼
notifyBetPlaced() (src/api/telegram.ts)
```

## Module Boundaries

| Module | Responsibility |
|--------|---------------|
| `src/websocket/` | WS connection lifecycle, event parsing, subscription management |
| `src/api/clob.ts` | CLOB client init, order execution, orderbook queries, USDC balance |
| `src/api/polymarket.ts` | Gamma REST API — market listing/filtering |
| `src/api/http.ts` | Shared viem PublicClient for Polygon RPC calls |
| `src/api/telegram.ts` | Telegram bot for notifications + remote pause/control |
| `src/safety/` | Three-layer safety guard: position size, daily loss, drawdown kill switch |
| `src/betting/` | CycleManager (max 3 bets/cycle, 24h wait), MarketMutex (dedup) |
| `src/execution/` | Slippage check, arbitrage detection, re-exports CLOB order functions |
| `src/config/` | YAML config loader (`config.yaml`) |
| `src/logging/` | pino-based structured logger + `logBetDecision` helper |
| `src/db/` | SQLite via drizzle-orm — source ratings, feeds, research results |
| `src/research/` | Multi-source market research (news, social, crypto, AI) — partially wired |
| `src/ai/` | MiniMax AI chain for probability estimation — partially wired |
| `src/bankroll/` | Bankroll sizing and exposure cap utilities |
| `src/types/` | Shared TypeScript interfaces |

## Key Abstractions

- **SafetyModule** — stateful class; instantiated once at startup with bankroll, wraps three trackers (DailyLossTracker, DrawdownTracker, position-limits). Single `checkBet()` entry point.
- **CycleManager** — stateful class; enforces max 3 bets per cycle, transitions through `open → closed → waiting_24h → open` states. Uses MarketMutex to prevent duplicate market processing.
- **EventRouter** — simple `Map<event_type, handler>` pub/sub. Handlers registered in `src/index.ts`.
- **PolymarketWsClient** — wraps `ws` library with heartbeat, exponential backoff reconnect (max 10 attempts, cap 30s), subscription management.

## Blockchain Interaction

- Chain: **Polygon mainnet** (chainId 137)
- Token: **USDC** (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`)
- Auth: **EOA signature** (`SignatureTypeV2.EOA`) — private key derived to viem account
- Order types: **FOK** (fill-or-kill market orders), **GTC** (good-till-cancelled limit orders)
- RPC: configurable via `POLYGON_RPC_URL` env var, defaults to `https://polygon.llamarpc.com`

## HTTP Health Server

`src/index.ts` starts an HTTP server on `PORT` (default 3000) with:
- `GET /health` — service status, WS connection state, cycle stats
- `GET /debug` — detailed safety state, cycle stats, mutex lock count

## Partially Implemented Subsystems

The following modules exist but are **not wired into the main execution path**:
- `src/research/` — multi-source research aggregator (news, Twitter, Reddit, CoinGecko, Binance, Crawl4AI)
- `src/ai/` — MiniMax AI probability estimation chain
- `src/bankroll/` — advanced bankroll/exposure-cap utilities
- `src/db/` — SQLite schema defined but not used by main flow
