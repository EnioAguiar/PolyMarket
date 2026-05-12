# Technology Stack

**Analysis Date:** 2026-05-12

## Languages

**Primary:**
- TypeScript 5.9.3 - All application logic under `src/`

**Secondary:**
- Python 3.13 - Subprocess scrapers in `scripts/` (Twitter, Reddit, Crawl4AI)

## Runtime

**Environment:**
- Node.js >= 20.10.0 (enforced via `engines` field in `package.json`)
- Python 3.13 (provisioned by Railpack for scraper subprocesses)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)

## Frameworks

**Core:**
- None (plain Node.js with ESM modules — `"type": "module"` in `package.json`)

**Testing:**
- vitest 1.6.1 — unit test runner (`src/tests/`, configured via `package.json` scripts)

**Build:**
- TypeScript compiler (`tsc`) — outputs to `dist/`
- ts-node 10.9.0 — dev-mode runner via `npm run dev`

## Key Dependencies

**Polymarket SDK / Trading:**
- `@polymarket/clob-client-v2` 1.0.3-canary.0 — Central Limit Order Book client; used in `src/api/clob.ts` for order placement, order book queries, and API key derivation
- `@polymarket/builder-relayer-client` 0.0.9 — Relayer client (imported but not heavily used in current execution path)
- `@polymarket/builder-signing-sdk` 1.0.0 — Signing primitives (supporting dependency)

**Blockchain / Web3:**
- `viem` 2.48.8 — Polygon RPC client; used in `src/api/http.ts` and `src/api/clob.ts` for on-chain balance reads and wallet creation
- `ethers` 5.8.0 — Present as dependency; viem is the active client

**Database:**
- `better-sqlite3` 12.9.0 — SQLite driver; database at `/data/polymarket.db` (path via `DB_PATH` env var)
- `drizzle-orm` 0.45.2 — ORM layer; schema defined in `src/db/schema.ts`

**Messaging:**
- `telegraf` 4.16.3 — Telegram Bot framework; used in `src/api/telegram.ts`
- `ws` 8.20.0 — WebSocket client; used in `src/websocket/client.ts` (Polymarket feed) and `src/research/binance.ts`

**Logging:**
- `pino` 10.3.1 — Structured JSON logger; initialized in `src/logging/index.ts`
- `pino-pretty` 13.x — Human-readable log formatting in dev mode

**Proxy Support:**
- `global-agent` 4.1.3 — Global HTTP/HTTPS proxy agent
- `proxy-agent` 8.0.1 — Per-request proxy agent
- `socks-proxy-agent` 10.0.0 — SOCKS5 proxy support

**Configuration:**
- `yaml` 2.8.3 — Parses `config.yaml`; used in `src/config/index.ts`

**Python Scraping (requirements.txt):**
- `crawl4ai >= 0.5.0` — Headless web scraper used by `scripts/crawl4ai_web.py` and `scripts/crawl4ai_search.py`
- `tweepy >= 4.14.0` — Twitter/X API v2 client used by `scripts/twitter_scraper.py`
- `praw >= 7.7.0` — Reddit API client (PRAW) used by `scripts/reddit_scraper.py`

## Configuration

**Application Config:**
- `config.yaml` (repo root) — loaded at startup by `src/config/index.ts`
- Required fields: `dryRun` (boolean), `safety.maxPositionSizePct`
- Contains: `polymarket.host`, `polymarket.chainId`, `logging.level`, `logging.pretty`, optional `railway.*`

**Environment:**
- `.env` file present (gitignored); `.env.example` documents all required vars
- All secrets are env vars (see INTEGRATIONS.md for full list)

**Build:**
- `tsconfig.json` — target ES2022, ESNext modules, `bundler` module resolution, strict mode, outputs to `dist/`
- `railpack.json` — Railpack build config: installs npm deps, runs `npm run build`, starts with Python pip install + `npm start`

## Platform Requirements

**Development:**
- Node.js >= 20.10.0
- Python 3.13+ (for scraper subprocess execution)
- npm for dependency management

**Production:**
- Railway.app (see `railway.json` and `railpack.json`)
- Persistent volume mounted at `/data` (SQLite database lives here)
- Health check endpoint: `GET /health` on port `$PORT` (default 3000)
- Single replica; restart on failure with max 10 retries

---

*Stack analysis: 2026-05-12*
