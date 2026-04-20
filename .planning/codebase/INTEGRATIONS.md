# External Integrations

**Analysis Date:** 2026-04-19

## Polymarket Integration

### Gamma API (Market Data)

**Endpoint:** `https://gamma-api.polymarket.com`

**Implementation:** `src/api/polymarket.ts`

```typescript
const GAMMA_BASE_URL = 'https://gamma-api.polymarket.com';

export async function fetchMarkets(params: {
  limit?: number;
  minEndDate?: Date;
  maxEndDate?: Date;
}): Promise<Market[]>
```

**Used for:**
- Fetching active markets with date filters
- Retrieving market metadata (question, categories, token IDs)
- Filtering markets by end date (5min-24h range)

**Auth:** None (public API)

---

### Polymarket CLOB (Order Execution)

**Host:** `https://clob.polymarket.com`

**Chain ID:** 137 (Polygon mainnet)

**Implementation:** `src/api/clob.ts`

```typescript
import { ClobClient } from '@polymarket/clob-client-v2';
import { Wallet } from 'ethers';

export function createClobClient(config: Config): ClobClient {
  const signer = new Wallet(privateKey);
  clobClient = new ClobClient({ host, chain, signer });
  return clobClient;
}
```

**SDK:** `@polymarket/clob-client-v2` (npm)

**Auth:** Ed25519 EOA signature (wallet private key via `PRIVATE_KEY` env var)

**Required Environment Variables:**
- `PRIVATE_KEY` - Wallet private key for signing
- `FUNDER_ADDRESS` - Wallet address holding pUSD for trading + POL for gas

**Used for:**
- `getOrderBook(tokenId)` - Fetch orderbook for a market
- Order signing and submission
- Position queries

---

## Blockchain

**Network:** Polygon (Matic) Mainnet

**Chain ID:** 137

**Purpose:** Settlement layer for Polymarket markets

**Gas Token:** MATIC/POL

**Wallet Type:** EOA (Externally Owned Account) with Ed25519 signature type 0

---

## Configuration

**Source:** `config.yaml` (YAML file, NOT environment variables)

**Implementation:** `src/config/index.ts`

```typescript
export function loadConfig(): Config {
  const configPath = './config.yaml';
  const fileContents = readFileSync(configPath, 'utf8');
  return parse(fileContents) as Config;
}
```

**Key Config Values:**
```yaml
polymarket:
  host: "https://clob.polymarket.com"
  gammaHost: "https://gamma-api.polymarket.com"
  chainId: 137  # Polygon mainnet

dryRun: true  # true = log only, false = execute trades

safety:
  maxPositionSizePct: 0.08    # 8% of bankroll per bet
  dailyLossLimitPct: 0.05     # 5% daily loss limit
  drawdownKillSwitchPct: 0.15 # 15% drawdown killswitch
```

---

## Railway Deployment

**Platform:** Railway (Cron Jobs)

**Files:** `railway.json`, `Railway.toml`

### Environment Variables (Railway Secrets)

Set via Railway dashboard:
- `PRIVATE_KEY` - Wallet private key
- `FUNDER_ADDRESS` - Wallet address

### Health Check

**Endpoint:** `/health` (HTTP GET)

**Port:** 3000 (or `PORT` env var)

**Response:**
```json
{
  "status": "healthy|initializing",
  "timestamp": "2026-04-19T...",
  "service": "polymarket-bot"
}
```

---

## No External Integrations Detected

The following common integrations are NOT used:
- **Binance API** - Not implemented (only referenced in AGENTS.md as potential future feature)
- **Google APIs** - None
- **PostgreSQL/Database** - Not yet implemented (in-memory state only)
- **External AI/LLM APIs** - Not yet implemented (Phase 2)

---

## Environment Configuration Summary

| Variable | Location | Purpose |
|----------|----------|---------|
| `PRIVATE_KEY` | Railway secrets | Wallet signing for CLOB |
| `FUNDER_ADDRESS` | Railway secrets | pUSD/POL wallet address |
| `PORT` | Railway env | Health check server port |

| Config | Location | Purpose |
|--------|----------|---------|
| `config.yaml` | Repo file | Bot behavior, safety limits, API hosts |
| `railway.json` | Repo file | Build/deploy config |
| `Railway.toml` | Repo file | Cron schedule |

---

*Integration audit: 2026-04-19*
