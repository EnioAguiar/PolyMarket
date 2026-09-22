# Infra Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bot's actual trading traffic go through the configured SOCKS5 proxy, add a startup geoblock guard that gates live trading using the same request mechanism as real orders, and replace the decorative RPC fallback list with one that actually falls back.

**Architecture:** Replace `global-agent` (incompatible with SOCKS5 proxies — confirmed by reading its source) with `proxy-agent` (already a declared dependency, confirmed SOCKS5-capable) patched onto Node's `http.globalAgent`/`https.globalAgent`. Add one new small module (`src/api/geoblock.ts`) for the geoblock check, built on `https.request` rather than `fetch` so it shares the same proxy-aware code path as `@polymarket/clob-client-v2`'s axios-based order calls. Fix `src/api/http.ts` to use viem's built-in `fallback()` transport instead of a single hardcoded URL.

**Tech Stack:** TypeScript, `proxy-agent`, `socks-proxy-agent`, Node's built-in `http`/`https`, viem.

**Spec:** `docs/superpowers/specs/2026-09-21-infra-resilience-design.md`

## Global Constraints

- The project's proxy is SOCKS5 (`.env`: `HTTP_PROXY`/`HTTPS_PROXY` = `socks5h://...`). Any proxy mechanism used MUST handle this scheme — verified this rules out `global-agent`.
- `checkGeoblock()` MUST use `https.request`/`https.get`, never `fetch` — `fetch`/undici does not honor `http.globalAgent`/`https.globalAgent` patches, so a `fetch`-based check would silently measure the wrong egress path.
- Verified working Polygon RPC URLs (use exactly these): `https://1rpc.io/matic`, `https://polygon-bor-rpc.publicnode.com`, `https://polygon.drpc.org`. Verified broken/unusable, must be removed: `https://polygon.llamarpc.com` (dead), `https://rpc.ankr.com/polygon` (requires an API key this project doesn't have).
- Do not attempt to proxy viem's RPC calls or any other `fetch`-based traffic — explicitly out of scope (see spec Non-Goals).
- No new test framework or mocking beyond plain Vitest; this project's existing tests never mock network calls, and this plan doesn't introduce the first one.

---

### Task 1: Patch `http.globalAgent`/`https.globalAgent` with a SOCKS5-aware proxy agent; remove `global-agent`

**Files:**
- Modify: `src/index.ts` (add proxy patch as first lines)
- Modify: `src/main.ts` (replace `global-agent/bootstrap` import with the same patch)
- Modify: `package.json` (remove `global-agent` dependency)

**Interfaces:** None new — this is a side-effecting startup patch, no exported function.

- [ ] **Step 1: Add the proxy patch to `src/index.ts`**

Current first line of `src/index.ts` is `import http from 'http';` (used later for the health-check server). Insert before it:

```typescript
import { ProxyAgent } from 'proxy-agent';
import http from 'node:http';
import https from 'node:https';

if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  const proxyAgent = new ProxyAgent();
  http.globalAgent = proxyAgent;
  https.globalAgent = proxyAgent;
}
```

Note: `src/index.ts` already has `import http from 'http';` further down for the health-check server (`http.IncomingMessage`, `http.ServerResponse`, etc.) — replace that existing import with the `node:http` one above rather than having two separate imports of the same module under different specifiers. Locate the existing `import http from 'http';` line by content (there is exactly one) and remove it once the new block above supplies the same `http` binding.

- [ ] **Step 2: Replace the `global-agent` import in `src/main.ts`**

Change line 1 of `src/main.ts` from:

```typescript
import 'global-agent/bootstrap';
```

to:

```typescript
import { ProxyAgent } from 'proxy-agent';
import http from 'node:http';
import https from 'node:https';

if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY) {
  const proxyAgent = new ProxyAgent();
  http.globalAgent = proxyAgent;
  https.globalAgent = proxyAgent;
}
```

`src/main.ts` doesn't otherwise import `http`/`https` today — verify with `grep -n "^import" src/main.ts` before editing, and if that changes before you get to this step, add the block without creating a duplicate binding.

- [ ] **Step 3: Remove the `global-agent` dependency**

In `package.json`, delete the line `"global-agent": "^4.1.3",` from `dependencies`. Run `grep -rn "global-agent" src/` afterward — expect zero matches (both call sites were replaced in Steps 1-2).

- [ ] **Step 4: Install and verify**

Run: `npm install` (updates the lockfile to drop `global-agent`), then `npm run build`.
Expected: both pass. `node_modules/global-agent` may still be present transitively or not at all — what matters is `package-lock.json` no longer lists it as a direct dependency and `src/` has zero references.

- [ ] **Step 5: Manual verification that the SOCKS5 patch actually works**

This can't be a build-time check — it needs a live request. Run a throwaway script (delete after, do not commit) that, after applying the same patch as Step 1, makes an `https.get('https://ipinfo.io/json', ...)` call and prints the response. Compare the reported `ip`/`country` with and without `HTTP_PROXY`/`HTTPS_PROXY` set in the environment. Expected: the IP/country differs when the proxy is active — concrete proof `ProxyAgent` is actually intercepting `https.request`-based traffic, not just present in the diff.

- [ ] **Step 6: Commit**

```bash
git add src/index.ts src/main.ts package.json package-lock.json
git commit -m "fix(proxy): replace global-agent with proxy-agent (SOCKS5-capable) for http.globalAgent/https.globalAgent"
```

---

### Task 2: Add the geoblock startup guard

**Files:**
- Create: `src/api/geoblock.ts`
- Modify: `src/index.ts` (call `checkGeoblock()` in `main()`, gate the live-trading branch)

**Interfaces:**
- Consumes: the `http.globalAgent`/`https.globalAgent` patch from Task 1 (must land first — otherwise this check measures the unproxied egress, defeating its purpose).
- Produces: `export interface GeoblockStatus { blocked: boolean; country: string; region: string; ip: string; }` and `export function checkGeoblock(): Promise<GeoblockStatus>` from `src/api/geoblock.ts`.

- [ ] **Step 1: Create `src/api/geoblock.ts`**

```typescript
import https from 'node:https';

export interface GeoblockStatus {
  blocked: boolean;
  country: string;
  region: string;
  ip: string;
}

export function checkGeoblock(): Promise<GeoblockStatus> {
  return new Promise((resolve, reject) => {
    https
      .get('https://polymarket.com/api/geoblock', (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`Geoblock check failed: HTTP ${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}
```

- [ ] **Step 2: Wire it into `src/index.ts`'s `main()`**

In `main()`, locate the existing block (by content — line numbers may have shifted after Task 1):

```typescript
    if (!config.dryRun) {
      clobClient = await createClobClient(config);
      const realBalance = await getPUSDBalance();
```

Immediately before it, insert:

```typescript
    let geoblocked = false;
    try {
      const geoblock = await checkGeoblock();
      logger.info({ geoblock }, 'Geoblock check');
      if (geoblock.blocked) {
        logger.error({ geoblock }, 'Geoblocked — new orders will be rejected by the CLOB. Trading disabled for this run.');
        geoblocked = true;
      }
    } catch (error) {
      logger.warn({ error }, 'Geoblock check failed — proceeding without a definitive answer (will surface as order rejections if actually blocked)');
    }

```

Then change the condition on the block you located from `if (!config.dryRun) {` to `if (!config.dryRun && !geoblocked) {`. Do not otherwise alter the body of that block or its `else` branch — geoblocked runs now fall into the exact same `else` path that already exists for `dryRun` (bankroll stays 0, `createClobClient()` is never called).

Add the import: `import { checkGeoblock } from './api/geoblock.js';` alongside `src/index.ts`'s other `./api/*` imports.

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Manual verification**

Run a throwaway script (delete after, do not commit) that imports and calls `checkGeoblock()` from the compiled `dist/api/geoblock.js` directly, with the Task 1 proxy patch applied first. Confirm it returns a real `{blocked, ip, country, region}` object matching the shape already observed this session (`{"blocked":false,"ip":"...","country":"...","region":"..."}` when run from a clean exit).

- [ ] **Step 5: Commit**

```bash
git add src/api/geoblock.ts src/index.ts
git commit -m "feat(geoblock): add startup guard, gate live trading on Polymarket's own geoblock check"
```

---

### Task 3: Real RPC fallback

**Files:**
- Modify: `src/api/http.ts`

**Interfaces:**
- `createSharedPublicClient(): PublicClient` and `resetSharedPublicClient(): void` — signatures unchanged, only the transport configuration inside changes. No callers need edits.

- [ ] **Step 1: Replace the transport with `fallback()`**

Replace the full contents of `src/api/http.ts` with:

```typescript
import { http, createPublicClient, fallback, PublicClient } from 'viem';
import { polygon } from 'viem/chains';

let sharedPublicClient: PublicClient | null = null;

const POLYGON_RPC_URLS = [
  'https://1rpc.io/matic',
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon.drpc.org',
];

export function createSharedPublicClient(): PublicClient {
  if (!sharedPublicClient) {
    const urls = process.env.POLYGON_RPC_URL
      ? [process.env.POLYGON_RPC_URL, ...POLYGON_RPC_URLS]
      : POLYGON_RPC_URLS;
    sharedPublicClient = createPublicClient({
      chain: polygon,
      transport: fallback(urls.map((url) => http(url, { retryCount: 2, retryDelay: 500 }))),
    });
  }
  return sharedPublicClient;
}

export function resetSharedPublicClient(): void {
  sharedPublicClient = null;
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Manual verification**

Run a throwaway script (delete after) that calls `createSharedPublicClient()` from the compiled output and does a real `readContract` call (e.g. the pUSD `balanceOf` for the Deposit Wallet address `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b`, same as `getPUSDBalance()` does internally) — confirm it succeeds without needing `POLYGON_RPC_URL` set manually, proving the new default list (not the dead `polygon.llamarpc.com`) is actually being used.

- [ ] **Step 4: Commit**

```bash
git add src/api/http.ts
git commit -m "fix(http): use viem's fallback() transport over verified-working RPC URLs instead of a single dead default"
```

---

### Task 4: End-to-end verification

**Files:** None modified — verification-only.

- [ ] **Step 1: Full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds, all existing tests still pass (this plan adds no new test files — see Global Constraints).

- [ ] **Step 2: Confirm the proxy patch affects real trading-relevant traffic**

Run a throwaway script (delete after) that, with the Task 1 patch applied and `.env`'s real proxy active, calls `checkGeoblock()` and confirms the reported `ip`/`country` matches the configured Decodo proxy exit (India or Romania), not the raw environment's egress.

- [ ] **Step 3: Confirm the geoblock guard actually gates live trading**

Read `src/index.ts`'s `main()` and confirm by inspection that `createClobClient()` is unreachable when `geoblocked` is `true` (the `!config.dryRun && !geoblocked` condition from Task 2). This doesn't need a live run against an actually-blocked exit (see spec's accepted testing gap) — static confirmation that the gate is wired correctly is sufficient given the true-positive behavior (order rejection) was already proven live in sub-project 1's validation.

- [ ] **Step 4: Update README.md**

In "Próximos Passos", mark item 4 (the critical proxy-not-wired finding) and item 5 (RPC fallback) as done, referencing this plan.

```bash
git add README.md
git commit -m "docs: mark infra resilience sub-project complete"
```
