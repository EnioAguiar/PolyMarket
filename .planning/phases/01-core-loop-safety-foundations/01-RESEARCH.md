# Phase 1: Core Loop + Safety Foundations - Research

**Gathered:** 2026-04-19
**Purpose:** Technical research for planning Phase 1

---

## Polymarket API Architecture

### Two-Endpoint Model

| Endpoint | Purpose | Auth Required |
|----------|---------|--------------|
| `gamma-api.polymarket.com` | Market discovery, odds, orderbook | No (public) |
| `clob.polymarket.com` | Trading, order placement, positions | Yes (L1→L2 auth) |

### SDKs Available

| Package | Version | Purpose |
|---------|---------|---------|
| `@polymarket/clob-client-v2` | latest (npm) | TypeScript trading client |
| `py-clob-client-v2` | latest (pip) | Python data fetching |
| `polymarket-client-sdk` | latest (crates.io) | Rust client |

**Important:** The official SDK is `clob-client-v2`, not the old `clob-client` package. Version 5.1.0 had a broken dist folder — use latest.

### Node.js Requirement

The CLOB Client requires **Node.js 20.10+**. Check with `node --version` before deployment.

---

## TypeScript Client Initialization

```typescript
import { ClobClient } from "@polymarket/clob-client-v2";
import { Wallet } from "ethers"; // v5

const HOST = "https://clob.polymarket.com";
const CHAIN_ID = 137; // Polygon mainnet

const signer = new Wallet(process.env.PRIVATE_KEY);

// Derive API credentials (L1 → L2 auth)
const tempClient = new ClobClient({ host: HOST, chain: CHAIN_ID, signer });
const apiCreds = await tempClient.createOrDeriveApiKey();

// Initialize trading client
const client = new ClobClient({
  host: HOST,
  chain: CHAIN_ID,
  signer,
  creds: apiCreds,
  signatureType: 0, // EOA wallet
  funderAddress: signer.address,
});
```

### Key Configuration

- **Signature Type 0**: EOA wallet — wallet pays its own gas
- **Chain ID 137**: Polygon mainnet
- **Funder address**: Your wallet address that holds pUSD (for buying) and POL (for gas)

---

## Market Discovery (Gamma API - Public)

```typescript
// Fetch markets — no API key needed
const response = await fetch(
  "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=10"
);
const markets = await response.json();

// Filter by category and time
const filtered = markets.filter(m => 
  m.categories?.includes('crypto') &&
  // time filtering happens client-side based on market data
);

// Market structure
{
  id: "condition_id",
  question: "Will BTC exceed $100k by end of 2024?",
  clobTokenIds: ["yes_token_id", "no_token_id"],
  market_slug: "...",
  categories: ["crypto"],
  // ... more fields
}
```

### Filtering Strategy

- **Category**: Filter via `categories` array in market object
- **Time horizon (5min-24h)**: Use `resolve_time` field — only markets with resolution time within window
- **Active markets**: `?active=true&closed=false`

---

## Orderbook Depth

The CLOB client provides orderbook data:

```typescript
// Get orderbook for a specific token
const orderbook = await client.getOrderBook({
  token_id: "YOUR_TOKEN_ID",
  depth: 10, // levels
});

// Response structure
{
  bids: [{ price: 0.45, size: 100 }, ...],
  asks: [{ price: 0.47, size: 50 }, ...],
}
```

---

## Safety Module Architecture

### Required Safety Features (per ROADMAP success criteria)

1. **Max position size**: 5-10% per market (configurable)
2. **Daily loss limit**: Stop trading when threshold exceeded
3. **Drawdown kill switch**: Halt on extreme drawdown

### Design Decision: Dedicated Module

As per D-03, safety module is **separate from execution flow**. This provides:
- Clear boundaries
- Less AI hallucination risk
- Easier to verify and audit
- Explicit call points in the loop

### Safety Module Structure

```
src/
  safety/
    index.ts          # Exports all safety functions
    position-limits.ts # Max position size enforcement
    daily-loss.ts     # Daily loss limit tracking
    drawdown.ts       # Drawdown kill switch
    types.ts          # Safety configuration types
```

### Configuration (per D-02, dry-run via config file)

```typescript
// config.yaml or config.json
safety:
  maxPositionSizePct: 0.08  # 8% of bankroll
  dailyLossLimitPct: 0.05   # 5% daily loss limit
  drawdownKillSwitchPct: 0.15  # 15% total drawdown
  dryRun: true  # Log decisions without executing
```

---

## Railway Deployment

### Cron Configuration

Railway cron:
- Minimum interval: 5 minutes
- Service starts → executes → exits
- If process hangs, subsequent runs skip

### Health Checks

Railway health check endpoint:
- GET `/health` returns 200 if service is healthy
- Configure in `railway.json` or dashboard

### Secrets Management

Per D-04, use Railway secrets for:
- `PRIVATE_KEY`: Wallet private key
- `POLYMARKET_API_KEY` (if applicable)

### Self-Ping (DEPL-02)

For Railway's 99.9% uptime guarantee, implement self-ping:
- Cron triggers every 5 minutes
- If bot crashes, Railway marks service as down
- External monitoring catches this

---

## Logging Strategy (D-05)

### Pino for TypeScript

```typescript
import pino from 'pino';

const logger = pino({
  level: 'debug', // Verbose for debugging
  transport: {
    target: 'pino-pretty', // Human-readable in dev
    options: { colorize: true }
  }
});

// Structured log fields
logger.info({ 
  marketId: 'xxx', 
  action: 'bet_decision',
  dryRun: true,
  reason: 'odds_within_threshold' 
}, 'Decision logged');
```

### Log Fields for Betting Bot

| Field | Purpose |
|-------|---------|
| `timestamp` | ISO 8601 |
| `marketId` | Polymarket condition ID |
| `action` | `monitor`, `analyze`, `bet`, `skip` |
| `odds` | Current price |
| `dryRun` | Whether this is a simulated trade |
| `positionSize` | Amount wagered |
| `safetyCheck` | `passed`, `failed_max_position`, `failed_daily_loss` |

---

## Dry-Run Mode Implementation

### Config-Driven (D-02)

```typescript
import { readFileSync } from 'fs';
import yaml from 'yaml';

const config = yaml.parse(readFileSync('./config.yaml', 'utf8'));

if (config.dryRun) {
  logger.info({ msg: 'DRY RUN MODE — no trades will be executed' });
}

// In execution flow
async function placeBet(market, odds, size) {
  if (config.dryRun) {
    logger.info({ market, odds, size, msg: 'Would place bet but dry-run enabled' });
    return { dryRun: true, simulated: true };
  }
  return await client.createAndPostOrder(...);
}
```

---

## File Structure (Phase 1 Outputs)

```
polymarket-bot/
├── src/
│   ├── index.ts              # Entry point, Railway cron handler
│   ├── config/
│   │   └── index.ts         # Config file loader
│   ├── api/
│   │   ├── polymarket.ts    # Gamma API client (market data)
│   │   └── clob.ts          # CLOB client (trading)
│   ├── safety/
│   │   ├── index.ts
│   │   ├── position-limits.ts
│   │   ├── daily-loss.ts
│   │   ├── drawdown.ts
│   │   └── types.ts
│   ├── logging/
│   │   └── index.ts         # Pino logger setup
│   └── types/
│       └── index.ts         # Shared types
├── tests/
│   ├── safety.test.ts
│   └── api.test.ts
├── config.yaml              # Configuration file
├── package.json
├── tsconfig.json
├── railway.json             # Railway deployment config
└── .env.example             # Example env vars
```

---

## Dependencies

```json
{
  "dependencies": {
    "@polymarket/clob-client-v2": "latest",
    "ethers": "5.x",
    "pino": "^10.0.0",
    "yaml": "^2.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
}
```

---

## Validation Architecture

Phase 1 creates the foundation — subsequent phases add complexity. Validation approach:

1. **Unit tests** for safety module (position limits, daily loss, drawdown)
2. **Integration tests** for API client (mock gamma API responses)
3. **Dry-run verification** — run loop in dry-run mode, verify no actual trades
4. **Safety audit** — verify safety module is called at correct points in loop

---

## Common Pitfalls

1. **Wrong SDK version**: Use `clob-client-v2` not `clob-client`
2. **Node version too low**: Requires 20.10+, check before deployment
3. **Missing POL for gas**: EOA wallet needs POL on Polygon for transaction fees
4. **Missing pUSD for trading**: Need pUSD to buy outcome tokens
5. **Config file location**: Must be at project root, not in src/

---

## Canonical References

- Quickstart: https://docs.polymarket.com/quickstart
- Clients & SDKs: https://docs.polymarket.com/api-reference/clients-sdks
- Authentication: https://docs.polymarket.com/api-reference/authentication
- Trading: https://docs.polymarket.com/trading/overview
- GitHub (clob-client-v2): https://github.com/Polymarket/clob-client-v2

---

*Research completed: 2026-04-19*
*Phase: 01-core-loop-safety-foundations*