# Phase 2: Source Intelligence + AI Guardrails - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the research brain with star rating system and AI output validation. Source quality is the #1 driver of AI trading bot failures. Implement weighted confidence scoring, LLM integration for probability estimation, and rule-based sanity checks.

</domain>

<decisions>
## Implementation Decisions

### LLM Integration
- **D-01:** Provider: MiniMax 2 (confirmed)
- **D-02:** Chain-of-thought logging for all decisions
- **D-03:** Prompts: Agent decides structure (user trusts professional judgment)
- **D-04:** Budget: Plano mensal (no constraint)

### Source Database
- **D-05:** Storage: SQLite on Railway persistent volume
- **D-06:** File location: `data/sources.db` (or similar in volume)
- **D-07:** Persists between deploys

### Research Pipeline Architecture
- **D-08:** Adapter Pattern (interface + implementations)
- **D-09:** Structure:
  - `src/research/interface.ts` — ResearchSource interface
  - `src/research/binance.ts` — Binance adapter
  - `src/research/google.ts` — Google adapter
  - `src/research/aggregator.ts` — Joins results
  - `src/research/chain.ts` — Orchestrates pipeline

### Confidence Scoring
- **D-10:** Algorithm: Bayesian (mathematically correct)
- **D-11:** Weighted by star rating automatically
- **D-12:** Fewer sources OK if ★4+ (not strict 10)

### AI Validation (Sanity Check)
- **D-13:** Strict + Hybrid backup
- **D-14:** Block conditions: AI estimate 95%+ vs odd 50%, or reverse
- **D-15:** Override if multiple strong sources (★4+) agree
- **D-16:** Action on block: Block + Alert + Log (not retry loop)
- **D-17:** Logging: Pino/JSON (structured, searchable)

### Research Mix per Market
- **D-18:** 2/3 Binance WebSocket (real-time)
- **D-19:** 1/3 Google Search + News (REST, filtered by market time)
- **D-20:** News filtering: 2/3 recency + 1/3 age weight

### API Sources by Category
- **D-21:** Crypto: Binance API (WebSocket)
- **D-22:** News: Google Search + News (REST)
- **D-23:** Financial: v2 (deferred)
- **D-24:** Sports: v2 (deferred)
- **D-25:** News time window: Match to market horizon (5min/6h/24h)

### Minimum Sources Policy
- **D-26:** Relaxed: Use maximum available if <10 sources
- **D-27:** Bayes weights automatically (no arbitrary floor)
- **D-28:** Log warning when <10 sources used

### the agent's Discretion
- Exact prompt structure for MiniMax 2
- SQLite schema details
- Alert channel specifics (Discord/Telegram/etc)
- Exact Bayes implementation (prior, likelihood calculation)
- News recency thresholds per market type

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definitions
- `.planning/PROJECT.md` — Core value, constraints
- `.planning/REQUIREMENTS.md` — RES-01 to RES-05, AI-01 to AI-03, SRC-01 to SRC-04
- `.planning/ROADMAP.md` — Phase 2 goal and success criteria
- `.planning/phases/01-core-loop-safety-foundations/01-CONTEXT.md` — Phase 1 decisions (safety module, Railway cron, logging)

### Stack references
- `.planning/STACK.md` — OpenAI Agents SDK, Vercel AI SDK 6.x, Pino 10.x
- `docs.polymarket.com` — Polymarket API docs

### Technical
- Binance API docs — WebSocket for real-time crypto data
- Google Search/News API — News filtering by time

</canonical_refs>

<code_context>
## Existing Code Insights

### Phase 1 Context
- Railway cron execution model
- Config file for dry-run toggle
- Dedicated safety module pattern
- Pino logging already defined

### Integration Points
- Phase 1 API client → Phase 2 research aggregation
- Safety module from Phase 1 → Phase 2 validation
- Railway volume → SQLite persistence

</code_context>

<specifics>
## Specific Ideas

- Adapter Pattern for research pipeline (professional, testable)
- Bayes for confidence scoring (mathematically correct)
- Strict sanity check with hybrid override (professional monitoring)
- 2/3 Binance + 1/3 Google News research mix (market-informed)
- User trusts agent judgment on prompts and implementation details

</specifics>

<deferred>
## Deferred Ideas

### v2 (Future Phases)
- Financial API integration (Alpha Vantage, Yahoo Finance)
- Sports API integration (TheSportsDB, SportRadar)
- Google Trends (popularity signals)
- Multi-model LLM consensus (Claude + GPT + DeepSeek)
- Cross-platform aggregation (Kalshi, PredictIt odds)
- Whale tracking via on-chain data
- Telegram command interface

### Noted for Later
- Platform-specific secrets management (re-evaluate if Railway changes)
- WebSocket real-time updates for Polymarket (MON-05 — Phase 4)

</deferred>

---

*Phase: 02-source-intelligence-ai-guardrails*
*Context gathered: 2026-04-19*
