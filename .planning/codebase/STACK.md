# Technology Stack

**Analysis Date:** 2026-04-19

## Languages

**Primary:**
- TypeScript 5.4+ - Core language for all bot logic
- Node.js ≥20.10.0 - Runtime (ESM modules with `"type": "module"`)

## Runtime

**Environment:**
- Node.js 20.x LTS via Railway/NIXPACKS
- ES2022 target, ESNext modules
- Package manager: npm (package-lock.json present)

## TypeScript Configuration

**Config file:** `tsconfig.json`
```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "strict": true,
  "esModuleInterop": true,
  "skipLibCheck": true,
  "outDir": "./dist",
  "rootDir": "./src"
}
```

**Key settings:**
- Strict mode enabled
- Bundler module resolution (not node16 or nodenext)
- Source maps enabled for debugging
- Declaration files generated

## Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@polymarket/clob-client-v2` | latest | Polymarket CLOB trading client |
| `better-sqlite3` | ^12.9.0 | Local SQLite database (Drizzle ORM) |
| `drizzle-orm` | ^0.45.2 | Type-safe SQL with SQLite |
| `ethers` | ^5.8.0 | Wallet/signatures for Polymarket (v5 only) |
| `pino` | ^10.0.0 | Structured JSON logging |
| `pino-pretty` | ^13.0.0 | Human-readable dev logging |
| `ws` | ^8.20.0 | WebSocket client (Binance feeds) |
| `yaml` | ^2.0.0 | YAML config parsing |

### Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@types/better-sqlite3` | ^7.6.13 | TypeScript types |
| `@types/node` | ^22.0.0 | TypeScript types |
| `@types/ws` | ^8.18.1 | TypeScript types |
| `@typescript-eslint/eslint-plugin` | ^8.0.0 | ESLint rules |
| `@typescript-eslint/parser` | ^8.0.0 | ESLint parser |
| `eslint` | ^9.0.0 | Linting |
| `ts-node` | ^10.9.0 | TypeScript execution |
| `typescript` | ^5.4.0 | TypeScript compiler |
| `vitest` | ^1.0.0 | Unit testing |

## Build & Execution

**Build command:** `npm run build` → `tsc` → outputs to `dist/`

**Start commands:**
- `npm start` - Production: `node --loader ts-node/esm src/index.ts`
- `npm run dev` - Development (same as start)

## Railway Deployment

**Config files:**
- `railway.json` - Build and deploy config
- `Railway.toml` - Cron schedule

**Build:**
- Builder: NIXPACKS
- Node version: 20

**Deploy:**
- Replicas: 1
- Restart policy: ON_FAILURE (max 3 retries)

**Cron:**
- Expression: `*/5 * * * *` (every 5 minutes, minimum interval)
- Service exits after each cycle

**Health Check:**
- Path: `/health`
- Interval: 30s, Timeout: 5s, Startup: 30s

## Configuration

**File:** `config.yaml` (YAML, committed to repo)

Key settings:
- `dryRun: true` - Log-only mode
- `safety.*` - Position sizing, loss limits
- `polymarket.host` - CLOB endpoint
- `polymarket.gammaHost` - Markets API
- `polymarket.chainId` - 137 (Polygon mainnet)

**Secrets:** `.env` file (NOT committed)
- `PRIVATE_KEY` - Wallet EOA private key
- `FUNDER_ADDRESS` - pUSD/ POL funder address
- `GOOGLE_API_KEY` - Google Custom Search API
- `GOOGLE_SEARCH_ENGINE_ID` - Google Search Engine ID

## Source Code Structure

```
src/
├── index.ts          # Entry point, health server, cron trigger
├── main.ts           # Bot cycle orchestration
├── api/
│   ├── polymarket.ts # Gamma API (markets)
│   └── clob.ts       # CLOB client (orderbooks, trading)
├── research/
│   ├── binance.ts    # Binance WebSocket adapter
│   └── google.ts     # Google Search API adapter
├── bankroll/         # Position sizing, exposure caps
├── safety/           # Kill switches, loss limits
├── logging/          # Pino logger init
├── db/               # Drizzle ORM schema
├── config/           # YAML config loading
└── types/            # TypeScript interfaces
```

---

*Stack analysis: 2026-04-19*
