# Project Research Summary

**Project:** Polymarket Bot
**Domain:** AI-driven prediction market trading bot
**Researched:** 2026-04-13
**Confidence:** MEDIUM-HIGH

## Executive Summary

A Polymarket bot is a layered system that monitors prediction markets, gathers signals from external sources, uses an LLM to decide whether a trade is warranted, executes on-chain, and manages a bankroll. The architecture splits cleanly into a "brain" (research + decision) and "hands" (execution), communicating through a shared workspace. Research is unanimous: the only mathematically sound strategy that survives live testing is arbitrage (YES + NO < $1 minus fees) — directional strategies are negative-sum after spread in efficient markets.

The recommended stack is Node.js + TypeScript as the core with Python for data/AI processing, PostgreSQL on Railway for persistence, and OpenAI Agents SDK (not LangChain) for orchestration. The most critical finding across all research: **unrestricted wallet access + no position limits = catastrophic loss**. Real incidents (Lobstar Wilde $441K, Markitzero $4.6M) prove this. Safety features (position limits, daily loss halt, kill switch, source quality gates, AI output validation) are non-negotiable and must be built in Phase 1 — not added later.

## Key Findings

### Recommended Stack

**Stack summary:** TypeScript core (Node.js ≥20) orchestrating Python AI/data side via subprocess, Polymarket official SDKs for trading, PostgreSQL via Railway for persistence, Pino for structured logging. Avoid LangChain (heavy), Pandas (slow), SQLite on Railway (data loss on redeploy), and ethers v6 (different API from v5 docs).

**Core technologies:**
- **Node.js ≥20 LTS + TypeScript 5.x** — TypeScript core runtime; native fetch in Node 20, maintained through 2028
- **OpenAI Agents SDK** — Lightweight agent orchestration; 19k+ stars, production-tested. NOT LangChain/LangGraph (heavy, breaking changes)
- **Vercel AI SDK 6.x** — LLM integration layer connecting Python ML results to TypeScript core
- **Python 3.11+ + Polars** — Data processing; 10-30x faster than Pandas, Arrow-native
- **@polymarket/clob-client + py-clob-client** — Official SDKs; ethers v5 for signatures (NOT v6)
- **PostgreSQL on Railway** — Persistent storage via Railway volumes (NOT SQLite which loses data on redeploy)
- **Drizzle ORM** — Lightweight, type-safe, schema-first; faster than Prisma
- **Railway cron** — Deployment + scheduler; min 5-min interval, exits after execution
- **Pino 10.x + python-json-logger** — Unified structured logging across TS/Python

### Expected Features

**Must have (table stakes):**
- Market monitoring via Polymarket API (market discovery, price fetching, orderbook depth, status)
- Wallet connection and order placement via CLOB API
- Position size limits and daily loss halt (survive losing streaks)
- Bankroll tracking (running balance, open positions, realized P&L)
- Railway deployment with cron loop and health checks
- Dry-run mode before live trading

**Should have (competitive differentiators):**
- Multi-source research (Crypto APIs, Financial APIs, News, Sports) with star ratings (★1-5)
- LLM-powered decision reasoning with chain-of-thought logging
- Kelly Criterion or fixed % position sizing
- WebSocket for real-time orderbook (avoids polling rate limits)
- Telegram command interface (Polymarket.com already has the UI — don't duplicate)

**Defer (v2+):**
- Cross-platform aggregation (Kalshi, PredictIt odds)
- Multi-model LLM consensus reasoning
- Limit orders, conditional orders, multi-market execution
- Auto-compounding, category-level exposure caps
- Whale tracking via on-chain data (paid APIs, high complexity)

### Architecture Approach

The system is a layered pipeline: **Source Database → Research Pipeline → Decision Engine → Execution Layer**, with a Loop/Scheduler orchestrating continuous operation. The key architectural principle from real implementations: **separate the brain (planning/judgment) from the hands (execution/determinism)**. The brain handles research signals and probability estimation; the hands handle order placement and fill tracking. Paper trading must use the same price sources as live execution — using Gamma API bid prices for paper and CLOB ask prices for live is the #1 failure mode documented in live trading results.

**Major components:**
1. **Research Pipeline** — Fetcher → Processor → Classifier → Analyzer producing star-rated signals
2. **Decision Engine** — Odds Analyzer + Probability Estimator + Stake Calculator; deterministic, testable in isolation
3. **Execution Layer** — Polymarket Client (CLOB API + signing) + Order Manager + Position Tracker + Execution Guard
4. **Source Database** — Categories, ratings, feed configs; can start minimal, evolve to PostgreSQL
5. **Loop/Scheduler** — Hybrid event-driven + polling; WebSocket for orderbook changes + REST polling every 30-60s for market list
6. **Kill Switch** — File-based `state/STOP` check on every cycle; halts all trading immediately

### Critical Pitfalls

1. **No position limits → account wipeout** — Must enforce max 5-10% per market, daily loss halt, and drawdown kill switch in Phase 1. Real incidents prove unrestricted wallet access causes catastrophic losses.
2. **Bid/ask price mismatch between paper and live** — Paper trading validated with Gamma API bid prices; live execution uses CLOB ask prices. Phantom profits in simulation, real losses live. Use same price sources for both.
3. **Overtrading — diluting edge** — Limit to 3-5 active markets, require minimum edge threshold (>15% mispricing), minimum 10 sources with ★3 rating. Polymarket fees ~1% per side compound on every open/close.
4. **Source quality gates not enforced** — AI hallucinations on low-quality content are a primary failure mode. Enforce ★3 minimum rating and 10-source minimum per decision.
5. **Resolution rule blindness** — Markets resolve on specific written definitions, not intuitive reality. "Suit vs. blazer" case proves being directionally correct doesn't win if the contract definition differs. Resolution rule verification must be in the research phase.

## Implications for Roadmap

Based on research, a 4-phase structure emerges from feature dependencies and documented build orders.

### Phase 1: Core Loop + Safety Foundations
**Rationale:** Everything depends on clean market data and safety limits. Real-world failures (LayerX, Lobstar Wilde) show that building execution before limits exists causes blowups. This phase establishes the foundational loop and non-negotiable safety features.

**Delivers:** Polymarket API client (markets, orderbook, order placement), basic polling loop on Railway cron, dry-run mode, position size limits (max 5-10%), daily loss halt, drawdown kill switch, order type enforcement (limit orders only), rate limit handling with exponential backoff, Telegram alerts.

**Avoids:** Pitfall 1 (position limits), Pitfall 5 (bankroll management), Pitfall 6 (rate limits), Pitfall 7 (timing), Pitfall 12 (low-liquidity orders), Pitfall 13 (holding to resolution).

**Architecture component:** Research Pipeline (data fetcher, processor) + Execution Layer (Polymarket Client, Execution Guard) + basic Loop/Scheduler

### Phase 2: Source Intelligence + AI Guardrails
**Rationale:** The bot is only as good as its inputs. Source quality and AI validation are the #1 driver of AI trading bot failures. This phase adds the research brain, star rating system, and AI output validation.

**Delivers:** Source database with ★1-5 rating system, multi-source research pipeline (Polymarket native + 1-2 external APIs), resolution rule verification, AI prompt construction with chain-of-thought logging, AI output validation (rule-based sanity check before execution), dry-run removal, real wallet integration.

**Avoids:** Pitfall 3 (source quality), Pitfall 4 (resolution rules), Pitfall 8 (AI without validation), Pitfall 9 (market manipulation misreading).

**Uses:** OpenAI Agents SDK, Anthropic SDK, Polars, python-json-logger

### Phase 3: Bankroll Management + First Strategy
**Rationale:** With safety foundations and source intelligence in place, the bot can now manage capital intelligently and run its first real strategy. Arbitrage detection is the only documented strategy that survived live testing (LayerX Bregman approach).

**Delivers:** Kelly Criterion / fixed % position sizing, category-level exposure caps, win-rate tracking, consecutive loss halt, arbitrage detection (binary complement: YES + NO < $1 minus fees), paper trading validation with realistic slippage assumptions.

**Avoids:** Pitfall 2 (overtrading), Pitfall 5 (bankroll failures)

### Phase 4: Reliability + Scaling
**Rationale:** Operational maturity. The bot is live and generating P&L — now ensure it survives production: multi-instance safety, graceful shutdown, alerting, CI/CD pipeline.

**Delivers:** WebSocket for real-time orderbook (replaces polling), multi-instance mutex lock, graceful shutdown, Discord/PagerDuty alerting, GitHub Actions → Railway CI/CD, Telegram command interface for control.

**Avoids:** Silent failures, duplicate trades from restart loops, half-executed orders

### Phase Ordering Rationale

- **Safety before strategy:** Position limits, kill switch, and bankroll controls must exist before any real money. Research and architecture are unanimous here.
- **Data before decisions:** Research Pipeline must be stable and verified before Decision Engine consumes its output.
- **Paper before live:** Bid/ask price source must be consistent between paper and live execution.
- **Single source categories first:** Add one research category, prove the loop, then expand. Don't build "sports API + news crawler + crypto on-chain" simultaneously.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Source Intelligence):** Multi-source aggregation logic, star rating algorithm — no standard exists, must design from scratch. Source diversity and rating decay need explicit design decisions.
- **Phase 3 (Arbitrage Detection):** Mathematical implementation details (Bregman projection for multi-leg). LayerX's published approach is the best reference but needs adaptation.
- **Phase 3 (Bankroll):** Kelly Criterion implementation — fractional Kelly vs. full Kelly, win-rate estimation accuracy.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Core Loop):** Railway cron, PostgreSQL on Railway, Polymarket CLOB API — all well-documented with official sources.
- **Phase 4 (Reliability):** Standard Node.js deployment patterns, Pino logging, Railway health checks.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official SDK docs, verified versions, Railway documented |
| Features | MEDIUM | Ecosystem tools fragmented, some paid APIs needed, star rating system unvalidated |
| Architecture | MEDIUM-HIGH | Layered structure confirmed by multiple independent sources, build order from documented failures |
| Pitfalls | HIGH | Real case studies with specific incidents, primary sources from API docs |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Star rating algorithm:** No standard exists. Need to design rating system, weight aggregation, and decay mechanism. Validate against real trading results once live.
- **LLM prompt engineering:** Cost/latency tradeoffs unclear. Start with Anthropic Claude for reasoning, consider GPT for fast decisions.
- **Fractional Kelly vs. fixed % sizing:** Which produces better risk-adjusted returns for this use case? Test both in paper trading.
- **WebSocket reconnection logic:** Railway cron is intermittent; maintaining WebSocket across cold starts needs design.
- **Resolution rule verification:** No API — requires human-readable rule parsing. Build as a checklist in Phase 2.

## Sources

### Primary (HIGH confidence)
- Polymarket Official Docs (`docs.polymarket.com`) — CLOB API, authentication, rate limits
- Railway Cron Jobs Docs (`docs.railway.com`) — Cron configuration, PostgreSQL template, volume persistence
- AgentBets Polymarket Rate Limits Guide (`agentbets.ai`) — Rate limit specifics
- LayerX Blog (`layerx.xyz`) — 4-strategy evolution, Bregman Arbitrage, live P&L results

### Secondary (MEDIUM confidence)
- Dev Genius Two-Layer AI Architecture (`blog.devgenius.io`) — Brain/hands separation
- Awesome Prediction Market Tools (`github.com/aarora4/Awesome-PredictionMarketTools`) — Ecosystem overview
- Polymarket API docs (Gamma + CLOB endpoints)
- Drizzle ORM docs, Polars benchmarks, Pino npm page — version verification

### Tertiary (LOW confidence)
- Reddit r/PredictionsMarkets anecdotes — Bot 68% win rate still loses (anecdotal, needs validation)
- Pump Parade AI Trading Bots article — Incident details need cross-reference with primary sources

---
*Research completed: 2026-04-13*
*Ready for roadmap: yes*
