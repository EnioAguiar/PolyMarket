# Technology Stack

**Analysis Date:** 2026-04-19

## Languages

**Primary:**
- TypeScript 5.4+ - Core language for all bot logic
- Node.js 20.10+ - Runtime environment

## Runtime

**Environment:**
- Node.js 20.x LTS via Railway NIXPACKS builder (`railway.json`)
- ES Modules (`"type": "module"` in `package.json`)

**Package Manager:**
- npm (via `package-lock.json`)

## Core Dependencies

### TypeScript/Build
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.4.0 | TypeScript compiler |
| `ts-node` | ^10.9.0 | TypeScript execution (`--loader ts-node/esm`) |

### Polymarket Integration
| Package | Version | Purpose |
|---------|---------|---------|
| `@polymarket/clob-client-v2` | latest | CLOB trading client for order execution |
| `ethers` | ^5.8.0 | Wallet signing, Ed25519 signatures (NOT v6) |

### Logging
| Package | Version | Purpose |
|---------|---------|---------|
| `pino` | ^10.0.0 | Structured JSON logging |
| `pino-pretty` | ^13.0.0 | Human-readable dev logging |

### Configuration
| Package | Version | Purpose |
|---------|---------|---------|
| `yaml` | ^2.0.0 | Parse `config.yaml` |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^1.0.0 | Unit testing framework |
| `eslint` | ^9.0.0 | Linting |
| `@typescript-eslint/eslint-plugin` | ^8.0.0 | TS ESLint rules |
| `@typescript-eslint/parser` | ^8.0.0 | TS ESLint parser |
| `@types/node` | ^22.0.0 | Node.js type definitions |

## TypeScript Configuration

**File:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  }
}
```

Key settings:
- `strict: true` - Full type checking enabled
- `moduleResolution: "bundler"` - For ESM with bundler-style resolution
- Output to `dist/`, source in `src/`

## Railway Deployment

**Files:** `railway.json`, `Railway.toml`

### Build Configuration (`railway.json`)
```json
{
  "build": {
    "builder": "NIXPACKS",
    "nixpacks": { "nodeVersion": "20" }
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Cron Configuration (`Railway.toml`)
```toml
[cron]
expression = "*/5 * * * *"
disabled = false

[trigger]
service = "polymarket-bot"
```

- **Interval:** 5 minutes (Railway minimum)
- **Behavior:** Service starts → executes cycle → exits cleanly
- **Health Check:** `/health` endpoint on port 3000

## Project Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run start` | Run compiled bot (`node dist/index.js`) |
| `npm run dev` | Run with ts-node ESM loader |
| `npm run test` | Run vitest tests |
| `npm run lint` | ESLint on `src/` |

## File Structure

```
polymarket/
├── src/
│   ├── index.ts          # Entry point, health check server
│   ├── main.ts           # Bot cycle logic
│   ├── api/
│   │   ├── polymarket.ts # Gamma API client
│   │   └── clob.ts       # CLOB client wrapper
│   ├── config/
│   │   └── index.ts      # YAML config loader
│   ├── logging/
│   │   └── index.ts      # Pino logger init
│   ├── safety/
│   │   ├── index.ts      # SafetyModule class
│   │   ├── daily-loss.ts  # Daily loss tracker
│   │   ├── drawdown.ts    # Drawdown tracker
│   │   └── position-limits.ts
│   └── types/
│       └── index.ts      # TypeScript interfaces
├── config.yaml           # Bot configuration
├── package.json
├── tsconfig.json
├── railway.json          # Railway build config
└── Railway.toml          # Railway cron config
```

---

*Stack analysis: 2026-04-19*
