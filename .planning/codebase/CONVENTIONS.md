# Coding Conventions

## TypeScript Patterns

- **ESM modules** — `"type": "module"` in package.json; all imports use `.js` extension (e.g., `import { foo } from './bar.js'`)
- **Strict interfaces over types** — domain objects defined as `interface` in `src/types/index.ts`
- **No `any` except forced** — `clobClient: any` in `src/index.ts:20` is an acknowledged exception due to untyped third-party SDK
- **Discriminated unions avoided** — event types handled via `switch (event.event_type)` with explicit casts
- **Module-level singletons** — shared state held as module-level `let` vars (e.g., `clobClient`, `walletAddress` in `src/api/clob.ts`; `logger` in `src/logging/index.ts`)

## Async / Error Handling

- **All async functions use `try/catch`** at call sites; errors are logged with context and execution continues (no unhandled rejections by design)
- **`process.exit(1)`** used only at top-level startup failure
- **Graceful shutdown** via SIGINT/SIGTERM handlers in `src/index.ts`
- **No global unhandled rejection handler** — `.catch(console.error)` on main() entry

## Class Design

- **Stateful modules as classes** — `SafetyModule`, `CycleManager`, `PolymarketWsClient`, `DailyLossTracker`, `DrawdownTracker`, `MarketMutex`, `EventRouter`, `SubscriptionManager`
- **Factory functions** for instantiation — `createClobClient()`, `createCycleManager()`, `createPolymarketWsClient()`
- **Private state, public interface** — internal state (`state`, `config`, `mutex`) marked `private`

## Naming Conventions

- **camelCase** for variables, functions, class properties
- **PascalCase** for classes and interfaces
- **SCREAMING_SNAKE** for module-level constants (`POLYMARKET_WS_URL`, `HEARTBEAT_INTERVAL_MS`)
- **Result types** follow pattern `*CheckResult`, `*CheckInput` (e.g., `SlippageCheckResult`, `SafetyCheckResult`)
- **Boolean guards** named `is*` or `has*` (e.g., `isKillSwitchActive`, `hasLiquidity`, `isConnected`)

## Logging

- **pino** for structured JSON logging; `pino-pretty` in dev mode
- Initialized once via `initLogger(config)`, accessed globally via `getLogger()`
- Log entries use object context + message string: `logger.info({ key: value }, 'Human message')`
- Dedicated helpers: `logBetDecision()`, `logSafetyCheck()` in `src/logging/index.ts`
- Debug `console.log('[DEBUG] ...')` calls scattered in production code paths — not removed (see CONCERNS.md)

## Configuration

- Runtime config loaded from `config.yaml` via `yaml` library — not from env vars
- Secrets (private key, API tokens) from `.env` only
- `config.dryRun: false` in committed config.yaml — live trading is the default

## Module Organization

- Each domain folder has an `index.ts` that exports the public API and re-exports from sub-modules
- `src/types/` holds shared interfaces used across modules to avoid circular imports
- `src/execution/index.ts` is a pure re-export barrel with no logic

## Code Comments

Comments are used sparingly. ADR/decision references appear as inline codes: `(BANK-01)`, `(D-09)`, `(D-10)` referencing design decisions documented elsewhere.
