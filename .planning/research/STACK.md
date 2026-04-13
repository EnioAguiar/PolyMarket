# Technology Stack

**Project:** Polymarket Bot
**Researched:** 2026-04-13
**Confidence:** MEDIUM-HIGH (multiple sources, some version-specific claims need official doc verification)

---

## Recommended Stack

### Core Runtime

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Node.js** | ≥20 LTS | TypeScript runtime | Project requires TS core, Node 20 has native fetch, better performance, and will be maintained through 2028. Avoid older LTS versions. |
| **TypeScript** | 5.x | Core language | Use ^5.4 for stable pattern matching and satisfies operator. Enables type-safe orchestration across TypeScript/Python boundary. |

**Confidence:** HIGH

### AI Agent Framework (TypeScript Side)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **OpenAI Agents SDK** | latest | Agent orchestration | Lightweight, production-tested (March 2025 release, 19k+ stars), first-class TypeScript support. Better than LangChain for single-agent workflows with tool calls. |
| **Vercel AI SDK** | 6.x | LLM integration layer | AI SDK 6 (released 2025) introduces Agents, MCP support, and tool improvements. Works with any LLM provider (OpenAI, Anthropic, local). Better DX than raw API calls. Ideal for connecting Python ML results to TypeScript core. |

**Confidence:** MEDIUM (OpenAI Agents SDK is recent, rapidly evolving)

**What NOT to use and why:**
- **LangChain/LangGraph**: Heavy abstraction, frequent breaking changes, slower moving. Use OpenAI Agents SDK instead for this project's scope.
- **LangGraph**: Designed for complex multi-agent workflows. Overkill for linear research → bet pipeline.
- **CrewAI**: Python-first. If Python agent is needed, use Python crewai, not TS.

### Python AI/Data Stack

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Python** | 3.11+ | Data processing, ML inference | 3.11 has significant performance gains. 3.12+ for better typing support. Do NOT use 3.8/3.9. |
| **Polars** | 1.x | Data processing | 10-30x faster than Pandas, Arrow-native, better memory management for market data processing. Use instead of Pandas. |
| **LangChain** | 0.2+ | Python agent/LLM orchestration | If Python-side agents needed. Otherwise use OpenAI Agents SDK from TS. |
| **Anthropic SDK** | latest | Claude access | For advanced reasoning on complex analysis. Use for research synthesis, not fast decision-making. |

**Confidence:** HIGH

**What NOT to use and why:**
- **Pandas**: Old architecture, Python object overhead, slow. Use Polars instead for any new data processing code.
- **NumPy solely for ML**: If you need ML, use scikit-learn or similar. NumPy alone doesn't provide modeling.

### Polymarket Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@polymarket/clob-client** | latest (npm) | TypeScript trading client | Official SDK, Ed25519 auth, signature type 0 (EOA) support. DOCUMENTED at docs.polymarket.com. |
| **py-clob-client** | latest (pip) | Python data fetching | Official Python SDK for market data, order books, position queries. Use for data pipeline, not trading from Python. |
| **ethers** | v5 (5.x) | Wallet/signatures | v5 is stable and documented in Polymarket quickstart. v6 has different API. DO NOT mix versions. |

**Confidence:** HIGH (official SDKs, documented)

**What NOT to use and why:**
- **Third-party unofficial Polymarket clients**: May break, lack support. Use official SDKs.
- **ethers v6**: Different API from v5. Stick with v5 as documented.

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **PostgreSQL** | 15+ | Primary database | On Railway: use `railway postgresql` template. Reliable, JSONB support for flexible source/market metadata, star rating system fits relational model. |
| **Drizzle ORM** | latest | TypeScript SQL | Lightweight, type-safe, better performance than Prisma for this use case. Schema-first, generated types. |
| **pg** / **postgres.js** | latest | PostgreSQL client | Simpler than full ORM for direct queries. Use postgres.js for better TypeScript support. |

**Confidence:** HIGH

**What NOT to use and why:**
- **SQLite on Railway**: Data in container's temporary filesystem LOST on redeploy. NOT suitable for source database that needs persistence. Use Railway's PostgreSQL template which provisions persistent storage via volumes.
- **Prisma**: Heavier, slower migrations. Drizzle is lighter for this project.
- **MongoDB**: Overkill for star-rating schema. PostgreSQL with JSONB handles flexible metadata.

### Deployment

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Railway** | — | Deployment platform | Native cron jobs, PostgreSQL template, Python/Node support, $5 credit/month free tier. Cron jobs expected to terminate. |
| **Railway Cron** | — | Scheduled execution | Configured via crontab expression. Minimum 5-minute interval. Service starts, executes, exits. Railway auto-skips if previous still running. |

**Confidence:** HIGH

**Architecture notes:**
- Railway cron expects services to EXIT. If process hangs, subsequent runs skip.
- Shortest interval: 5 minutes. If you need faster, use node-cron within a long-running service.
- Timezone: UTC only. Account for offset when scheduling.

**What NOT to use and why:**
- **Heroku**: More expensive, fewer scheduler features.
- **Render**: Cron minimum 10 minutes vs Railway's 5 minutes.
- **node-cron alone without Railway**: Can't persist long-running process across Railway sleeps without Railway.

### Logging/Monitoring

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Pino** | 10.x | Structured logging | Latest: 10.3.1 (Feb 2026). super fast, all-natural JSON. Use for all logging in Node process. |
| **python-json-logger** | latest | Python logging | Match Pino format for unified log viewing across TS/Python. |

**Confidence:** HIGH (versions verified via npm/pypi)

---

## Alternative Considerations

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| TS AI Framework | OpenAI Agents SDK | LangGraph | OpenAI SDK is lightweight, production-stable, better for single-agent tool-calling workflow |
| Python AI Framework | LangChain 0.2+ | LlamaIndex | LangChain has broader tool/integration support; LlamaIndex better for RAG-only |
| Database | PostgreSQL | SQLite | SQLite loses data on Railway redeploy; PostgreSQL persists |
| Data Processing | Polars | Pandas | Polars 10-30x faster, Arrow-native, less memory |
| TS ORM | Drizzle | Prisma | Drizzle is lighter, faster, schema-first |

---

## Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Railway Deployment                       │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Node.js (TypeScript Core)                   │ │
│  │  • OpenAI Agents SDK (orchestration)                    │ │
│  │  • @polymarket/clob-client (trading)                    │ │
│  │  • Drizzle ORM (DB access)                              │ │
│  │  • Pino (logging)                                       │ │
│  │                                                         │ │
│  │  Loop: monitor → research → analyze → execute → log     │ │
│  └─────────────────────────────────────────────────────────┘ │
│                           ↕ (subprocess/stdio)              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Python (Data/AI)                           │ │
│  │  • Polars (market data processing)                      │ │
│  │  • Anthropic SDK (research synthesis)                    │ │
│  │  • Category-specific APIs (Crypto, Sports, News)        │ │
│  │  • py-clob-client (data fetching only)                   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL (Railway)                        │ │
│  │  • sources (id, url, rating, category, success_rate)    │ │
│  │  • bets (market_id, side, stake, outcome, pnl)          │ │
│  │  • research_cache (market_id, findings, timestamp)      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Version Verification Needed

Items below need official doc verification before finalizing:

| Item | Claim | Status |
|------|-------|--------|
| Node.js ≥20 | Native fetch, better perf | NEEDS VERIFICATION (Railway runtime) |
| ethers v5 | Not v6 for Polymarket | VERIFIED via Polymarket docs |
| Railway cron minimum 5 min | Confirmed in docs | VERIFIED via Railway docs |
| PostgreSQL on Railway | Persistent via volumes | VERIFIED via Railway docs (use their template) |
| OpenAI Agents SDK | 19k+ stars, March 2025 | VERIFIED (npm shows 8 days ago update) |
| Pino 10.x | Current version | VERIFIED via npm (10.3.1 Feb 2026) |
| Vercel AI SDK 6.x | Current version | VERIFIED via blog post (AI SDK 6 released 2025) |
| Drizzle 1.0 RC | Latest stable | VERIFIED via docs (v1.0.0-beta.2 Feb 2025) |

---

## Sources

- Polymarket Quickstart: https://docs.polymarket.com/quickstart
- Railway Cron Jobs: https://docs.railway.com/cron-jobs
- OpenAI Agents SDK: https://github.com/openai/openai-agents-python (inferred from web search)
- Polars benchmarks: https://pola.rs/posts/benchmarks/
- Drizzle ORM: https://orm.drizzle.team/
- TypeScript AI Agent comparison: https://www.speakeasy.com/blog/ai-agent-framework-comparison