# Coding Conventions

**Analysis Date:** 2026-05-02

## Naming Patterns

**Files:**
- CamelCase for TypeScript files: `position-sizing.ts`, `slippage.ts`, `arbitrage.ts`
- Test files co-located in `tests/` directory: `*.test.ts`
- Interface files colocated with implementation: `src/research/interface.ts`

**Functions:**
- camelCase for functions: `calculatePositionSize`, `checkSlippage`, `checkArbitrage`
- Verb-noun pattern: `calculateX`, `checkY`, `logZ`

**Variables:**
- camelCase for variables and parameters
- UPPER_SNAKE for constants: `POLYMARKET_MIN_TOKENS`, `FEE_THRESHOLD`
- Descriptive names: `bankroll`, `researchQuality`, `maxSlippagePct`

**Types:**
- PascalCase for interfaces: `PositionSizingInput`, `SlippageCheckResult`, `ArbitrageCheckResult`
- `as const` for literal type assertions: `rating = 3 as const`

## Code Style

**Formatting:**
- Prettier not configured; code uses 2-space indentation
- No semicolons at end of statements
- Trailing commas in multi-line objects/arrays

**Linting:**
- ESLint with `@typescript-eslint` (v8)
- Parser: `@typescript-eslint/parser`
- Rule plugin: `@typescript-eslint/eslint-plugin`
- Config extends `eslint.config.js` (flat config format)

**TypeScript:**
- `strict: true` in tsconfig.json
- Explicit return types on exported functions
- Interfaces preferred over type aliases for object shapes
- Import types explicitly: `import type { PositionSizingInput } from './types.js'`

**Module System:**
- ESNext modules (`"type": "module"` in package.json)
- Explicit `.js` extensions in imports: `from './types.js'`
- `export function` for public APIs
- No default exports observed

## Import Organization

**Order:**
1. Built-in/Node modules: `import { spawn } from 'child_process'`
2. External packages: `import pino from 'pino'`
3. Internal types: `import type { Config } from '../types/index.js'`
4. Internal modules: `import { SourceCategory } from '../types/source.js'`

**Path aliases:**
- None configured; relative paths used
- Parent directory imports: `../src/...`

## Error Handling

**Patterns:**
- Custom Error objects with descriptive messages
- Errors include context: `new Error(\`twitter_scraper.py exited with code \${code}: \${stderr}\`)`
- Errors propagated via Promise rejection
- Timeout errors with clear messaging

**Example from `src/research/twitter.ts`:**
```typescript
reject(new Error(`Failed to spawn twitter_scraper.py: ${err.message}`));
```

**Validation:**
- Guard clauses for null/undefined: `if (!bestBid || !bestAsk)`
- Early returns with fallback values
- Clear reason strings in result objects

## Logging

**Framework:** Pino v10

**Patterns:**
- Structured JSON logging via Pino
- Helper functions for domain-specific logs: `logBetDecision()`, `logSafetyCheck()`
- Log levels: `info`, `debug`, `warn`, `error`
- Pretty printing in development via `pino-pretty`

**Example:**
```typescript
getLogger().info({ marketId, odds, positionSize }, `Bet decision: ${action}`);
```

## Comments

**Documentation:**
- JSDoc on class declarations: `/** TwitterAdapter - implements ResearchSource... */`
- Implementation comments for decisions: `// D-04: Fixed 5% of bankroll per bet`
- Decision tag format: `// D-04:`, `// D-09:`, `// D-15 to D-18:`

**When to Comment:**
- Business rules (D-XX tags)
- Non-obvious calculations
- External system integration points

## Function Design

**Size:**
- Small, focused functions
- Single responsibility: `calculatePositionSize`, `checkSlippage`, `checkArbitrage`

**Parameters:**
- Typed input interfaces
- Return typed result interfaces
- Max 3-4 parameters; beyond that use input object

**Return Values:**
- Always return object with multiple values (not tuple)
- Include `reason` field explaining the result

## Module Design

**Exports:**
- Named exports only
- Exported functions have explicit return types
- Internal functions are private (no export)

**Classes:**
- Used for stateful adapters: `TwitterAdapter`, `RedditAdapter`
- Implements interface pattern: `export class X implements ResearchSource`

**Singleton Pattern:**
- Logger uses module-level singleton: `let logger: pino.Logger`
- Initialization function: `initLogger(config)`, `getLogger()`

---

*Convention analysis: 2026-05-02*