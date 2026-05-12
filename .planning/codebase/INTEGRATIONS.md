# External Integrations

**Analysis Date:** 2026-05-12

## Polymarket Platform

**Gamma REST API (Market Data):**
- Base URL: `https://gamma-api.polymarket.com`
- Endpoint used: `GET /markets` with query params `active`, `closed`, `limit`, `end_date_min`, `end_date_max`
- Auth: None (public API)
- Client: Native `fetch` in `src/api/polymarket.ts`
- Purpose: Fetch active prediction markets and their CLOB token IDs

**CLOB REST API (Order Execution):**
- Host: configured via `config.yaml` → `polymarket.host` (typically `https://clob.polymarket.com`)
- Auth: L2 ECDSA signature derived from EOA private key via `ClobClient.createOrDeriveApiKey()`
- SDK: `@polymarket/clob-client-v2` 1.0.3-canary.0 used in `src/api/clob.ts`
- Operations: `getOrderBook()`, `createAndPostMarketOrder()` (FOK), `createAndPostOrder()` (GTC limit), `updateBalanceAllowance()`
- Auth env var: `PRIVATE_KEY`

**CLOB WebSocket Feed (Real-time Events):**
- URL: `wss://ws-subscriptions-clob.polymarket.com/ws/market`
- Auth: None (public feed)
- Client: `ws` library in `src/websocket/client.ts`
- Events consumed: `new_market`, `best_bid_ask`, `market_resolved`, `price_change`, `book`
- Heartbeat: PING/PONG every 10 seconds
- Reconnect: Exponential backoff, max 10 attempts, max delay 30s

## Blockchain (Polygon)

**Polygon RPC:**
- Default URL: `https://polygon.llamarpc.com`
- Override env var: `POLYGON_RPC_URL`
- Client: `viem` `createPublicClient` in `src/api/http.ts`
- Purpose: Read USDC balance via `balanceOf()` on-chain call
- Chain: Polygon Mainnet (chain ID from `config.yaml` → `polymarket.chainId`)

**USDC Contract (Polygon):**
- Contract address: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` (USDC / bridged USDC on Polygon)
- ABI: minimal `balanceOf(address)` — hardcoded in `src/api/clob.ts`
- Purpose: Determine bankroll (real wallet balance)

**Wallet Signing:**
- Method: EOA private key (`PRIVATE_KEY` env var)
- Library: `viem` `privateKeyToAccount` + `createWalletClient`
- Signature type: `SignatureTypeV2.EOA` (passed to CLOB client)
- Deposit wallet: `DEPOSIT_WALLET_ADDRESS` env var (referenced in `.env.example`, not seen actively used in current code)

## AI / LLM

**MiniMax AI API:**
- Base URL: `https://api.minimax.io/anthropic/v1/messages`
- Model: `MiniMax-M2.7`
- Auth: Bearer token via `MINIMAX_API_KEY` env var
- Client: Native `fetch` in `src/ai/minimax.ts`
- Purpose: Generate probability estimates for prediction markets given aggregated research signals
- Request format: Anthropic-compatible messages API (JSON body with `model`, `max_tokens`, `messages`)

## Research Data Sources

**Google Custom Search API:**
- URL: `https://www.googleapis.com/customsearch/v1`
- Auth: `GOOGLE_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` env vars
- Client: Native `fetch` in `src/research/google.ts`
- Purpose: News and web search signals for market research

**NewsData.io:**
- URL: `https://newsdata.io/api/1/news`
- Auth: `NEWSDATA_API_KEY` env var (query param `apikey`)
- Client: Native `fetch` in `src/research/newsdata.ts`
- Purpose: Real-time news articles; free tier 500 requests/day

**CoinGecko API:**
- Base URL: `https://api.coingecko.com/api/v3`
- Auth: Optional `COINGECKO_API_KEY` env var (query param `x_cg_demo_api_key`); works unauthenticated at lower rate limits
- Client: Native `fetch` in `src/research/sources/coingecko.ts`
- Purpose: Crypto price, market cap, volume, and community data

**Binance WebSocket:**
- URL: `wss://stream.binance.com:9443/ws/{symbol}@ticker`
- Auth: None (public stream)
- Client: `ws` library in `src/research/binance.ts`
- Purpose: Real-time crypto ticker data for crypto-related markets

**API-Football (via RapidAPI):**
- Base URL: `https://api-football-v1.p.rapidapi.com`
- Auth: `RAPIDAPI_KEY` env var (header `X-RapidAPI-Key`); optional `RAPIDAPI_HOST` override
- Client: Native `fetch` in `src/research/sources/football.ts`
- Purpose: Upcoming football fixture data for sports market research

**Twitter/X API v2:**
- Auth: `TWITTER_BEARER_TOKEN` env var
- Client: Python subprocess via `tweepy` library — `scripts/twitter_scraper.py`
- Node bridge: `src/research/twitter.ts` spawns `python3 scripts/twitter_scraper.py`
- Purpose: Social sentiment signals for breaking news markets
- Cache: In-memory, 5-minute TTL

**Reddit API (PRAW):**
- Auth: `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` env vars
- Client: Python subprocess via `praw` library — `scripts/reddit_scraper.py`
- Node bridge: `src/research/reddit.ts` spawns `python3 scripts/reddit_scraper.py`
- Purpose: Community sentiment signals, higher signal-to-noise than Twitter
- Cache: In-memory, 5-minute TTL

**Crawl4AI Web Scraper:**
- No external API — scrapes public web pages
- Client: Python subprocess via `crawl4ai` library — `scripts/crawl4ai_web.py`
- Node bridge: `src/research/crawl4ai.ts` spawns `python3 scripts/crawl4ai_web.py`
- Target URLs: Dynamically mapped from topic keywords (CoinTelegraph, ESPN, Reuters, TechCrunch, HackerNews)
- No auth required

**Crawl4AI Search:**
- No external API — performs web crawl-based search
- Client: Python subprocess — `scripts/crawl4ai_search.py`
- Node bridge: `src/research/crawl4ai_search.ts` spawns `python3 scripts/crawl4ai_search.py`
- No auth required

## Messaging / Notifications

**Telegram Bot API:**
- Auth: `TELEGRAM_BOT_TOKEN` env var
- Target chat: `TELEGRAM_CHAT_ID` env var (for push notifications)
- SDK: `telegraf` 4.16.3 in `src/api/telegram.ts`
- Purpose: Bot control interface (pause/resume, status, balance queries) and push alerts (bet placed, errors, status updates)
- Commands: `/status`, `/cycle`, `/pause`, `/resume`, `/bankroll`, `/testmode`, `/balance`

## Data Storage

**SQLite (local):**
- Path: `$DB_PATH` env var, default `/data/polymarket.db`
- Client: `better-sqlite3` 12.9.0 + `drizzle-orm` 0.45.2
- Schema: `src/db/schema.ts` — tables: `source_ratings`, `source_feeds`, `research_results`
- On Railway: persisted on mounted volume at `/data`

**File Storage:**
- Local filesystem only; no cloud object storage

**Caching:**
- No Redis or external cache; Twitter and Reddit adapters use in-memory `Map` with 5-minute TTL

## CI/CD & Deployment

**Hosting:**
- Railway.app — configured via `railway.json` and `railpack.json`
- Single replica, restart on failure (max 10 retries)
- Volume mount: `/data` (persistent SQLite)

**Build Process:**
- Railpack builds Node.js provider: `npm ci` → `npm run build` (tsc)
- Start command: `python3 -m ensurepip --upgrade && python3 -m pip install -r requirements.txt && npm start`
- Python 3.13 provisioned alongside Node.js

**Health Check:**
- Endpoint: `GET /health` — returns JSON with `status`, `wsConnected`, cycle stats
- Debug endpoint: `GET /debug` — returns safety state, cycle stats, mutex info
- Interval: 30s, timeout: 5s, startup grace: 30s

## Environment Variables Summary

| Variable | Required | Purpose |
|----------|----------|---------|
| `PRIVATE_KEY` | Yes (live mode) | EOA wallet private key for Polymarket signing |
| `MINIMAX_API_KEY` | Yes | MiniMax LLM API authentication |
| `TELEGRAM_BOT_TOKEN` | Optional | Enables Telegram bot interface |
| `TELEGRAM_CHAT_ID` | Optional | Target chat for push notifications |
| `POLYGON_RPC_URL` | Optional | Override default Polygon RPC (default: `https://polygon.llamarpc.com`) |
| `NEWSDATA_API_KEY` | Optional | NewsData.io news feed |
| `TWITTER_BEARER_TOKEN` | Optional | Twitter/X API v2 access |
| `REDDIT_CLIENT_ID` | Optional | Reddit API OAuth client ID |
| `REDDIT_CLIENT_SECRET` | Optional | Reddit API OAuth client secret |
| `GOOGLE_API_KEY` | Optional | Google Custom Search API |
| `GOOGLE_SEARCH_ENGINE_ID` | Optional | Google Custom Search engine ID |
| `COINGECKO_API_KEY` | Optional | CoinGecko Demo API key (unauthenticated works too) |
| `RAPIDAPI_KEY` | Optional | RapidAPI key for API-Football |
| `RAPIDAPI_HOST` | Optional | RapidAPI host override for API-Football |
| `DEPOSIT_WALLET_ADDRESS` | Optional | Polymarket deposit wallet address |
| `TEST_EXECUTION` | Optional | Set to `"true"` to prevent real order execution |
| `DB_PATH` | Optional | SQLite database path (default: `/data/polymarket.db`) |
| `PORT` | Optional | HTTP health check server port (default: `3000`) |

---

*Integration audit: 2026-05-12*
