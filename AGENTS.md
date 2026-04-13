<!-- GSD:project-start source:PROJECT.md -->
## Project

**Polymarket Bot**

AI-driven prediction market bot for Polymarket that continuously monitors markets, researches relevant sources, and executes short-term bets (5min-24h) automatically. Each market category has optimized research systems (APIs, scrapers, order books). Built with TypeScript + Python, deployed on Railway.

**Core Value:** Make profitable short-term betting decisions through systematic AI-powered research, source classification, and disciplined bankroll management.

### Constraints

- **Tech Stack**: TypeScript (core) + Python (data/ML) — why: TS for type safety, Python for data/AI
- **Execution**: Fully automated — no manual approval for bets
- **Timeframe**: Short-term only (5min-24h)
- **Minimum Research**: 10 sources minimum before bet decision
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Runtime
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Node.js** | ≥20 LTS | TypeScript runtime | Project requires TS core, Node 20 has native fetch, better performance, and will be maintained through 2028. Avoid older LTS versions. |
| **TypeScript** | 5.x | Core language | Use ^5.4 for stable pattern matching and satisfies operator. Enables type-safe orchestration across TypeScript/Python boundary. |
### AI Agent Framework (TypeScript Side)
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **OpenAI Agents SDK** | latest | Agent orchestration | Lightweight, production-tested (March 2025 release, 19k+ stars), first-class TypeScript support. Better than LangChain for single-agent workflows with tool calls. |
| **Vercel AI SDK** | 6.x | LLM integration layer | AI SDK 6 (released 2025) introduces Agents, MCP support, and tool improvements. Works with any LLM provider (OpenAI, Anthropic, local). Better DX than raw API calls. Ideal for connecting Python ML results to TypeScript core. |
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
- **Pandas**: Old architecture, Python object overhead, slow. Use Polars instead for any new data processing code.
- **NumPy solely for ML**: If you need ML, use scikit-learn or similar. NumPy alone doesn't provide modeling.
### Polymarket Integration
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@polymarket/clob-client** | latest (npm) | TypeScript trading client | Official SDK, Ed25519 auth, signature type 0 (EOA) support. DOCUMENTED at docs.polymarket.com. |
| **py-clob-client** | latest (pip) | Python data fetching | Official Python SDK for market data, order books, position queries. Use for data pipeline, not trading from Python. |
| **ethers** | v5 (5.x) | Wallet/signatures | v5 is stable and documented in Polymarket quickstart. v6 has different API. DO NOT mix versions. |
- **Third-party unofficial Polymarket clients**: May break, lack support. Use official SDKs.
- **ethers v6**: Different API from v5. Stick with v5 as documented.
### Database
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **PostgreSQL** | 15+ | Primary database | On Railway: use `railway postgresql` template. Reliable, JSONB support for flexible source/market metadata, star rating system fits relational model. |
| **Drizzle ORM** | latest | TypeScript SQL | Lightweight, type-safe, better performance than Prisma for this use case. Schema-first, generated types. |
| **pg** / **postgres.js** | latest | PostgreSQL client | Simpler than full ORM for direct queries. Use postgres.js for better TypeScript support. |
- **SQLite on Railway**: Data in container's temporary filesystem LOST on redeploy. NOT suitable for source database that needs persistence. Use Railway's PostgreSQL template which provisions persistent storage via volumes.
- **Prisma**: Heavier, slower migrations. Drizzle is lighter for this project.
- **MongoDB**: Overkill for star-rating schema. PostgreSQL with JSONB handles flexible metadata.
### Deployment
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Railway** | — | Deployment platform | Native cron jobs, PostgreSQL template, Python/Node support, $5 credit/month free tier. Cron jobs expected to terminate. |
| **Railway Cron** | — | Scheduled execution | Configured via crontab expression. Minimum 5-minute interval. Service starts, executes, exits. Railway auto-skips if previous still running. |
- Railway cron expects services to EXIT. If process hangs, subsequent runs skip.
- Shortest interval: 5 minutes. If you need faster, use node-cron within a long-running service.
- Timezone: UTC only. Account for offset when scheduling.
- **Heroku**: More expensive, fewer scheduler features.
- **Render**: Cron minimum 10 minutes vs Railway's 5 minutes.
- **node-cron alone without Railway**: Can't persist long-running process across Railway sleeps without Railway.
### Logging/Monitoring
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Pino** | 10.x | Structured logging | Latest: 10.3.1 (Feb 2026). super fast, all-natural JSON. Use for all logging in Node process. |
| **python-json-logger** | latest | Python logging | Match Pino format for unified log viewing across TS/Python. |
## Alternative Considerations
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| TS AI Framework | OpenAI Agents SDK | LangGraph | OpenAI SDK is lightweight, production-stable, better for single-agent tool-calling workflow |
| Python AI Framework | LangChain 0.2+ | LlamaIndex | LangChain has broader tool/integration support; LlamaIndex better for RAG-only |
| Database | PostgreSQL | SQLite | SQLite loses data on Railway redeploy; PostgreSQL persists |
| Data Processing | Polars | Pandas | Polars 10-30x faster, Arrow-native, less memory |
| TS ORM | Drizzle | Prisma | Drizzle is lighter, faster, schema-first |
## Stack Architecture
## Version Verification Needed
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
## Sources
- Polymarket Quickstart: https://docs.polymarket.com/quickstart
- Railway Cron Jobs: https://docs.railway.com/cron-jobs
- OpenAI Agents SDK: https://github.com/openai/openai-agents-python (inferred from web search)
- Polars benchmarks: https://pola.rs/posts/benchmarks/
- Drizzle ORM: https://orm.drizzle.team/
- TypeScript AI Agent comparison: https://www.speakeasy.com/blog/ai-agent-framework-comparison
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
