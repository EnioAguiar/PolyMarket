# External Integrations

**Analysis Date:** 2026-04-19

## Polymarket Integrations

### Gamma API (Markets Data)

**Purpose:** Fetch available prediction markets

**Endpoint:** `https://gamma-api.polymarket.com`

**Used in:** `src/api/polymarket.ts`

**Functions:**
- `fetchMarkets(params)` - Get markets with filtering
- `filterByCategory()` - Filter by category
- `filterByTimeHorizon()` - Filter 5min-24h markets
- `getYesTokenId()` / `getNoTokenId()` - Get token IDs

**Auth:** None (public API)

**Code reference:**
```typescript
const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';
const response = await fetch(url);
```

---

### CLOB Client (Trading)

**Package:** `@polymarket/clob-client-v2`

**Purpose:** Place orders, fetch orderbooks, execute trades

**Host:** `https://clob.polymarket.com`

**Chain:** Polygon (chainId: 137)

**Auth:** EOA wallet signature (ethers v5 Wallet)

**Required env vars:**
- `PRIVATE_KEY` - EOA private key for signing
- `FUNDER_ADDRESS` - Wallet holding pUSD for trading

**Used in:** `src/api/clob.ts`

**Key functions:**
- `createClobClient(config)` - Initialize with wallet
- `getOrderBook(tokenId)` - Fetch orderbook
- `getMidPrice()` - Calculate mid-price
- `hasLiquidity()` - Check sufficient size

**Code reference:**
```typescript
import { ClobClient } from '@polymarket/clob-client-v2';
import { Wallet } from 'ethers';

const signer = new Wallet(privateKey);
clobClient = new ClobClient({ host, chain, signer });
```

---

## Binance Integration

**Purpose:** Real-time crypto price data via WebSocket

**Type:** WebSocket (public, no auth)

**Endpoint:** `wss://stream.binance.com:9443/ws`

**Used in:** `src/research/binance.ts`

**Adapter class:** `BinanceAdapter` implements `ResearchSource`

**Data fetched:**
- Price (`s` - symbol, `c` - close price)
- Volume (`v`)
- 24h change (`p`, `P`)
- High/Low (`h`, `l`)
- Timestamp (`E`)

**Symbol mapping (topic → Binance):**
- `bitcoin`/`btc` → `btcusdt`
- `ethereum`/`eth` → `ethusdt`
- `solana`/`sol` → `solusdt`

**Timeout:** 5 seconds per request

**Code reference:**
```typescript
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
this.ws = new WebSocket(`${BINANCE_WS_URL}/${symbol}@ticker`);
```

---

## Google Search API

**Purpose:** News and web search for market research

**Endpoint:** `https://www.googleapis.com/customsearch/v1`

**Used in:** `src/research/google.ts`

**Required env vars:**
- `GOOGLE_API_KEY` - API key for Custom Search
- `GOOGLE_SEARCH_ENGINE_ID` - Search Engine ID

**Auth:** API key in query string

**Time restrictions:**
- ≤1h markets: `dateRestrict=h1`
- ≤6h markets: `dateRestrict=h6`
- ≤24h markets: `dateRestrict=d1`

**Adapter class:** `GoogleAdapter` implements `ResearchSource`

**Code reference:**
```typescript
const GOOGLE_SEARCH_URL = 'https://www.googleapis.com/customsearch/v1';
url.searchParams.set('key', apiKey);
url.searchParams.set('cx', searchEngineId);
```

---

## Database

**Type:** SQLite with Drizzle ORM

**Package:** `better-sqlite3` + `drizzle-orm`

**Purpose:** Store source ratings, feeds, and research results

**Schema tables (in `src/db/schema.ts`):**
- `source_ratings` - Research source metadata
- `source_feeds` - Feed URLs and types
- `research_results` - Signals and confidence scores

**Auth:** Local file only (no network exposure)

---

## Logging

**Framework:** Pino (`pino` + `pino-pretty`)

**Transport:** pino-pretty for dev, JSON for production

**Configured in:** `src/logging/index.ts`

**Level:** `debug` (configured in `config.yaml`)

**Structured fields:** marketId, odds, positionSize, action, safetyCheck

---

## Railway Deployment

**Platform:** Railway (PaaS)

**Secrets (via Railway dashboard, NOT in code):**
- `PRIVATE_KEY` - Trading wallet
- `FUNDER_ADDRESS` - Funding wallet
- `GOOGLE_API_KEY` - Google Search
- `GOOGLE_SEARCH_ENGINE_ID` - Google CX

**Environment:** Railway injects secrets as env vars

**Health check:** HTTP GET `/health` returns `{"status": "healthy"}`

---

## Environment Variables Summary

| Variable | Purpose | Source |
|----------|---------|--------|
| `PRIVATE_KEY` | EOA wallet for signing trades | Railway secrets |
| `FUNDER_ADDRESS` | pUSD/ POL funding wallet | Railway secrets |
| `GOOGLE_API_KEY` | Google Custom Search API | Railway secrets |
| `GOOGLE_SEARCH_ENGINE_ID` | Google Search Engine ID | Railway secrets |
| `PORT` | Health check server port (default 3000) | Railway/env |

---

*Integration audit: 2026-04-19*
