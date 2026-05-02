# Architecture

**Analysis Date:** 2026-05-02

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        Entry Points                                  │
│   `src/index.ts` (Event-driven WebSocket)  │  `src/main.ts` (Cron) │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Core Orchestration                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  SafetyModule│  │ CycleManager│  │ BankrollModule│ │ResearchAgg│  │
│  │ `safety/`   │  │ `betting/`  │  │ `bankroll/`  │  │`research/`│  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────────────────┐
│   API Layer    │ │  AI Layer      │ │     Execution Layer        │
│  `api/`        │ │  `ai/`         │ │  `execution/`              │
│  - polymarket  │ │  - MiniMaxAI   │ │  - limit-orders            │
│  - clob        │ │  - AIValidator │ │  - slippage                │
│                │ │  - AIChain     │ │  - arbitrage               │
└────────────────┘ └────────────────┘ └────────────────────────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Infrastructure                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  WebSocket  │  │    DB       │  │   Logging   │  │   Config   │ │
│  │ `websocket/`│  │ `db/`       │  │ `logging/`  │  │ `config/`  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **PolymarketWsClient** | WebSocket connection management, reconnection logic | `src/websocket/client.ts` |
| **EventRouter** | Event dispatch to handlers | `src/websocket/events.ts` |
| **SafetyModule** | Kill switch, position limits, drawdown/daily loss tracking | `src/safety/index.ts` |
| **CycleManager** | Betting cycle state, market mutex, 24h cooldown | `src/betting/cycle.ts` |
| **BankrollModule** | Position sizing, exposure caps | `src/bankroll/index.ts` |
| **ResearchAggregator** | Parallel source fetching, signal aggregation | `src/research/aggregator.ts` |
| **BayesianScorer** | Weighted confidence scoring | `src/research/confidence.ts` |
| **AIChain** | Orchestrates AI estimate generation | `src/ai/chain.ts` |
| **MiniMaxAI** | LLM inference for probability estimates | `src/ai/minimax.ts` |
| **ClobClient** | Order book fetching, order placement | `src/api/clob.ts` |
| **Gamma API** | Market discovery, filtering | `src/api/polymarket.ts` |

## Pattern Overview

**Overall:** Event-driven with polling fallback for cron-based execution

**Key Characteristics:**
- WebSocket-driven real-time market event handling
- Research-first approach with 10-source minimum before bet decisions
- Safety gates at multiple layers (safety module + execution checks)
- Bayesian confidence scoring weighted by source rating
- Cycle-based betting with mutex to prevent duplicate processing

## Layers

**Entry Layer:**
- Location: `src/index.ts`, `src/main.ts`
- Contains: HTTP health server, WebSocket client initialization, bot cycle logic
- Depends on: All other modules
- Used by: Railway cron, direct node execution

**Orchestration Layer:**
- Location: `src/safety/`, `src/betting/`, `src/bankroll/`, `src/research/`
- Contains: Business logic coordination, state management
- Depends on: API layer, types
- Used by: Entry layer

**API Layer:**
- Location: `src/api/`
- Contains: Polymarket Gamma API client, CLOB client, orderbook utilities
- Depends on: External APIs (Polymarket, CLOB)
- Used by: Orchestration layer

**AI Layer:**
- Location: `src/ai/`
- Contains: MiniMax inference, chain-of-thought, validation
- Depends on: Research signals, API layer
- Used by: Research aggregator output processing

**Execution Layer:**
- Location: `src/execution/`
- Contains: Order placement, slippage calculation, arbitrage detection
- Depends on: ClobClient, config
- Used by: Entry layer (when not dry-run)

**Infrastructure Layer:**
- Location: `src/websocket/`, `src/db/`, `src/logging/`, `src/config/`
- Contains: WebSocket handling, SQLite/Drizzle persistence, Pino logging, YAML config
- Depends on: Node.js built-ins
- Used by: All layers

## Data Flow

### Primary Request Path (Event-Driven Mode)

1. **WS Connection** (`src/websocket/client.ts:27`) - Connect to Polymarket WebSocket
2. **Event Routing** (`src/websocket/events.ts`) - Route events by type
3. **Market Acquisition** (`src/betting/mutex.ts`) - Acquire market lock via CycleManager
4. **Safety Check** (`src/safety/index.ts:33`) - Validate bet passes safety gates
5. **Market Evaluation** (`src/websocket/integration.ts`) - Evaluate market for opportunity
6. **Research** (`src/research/aggregator.ts:11`) - Fetch from 10+ sources in parallel
7. **Confidence Scoring** (`src/research/confidence.ts:89`) - Bayesian weighted scoring
8. **AI Estimation** (`src/ai/chain.ts:16`) - Generate probability estimate
9. **Execution** (`src/execution/limit-orders.ts`) - Place order if conditions met

### Secondary Flow (Cron Polling Mode)

1. **Market Fetch** (`src/api/polymarket.ts:5`) - Poll Gamma API for markets
2. **Date Filter** (`src/main.ts:35-43`) - Filter by 5min-24h timeframe
3. **Market Loop** (`src/main.ts:63`) - Iterate filtered markets
4. **Orderbook Fetch** (`src/api/clob.ts:40`) - Get bid/ask for YES token
5. **Liquidity Check** (`src/api/clob.ts:79`) - Verify sufficient liquidity
6. **Safety Check** (`src/safety/index.ts:33`) - Position size validation
7. **Log Decision** (`src/logging/index.ts:38`) - Record bet decision (monitor-only phase)

**State Management:**
- SafetyModule: Tracks dailyLoss, totalDrawdown, killSwitch state
- CycleManager: Tracks bet status, cycle open/closed/waiting_24h
- BankrollModule: Tracks availableBankroll, openPositions, dailyPnL
- MarketMutex: Per-market lock to prevent duplicate processing

## Key Abstractions

**ResearchSource Interface:**
- Purpose: Uniform interface for all research sources
- Examples: `src/research/google.ts`, `src/research/binance.ts`, `src/research/twitter.ts`, `src/research/reddit.ts`
- Pattern: Promise-based fetch with confidence and recency scoring

**SafetyModule:**
- Purpose: Centralized safety coordination
- Examples: Used in `src/index.ts:86`, `src/main.ts:25`
- Pattern: Composite checks (position, daily loss, drawdown)

**CycleManager:**
- Purpose: Betting cycle state machine
- Examples: `src/index.ts:130`, `src/betting/cycle.ts`
- Pattern: State transitions (open → closed → waiting_24h → open)

**BayesianScorer:**
- Purpose: Confidence calculation from heterogeneous sources
- Examples: `src/research/confidence.ts:89`
- Pattern: Weighted evidence aggregation with prior update

## Entry Points

**Event-Driven (WebSocket):**
- Location: `src/index.ts`
- Triggers: Polymarket WebSocket events (new_market, best_bid_ask, market_resolved)
- Responsibilities: WS connection, event routing, health server, graceful shutdown

**Cron Polling:**
- Location: `src/main.ts`
- Triggers: Railway cron (every 5+ minutes)
- Responsibilities: Market fetching, filtering, evaluation loop, bet decision logging

**Health Check:**
- Location: `src/index.ts:23`
- Endpoint: GET /health
- Returns: WS connection status, cycle stats

## Architectural Constraints

- **Threading:** Single-threaded Node.js event loop; WebSocket uses async/await
- **Global state:** Module-level singletons for logger (`src/logging/index.ts:4`), clobClient (`src/api/clob.ts:5`), db (`src/db/index.ts:8`)
- **Circular imports:** None detected
- **Cron limitation:** Railway minimum 5-minute interval; cycle manager handles state across runs

## Anti-Patterns

### Console.log for Debug

**What happens:** Debug output uses `console.log` directly in `src/api/polymarket.ts` and `src/main.ts`
**Why it's wrong:** Inconsistent with Pino logging throughout rest of codebase
**Do this instead:** Use `getLogger().debug()` or `getLogger().info()` with structured data

### Hardcoded Bankroll Value

**What happens:** `src/main.ts:150` sets `const bankroll = 1000` directly
**Why it's wrong:** Should use configured initial bankroll or state from SafetyModule
**Do this instead:** Pass bankroll from config or maintain consistent state across modules

### SafetyModule Instantiation Per Cycle

**What happens:** `src/main.ts:25` creates new SafetyModule each cycle
**Why it's wrong:** Loses track of cumulative state (dailyLoss, drawdown) across cycles
**Do this instead:** Maintain single SafetyModule instance across bot lifecycle

## Error Handling

**Strategy:** Graceful degradation with structured logging

**Patterns:**
- WebSocket reconnection with exponential backoff (`src/websocket/client.ts:134-156`)
- Safety checks return result objects, never throw (`src/safety/index.ts:33`)
- Research sources use Promise.allSettled for partial failures (`src/research/aggregator.ts:20`)
- Dry-run mode bypasses execution but logs all decisions

## Cross-Cutting Concerns

**Logging:** Pino with structured JSON, pino-pretty for dev (`src/logging/index.ts`)
**Validation:** AI estimates validated against current odds and signal count (`src/ai/validation.ts`)
**Authentication:** Ed25519 via ethers Wallet in CLOB client (`src/api/clob.ts:17`)

---

*Architecture analysis: 2026-05-02*