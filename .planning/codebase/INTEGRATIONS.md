# External Integrations

**Analysis Date:** 2026-05-02

## APIs & External Services

**Prediction Markets:**
- **Polymarket CLOB** - Primary trading venue
  - SDK: `@polymarket/clob-client-v2` (npm)
  - Auth: Ed25519 signature via `ethers` v5 wallet
  - Endpoints: `https://clob.polymarket.com` (CLOB), `https://gamma-api.polymarket.com` (Gamma)
  - Chain: Polygon (chainId 137)
  - Env vars: `PRIVATE_KEY`, `FUNDER_ADDRESS`

**AI/LLM:**
- **MiniMax API** - AI estimation for probability assessment
  - Model: MiniMax-M2.7
  - Endpoint: `https://api.minimax.io/anthropic/v1/messages`
  - Auth: Bearer token (`MINIMAX_API_KEY`)
  - Used in: `src/ai/minimax.ts`

**News & Research:**
- **NewsData.io** - Real-time news aggregation
  - Endpoint: `https://newsdata.io/api/1/news`
  - Auth: API key (`NEWSDATA_API_KEY`)
  - Free tier: 500 requests/day
  - Used in: `src/research/newsdata.ts`

**Crypto Markets:**
- **Binance WebSocket** - Real-time price data
  - Endpoint: `wss://stream.binance.com:9443/ws`
  - Auth: None (public WebSocket)
  - Used in: `src/research/binance.ts`

**Social Media (via Python scripts):**
- **Twitter/X API** - Social sentiment
  - SDK: Tweepy (Python)
  - Script: `scripts/twitter_scraper.py`
  - Auth: Bearer token (`TWITTER_BEARER_TOKEN`)
  - Spawned as subprocess from `src/research/twitter.ts`

- **Reddit API** - Community discussion
  - SDK: PRAW (Python)
  - Script: `scripts/reddit_scraper.py`
  - Auth: Client ID + Secret (`REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`)
  - Spawned as subprocess from `src/research/reddit.ts`

**Web Scraping:**
- **Crawl4AI** - LLM-friendly web scraping
  - Script: `scripts/crawl4ai_web.py`
  - Auth: None (public sites)
  - Spawned as subprocess from `src/research/crawl4ai.ts`

## Data Storage

**Database:**
- **SQLite** - Local file-based database
  - Driver: `better-sqlite3`
  - ORM: `drizzle-orm`
  - Schema: `src/db/schema.ts`
  - Tables: `source_ratings`, `source_feeds`, `research_results`
  - Location: SQLite file (path not specified in code)

**Note:** SQLite is local filesystem storage. On Railway, data persists in container unless using Railway's PostgreSQL template.

## Authentication & Identity

**Wallet (Polymarket):**
- **Ethereum Wallet** - Ed25519 key for signing orders
  - Library: `ethers` v5
  - Env vars: `PRIVATE_KEY`, `FUNDER_ADDRESS`
  - Signature type: EOA (not contract)

## Monitoring & Observability

**Logging:**
- Framework: `pino` v10 (structured JSON)
- Pretty printing in dev (`pino-pretty`)
- Config in `config.yaml`: `logging.level: debug`, `logging.pretty: true`

**Health Check:**
- Railway health endpoint: `/health`
- Configured in `railway.json`

## CI/CD & Deployment

**Hosting:**
- **Railway** - Deployment platform
  - Config: `railway.json`
  - Cron jobs via Railway scheduler (minimum 5-minute interval)
  - Service must EXIT when complete ( Railway skips if previous still running)

**Deployment Flow:**
1. Build: `npm run build` → `tsc` compiles to `dist/`
2. Start: `node dist/index.js` or `npm start`
3. Dev: `npm run dev` → `ts-node/esm src/index.ts`

## Environment Configuration

**Required env vars:**
| Variable | Purpose |
|----------|---------|
| `PRIVATE_KEY` | Ethereum wallet for Polymarket signatures |
| `FUNDER_ADDRESS` | Wallet address for funding |
| `MINIMAX_API_KEY` | MiniMax AI inference |
| `NEWSDATA_API_KEY` | NewsData.io API |
| `TWITTER_BEARER_TOKEN` | Twitter API authentication |
| `REDDIT_CLIENT_ID` | Reddit API client ID |
| `REDDIT_CLIENT_SECRET` | Reddit API client secret |

**Secrets location:**
- `.env` file (gitignored)
- `.env.example` template committed

## Webhooks & Callbacks

**Outgoing:**
- None detected - Bot is pull-based (researches then acts)

**Incoming:**
- Railway health check: `GET /health`

## Research Source Architecture

| Source | Type | Rating | Subprocess | Env Vars |
|--------|------|--------|------------|----------|
| NewsData.io | REST API | ★★★ | No | `NEWSDATA_API_KEY` |
| Twitter/X | REST API | ★★★ | Yes (tweepy) | `TWITTER_BEARER_TOKEN` |
| Reddit | REST API | ★★★★ | Yes (praw) | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` |
| Binance | WebSocket | ★★★★ | No | None |
| Crawl4AI | Scraper | ★★★ | Yes (crawl4ai) | None |
| Google | Search | Not implemented | - | - |

---

*Integration audit: 2026-05-02*