# Architecture Patterns — Polymarket Bot

**Project:** Polymarket Prediction Trading Bot
**Researched:** April 2026
**Confidence:** MEDIUM-HIGH (multiple independent sources, real-world implementations documented)

---

## Overview

A Polymarket bot is a layered system that moves data through: fetch → classify → analyze → decide → execute → track. The key architectural insight from real implementations: **separate the brain (planning/judgment) from the hands (execution/determinism)**, and use a shared workspace as the communication bus between them.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          POLYMARKET BOT ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   SOURCE    │───▶│  RESEARCH   │───▶│  DECISION  │───▶│  EXECUTION  │  │
│  │  DATABASE   │    │   PIPELINE  │    │   ENGINE   │    │    LAYER    │  │
│  │             │    │             │    │            │    │             │  │
│  │ • Categories│    │ • Fetch     │    │ • Odds     │    │ • Polymarket│  │
│  │ • Ratings   │    │ • Process   │    │   analysis │    │   CLOB API  │  │
│  │ • Feeds     │    │ • Classify  │    │ • Probability│  │ • Order    │  │
│  │             │    │ • Analyze   │    │ • Stake calc│   │   mgmt     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘  │
│                                                                     │       │
│  ┌─────────────────────────────────────────────────────────────────┴─────┐  │
│  │                         LOOP / SCHEDULER                            │     │
│  │                    Continuous monitoring, timing                   │     │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Boundaries

### 1. Research Pipeline

**Responsibility:** Ingest raw market data, process it, classify opportunities, produce analysis signals.

**Inputs:** Market feeds (Polymarket API, WebSocket for orderbook), external feeds (news, CEX prices).

**Outputs:** Classified opportunities with metadata (category, confidence, expected value).

**Sub-components:**

| Sub-component | Responsibility | Boundary |
|---------------|---------------|----------|
| **Data Fetcher** | Pulls market metadata, orderbook snapshots, trade history via REST/WebSocket | Only speaks to external APIs |
| **Processor** | Normalizes data, computes derived metrics (spread, depth, momentum) | Takes raw data → emits processed |
| **Classifier** | Categorizes markets (binary/categorical), tags by topic, scores opportunity type | Stateless, pure function |
| **Analyzer** | Produces signals: momentum, arbitrage detection, confidence scoring | Consumes classified markets |

**Data flow:**
```
Market API → Fetcher → Processor → Classifier → Analyzer → Signal Store
```

**Build order note:** Start here first. All downstream decisions depend on clean, normalized market data. A common failure mode is building execution logic on top of unverified price sources (bid vs. ask mismatch caused LayerX's momentum strategy to fail live after paper trading succeeded).

---

### 2. Decision Engine

**Responsibility:** Given signals, compute probability estimates and optimal stake sizing.

**Inputs:** Signals from Research Pipeline, current bankroll, risk parameters.

**Outputs:** Trade orders with specified size, entry price, stop conditions.

**Sub-components:**

| Sub-component | Responsibility | Boundary |
|---------------|---------------|----------|
| **Odds Analyzer** | Compares market price vs. estimated true probability | No execution, only computation |
| **Probability Estimator** | Generates probability estimates from signals/external data | Pure function, testable in isolation |
| **Stake Calculator** | Determines position size given bankroll, odds, risk params | Deterministic, no external calls |
| **Arbitrage Optimizer** | For multi-leg opportunities, computes optimal allocation (e.g., Frank-Wolfe for Bregman projection) | Math-heavy, self-contained |

**Key constraint:** The decision engine must receive real execution prices (ask for buys, bid for sells), not just reference prices. Paper trading using different price sources than live execution produces phantom profits (documented failure in LayerX's CEX Momentum strategy).

**Arbitrage detection logic (from LayerX research):**
- **Complement constraint:** Binary YES + NO must sum to $1 at settlement
- **Partition constraint:** Categorical outcomes sum to exactly 1
- **Subset constraint:** P(A) ≤ P(A or B)
- **Implication constraints:** Domain-specific rules (e.g., election states)

---

### 3. Execution Layer

**Responsibility:** Place orders on Polymarket, manage fills, track positions.

**Boundary:** Only component that makes external API calls to Polymarket CLOB.

**Sub-components:**

| Sub-component | Responsibility | Boundary |
|---------------|---------------|----------|
| **Polymarket Client** | CLOB API integration with signature handling (L1 EIP-712, L2 HMAC) | Auth, signing, order submission |
| **Order Manager** | Tracks open orders, cancel/replace, handle fills | No strategy logic |
| **Position Tracker** | Maintains current positions, realized/unrealized P&L | Read-only from execution |
| **Execution Guard** | Validates orders against slippage tolerance, orderbook depth before sending | Gatekeeper, blocks bad fills |

**Critical behavior:** Dual-leg execution protection — if one leg of an arbitrage fills, the other must be auto-sold or hedged. Never leave orphan legs.

**Fee model:** Polymarket has market-specific fee regimes (most markets are fee-free, some have taker fees). Must incorporate actual fees into all P&L calculations or systematic overestimation occurs.

---

### 4. Source Database

**Responsibility:** Persistent storage for ratings, categories, external data feeds used by classifier/analyzer.

**Schema suggestion:**

```typescript
// Category metadata
interface Category {
  id: string;
  name: string;           // e.g., "crypto", "politics", "sports"
  priority: number;       // scanning priority
  maxPositionPct: number; // risk limit per category
}

// Feed configuration
interface FeedConfig {
  id: string;
  type: 'rest' | 'websocket' | 'news';
  endpoint: string;
  pollIntervalMs: number;
  auth: { type: 'none' | 'apiKey' | 'hmac' };
}

// Market ratings (manual or ML-generated)
interface MarketRating {
  marketId: string;
  categoryId: string;
  confidenceScore: number;  // 0-1
  expectedValue: number;    // positive = edge exists
  source: 'signal' | 'manual' | 'model';
  updatedAt: Date;
}
```

**Build order note:** This can be minimal initially (flat files or SQLite), evolved to PostgreSQL if complexity grows. Don't over-engineer before validating the system works.

---

### 5. Loop / Scheduler

**Responsibility:** Orchestrates continuous operation — scan markets, trigger analysis, dispatch execution.

**Options:**

| Pattern | When to Use | Complexity |
|---------|-------------|------------|
| **Polling loop** | Simple, predictable intervals | Low |
| **Event-driven** | React to WebSocket updates (orderbook changes) | Medium |
| **Hybrid** | Fast scan on events + periodic full scan | High |

**Key behaviors:**
- Stale data detection: if market data is older than N seconds, halt trading until refresh
- Kill switch: check for `state/STOP` file on every iteration
- Max exposure limits: per market, per category, per day
- Consecutive loss halts: disable strategy after N losses in a row

**Recommended approach for Polymarket:** Hybrid — WebSocket for orderbook depth changes + REST polling every 30-60s for market list updates. LayerX used 30-second scan cycles.

---

### 6. Category-Specific Research Modules (Optional initially)

**Responsibility:** Specialized logic per market category (crypto vs. politics vs. sports).

**Rationale for deferring:** Category-specific modules add complexity and should only be built after core loop is stable. Adding "sports专用" logic before understanding the core pipeline creates maintenance burden.

**If needed later, scope:**
- CEX price integration for crypto threshold markets
- Event calendar integration for earnings/politics
- Sentiment analysis for social-driven markets

---

## Data Flow

### Primary Flow (Happy Path)

```
1. Scheduler triggers scan
2. Data Fetcher pulls all active markets from Polymarket API
3. Processor normalizes → computes spread, depth, momentum
4. Classifier tags markets by category, marks opportunity type
5. Analyzer detects signals:
   - Arbitrage: YES + NO < $1 (minus fees)
   - Momentum: CEX price change correlated with Polymarket direction
   - Confidence: market price below estimated probability
6. Decision Engine:
   - Odds Analyzer compares signal price vs. market price
   - Probability Estimator produces estimate
   - Stake Calculator computes position size
7. Execution Layer:
   - Execution Guard validates liquidity/depth
   - Polymarket Client submits order
   - Order Manager tracks fill
   - Position Tracker updates portfolio
8. Loop logs result, waits for next cycle
```

### Error Flow

```
Execution fails → Order Manager records failure
                 → Execution Guard flags for retry
                 → If orphaned leg: auto-hedge/sell that leg
                 → Log to brain_inbox if retry limit exceeded
                 → Brain (if implemented) reviews, decides to retry/abandon
```

---

## Suggested Build Order

### Phase 1: Data Pipeline (Foundation)
- Polymarket API client (fetch markets, orderbook, place orders)
- Minimal processor (spread calculation)
- Polling loop (basic scheduler)
**Why:** Everything else depends on market data. Validate API integration before building strategy.

### Phase 2: Arbitrage Detection (First Strategy)
- Constraint checker (binary complement: YES + NO < $1)
- Simple stake calculator (fixed % of bankroll)
- Execution guard (validate depth before ordering)
**Why:** Mathematically sound, risk-free by definition. Real implementations (LayerX Bregman) show this is the only strategy that survived live testing.

### Phase 3: Paper Trading Validation
- Simulated fills against orderbook depth (not mid-price)
- Conservative slippage assumptions
- Complete P&L logging with fee breakdown
**Why:** Paper trading using bid prices while live uses ask prices is the #1 failure mode. Must simulate realistic execution.

### Phase 4: Position Tracking & Monitoring
- Real-time P&L dashboard
- Telegram alerts for opportunities and trades
- Consecutive loss / daily stop limits
**Why:** Without visibility, you can't validate or trust the system.

### Phase 5: Additional Strategies (Optional)
- Momentum detection (CEX → Polymarket lag)
- Category-specific modules
- Cross-market arbitrage (Polymarket vs. Kalshi)
**Why:** Complexity increases significantly. Only add after core is stable.

---

## Architecture Anti-Patterns

### ❌ Monolithic script
Everything in one file: API calls, strategy logic, order placement, logging. Hard to test, impossible to debug in production.

### ❌ Bid/ask price mismatch between paper and live
Paper trading validated with Gamma API bid prices; live execution uses CLOB ask prices. Phantom profits in simulation, real losses in live trading.

### ❌ Directional strategies without genuine edge
"Buy when price > 80¢" has no predictive value — the market price already reflects known information. Directional strategies in efficient markets are negative-sum after spread.

### ❌ Orphan legs in arbitrage
One leg fills, other doesn't → unhedged directional position. Must auto-close or hedge failed leg immediately.

### ❌ No kill switch
Network partition + continued ordering → unbounded losses. File-based kill switch (`state/STOP`) that halts on next cycle.

---

## Scalability Considerations

| Scale | Challenge | Approach |
|-------|-----------|----------|
| 10 markets | Single-threaded polling is fine | Simple loop |
| 100 markets | Polling latency | Event-driven + priority queue |
| 1000 markets | Computation bottleneck | Batch processing, pre-computed signals |
| Multi-venue | Normalization across APIs | Adapter pattern (PolymarketAdapter, KalshiAdapter) |

---

## Sources

- **LayerX blog** (layerx.xyz) — 4-strategy evolution, Bregman Arbitrage, live trading results with real P&L
- **Dev Genius** (blog.devgenius.io) — Two-layer AI architecture, brain/hands separation, shared workspace protocol
- **PredictionMarket.tools** — Bot architecture diagram, strategy taxonomy
- **Polymarket Documentation** (docs.polymarket.com) — CLOB API, WebSocket, authentication

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Component boundaries | HIGH | Multiple independent sources agree on layered structure |
| Data flow | HIGH | Consistent across implementations |
| Build order | MEDIUM | Based on documented failure patterns (what failed first) |
| Anti-patterns | HIGH | Real-world failures documented with exact causes |