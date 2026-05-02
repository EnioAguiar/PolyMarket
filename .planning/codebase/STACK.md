# Technology Stack

**Analysis Date:** 2026-05-02

## Languages

**Primary:**
- TypeScript 5.4+ - Core bot logic, orchestration, type safety across TS/Python boundary
- Python 3.11+ - Data processing, ML inference, social media scrapers

**Secondary:**
- None detected

## Runtime

**Environment:**
- Node.js ≥20.10.0 - TypeScript runtime for core bot
- Python 3.11+ - For subprocess scripts (Twitter, Reddit, Crawl4AI)

**Package Manager:**
- npm - Node.js package management
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- None - Pure TypeScript with type safety

**Trading/Blockchain:**
- `@polymarket/clob-client-v2` (latest) - Official Polymarket CLOB trading client
- `ethers` v5.8.0 - Wallet/signatures for Polymarket authentication (NOT v6)

**AI/LLM:**
- None (direct API calls) - MiniMax API via HTTP fetch

**Data Processing:**
- `better-sqlite3` v12.9.0 - Local SQLite database
- `drizzle-orm` v0.45.2 - Type-safe SQL with SQLite

**WebSocket:**
- `ws` v8.20.0 - WebSocket client for Binance real-time data

**Logging:**
- `pino` v10.0.0 - Structured JSON logging
- `pino-pretty` v13.0.0 - Human-readable dev logging

**Configuration:**
- `yaml` v2.0.0 - YAML config parsing

**Testing:**
- `vitest` v1.0.0 - Unit testing framework

**Build/Dev:**
- `typescript` v5.4.0 - TypeScript compiler
- `ts-node` v10.9.0 - TypeScript execution for dev
- `eslint` v9.0.0 - Linting with TypeScript support

## Key Dependencies

**Critical:**
- `@polymarket/clob-client-v2` - Polymarket trading execution
- `ethers` v5 - Wallet/Ed25519 signatures for CLOB auth
- `drizzle-orm` - Database ORM for source ratings and research results
- `better-sqlite3` - SQLite driver for Drizzle

**Infrastructure:**
- `pino` - Structured logging for Railway deployment
- `ws` - Real-time Binance price feeds

## Configuration

**Environment:**
- `.env` file for secrets (NEVER commit)
- `config.yaml` for application settings (dry run, safety limits, Polymarket hosts)
- Railway deployment via `railway.json`

**Key configs in `config.yaml`:**
- `dryRun: true` - Log only, no real trades
- `polymarket.host` - CLOB API endpoint
- `polymarket.gammaHost` - Gamma API endpoint
- `polymarket.chainId: 137` - Polygon mainnet
- Safety limits (position size, daily loss, drawdown)

**Key env vars (from `.env.example`):**
- `PRIVATE_KEY` - Ethereum wallet for signing
- `FUNDER_ADDRESS` - Wallet address for funding
- `MINIMAX_API_KEY` - AI inference
- `NEWSDATA_API_KEY` - News API
- `TWITTER_BEARER_TOKEN` - Twitter API
- `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` - Reddit API

## Build Configuration

**TypeScript (`tsconfig.json`):**
- Target: ES2022
- Module: ESNext with bundler resolution
- Strict mode enabled
- Output: `./dist` directory

**Railway (`railway.json`):**
- Builder: RAILPACK
- Health check: `/health` endpoint
- Idle timeout: 300 seconds
- Max retries: 10 on failure

## Python Dependencies (requirements.txt)

**Social Media APIs:**
- `tweepy>=4.14.0` - Twitter API v2
- `praw>=7.7.0` - Reddit API

**Note:** Python scripts run as subprocesses from TypeScript. Libraries installed in `.venv` or `.venv311`.

---

*Stack analysis: 2026-05-02*