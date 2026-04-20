# Phase 1: Core Loop + Safety Foundations - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the foundational loop: connect to Polymarket API, monitor markets (5min-24h), fetch odds and orderbook depth, operate in dry-run mode, and implement non-negotiable safety features (max position size, daily loss limit, drawdown kill switch). Deploy to Railway with health checks, secrets management, and structured logging.

</domain>

<decisions>
## Implementation Decisions

### Loop execution model
- **D-01:** Railway cron — service starts, executes loop, exits. Shortest interval: 5 minutes.
- Loop cycles: monitor markets → research → analyze → decide → execute (dry-run logged)

### Dry-run mode control
- **D-02:** Controlled via config file (not env var)
- Config file at project root: `config.json` or `config.yaml`
- Flag: `dryRun: true|false`

### Safety module organization
- **D-03:** Dedicated safety module — separate from execution flow
- Reason: Clear boundaries, less AI hallucination, easier to verify and audit
- Safety checks in dedicated module with explicit call points in the loop
- Not inline with execution (scattered) or middleware (obscured flow)

### Secrets handling
- **D-04:** Railway secrets for now — deferred for platform flexibility
- API keys, wallet key via Railway secrets management
- Will re-evaluate if platform changes (Railway → VPS or other)

### Logging
- **D-05:** Verbose logging for debugging
- Pino for TypeScript (structured JSON logs)
- python-json-logger for Python (matching format)
- Agent decides format specifics (levels, fields, rotation)
- Must support detailed debugging output

### the agent's Discretion
- Config file format (JSON vs YAML)
- Pino log levels and field structure
- Log rotation strategy
- Health check implementation details
- Specific safety thresholds (position size %, daily loss %, drawdown %)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project definitions
- `.planning/PROJECT.md` — Core value, constraints, context
- `.planning/REQUIREMENTS.md` — MON-01 to MON-04, AI-04, EXEC-01 to EXEC-03, BANK-01 to BANK-04, DEPL-01 to DEPL-04
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria

### Polymarket integration
- `docs.polymarket.com` — Polymarket API docs (Gamma + CLOB)
- `@polymarket/clob-client` — Official TypeScript trading client

### Stack references
- `STACK.md` (if exists) — Pino 10.x, ethers v5, Railway deployment

</canonical_refs>

<code_context>
## Existing Code Insights

### Project state
- No existing code yet — greenfield project
- Phase 1 creates foundational structure

### Reusable Assets
- None yet — this phase creates the base

### Integration Points
- Polymarket API → bot (inbound data)
- Bot → Railway (outbound deployment)
- Config file → all modules (configuration)

</code_context>

<specifics>
## Specific Ideas

- Railway cron for loop timing (confirmed)
- Config file for dry-run toggle (confirmed)
- Verbose logging with Pino (agent decides structure)
- Safety as dedicated module for AI clarity

</specifics>

<deferred>
## Deferred Ideas

- Platform-specific secrets management — re-evaluate if Railway changes
- WebSocket real-time updates — Phase 4 (MON-05)
- Telegram command interface — Phase 4

</deferred>

---

*Phase: 01-core-loop-safety-foundations*
*Context gathered: 2026-04-19*
