# Infra Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the bot's actual trading traffic go through the configured SOCKS5 proxy, add a startup geoblock guard that gates live trading using the same request mechanism as real orders, and replace the decorative RPC fallback list with one that actually falls back.

**Architecture:** Replace `global-agent` (incompatible with SOCKS5 proxies — confirmed by reading its source) with `proxy-agent` (already a declared dependency, confirmed SOCKS5-capable) patched onto Node's `http.globalAgent`/`https.globalAgent`. Add one new small module (`src/api/geoblock.ts`) for the geoblock check, built on `https.request` rather than `fetch` so it shares the same proxy-aware code path as `@polymarket/clob-client-v2`'s axios-based order calls. Fix `src/api/http.ts` to use viem's built-in `fallback()` transport instead of a single hardcoded URL.

**Tech Stack:** TypeScript, `proxy-agent`, `socks-proxy-agent`, Node's built-in `http`/`https`, viem.

**Spec:** `docs/superpowers/specs/2026-09-21-infra-resilience-design.md`

## Global Constraints

- The project's proxy is SOCKS5. `.env` uses a `PROXY_URL` variable (not `HTTP_PROXY`/`HTTPS_PROXY` — setting those literal names makes axios, used internally by `@polymarket/clob-client-v2`, auto-detect them and apply its own broken HTTP-CONNECT-only proxy handling on the SOCKS5 URL, silently breaking auth regardless of any custom agent patch — confirmed by live testing this session, not just by reading source). Any proxy mechanism used MUST handle the `socks5h://` scheme — verified this rules out `global-agent`.
- `checkGeoblock()` MUST use `https.request`/`https.get`, never `fetch` — `fetch`/undici does not honor `http.globalAgent`/`https.globalAgent` patches, so a `fetch`-based check would silently measure the wrong egress path.
- Verified working Polygon RPC URLs (use exactly these): `https://1rpc.io/matic`, `https://polygon-bor-rpc.publicnode.com`, `https://polygon.drpc.org`. Verified broken/unusable, must be removed: `https://polygon.llamarpc.com` (dead), `https://rpc.ankr.com/polygon` (requires an API key this project doesn't have).
- Do not attempt to proxy viem's RPC calls or any other `fetch`-based traffic — explicitly out of scope (see spec Non-Goals).
- No new test framework or mocking beyond plain Vitest; this project's existing tests never mock network calls, and this plan doesn't introduce the first one.

---

### Task 1: Rename the proxy env var, patch `http.globalAgent`/`https.globalAgent` with a SOCKS5-aware proxy agent, remove `global-agent`

**Files:**
- Modify: `.env` (rename `HTTP_PROXY`/`HTTPS_PROXY` to `PROXY_URL`)
- Modify: `.env.example` (same rename, with the reasoning documented)
- Modify: `src/index.ts` (add proxy patch as first lines)
- Modify: `src/main.ts` (replace `global-agent/bootstrap` import with the same patch)
- Modify: `package.json` (remove `global-agent` dependency)

**Interfaces:** None new — this is a side-effecting startup patch, no exported function.

- [ ] **Step 1: Rename the env var in `.env.example`**

Find the `HTTP_PROXY`/`HTTPS_PROXY` lines (if present) or add a new one, replacing them with:

```
# SOCKS5 proxy URL (e.g. socks5h://user:pass@host:port). Read explicitly by
# src/index.ts and src/main.ts via ProxyAgent's getProxyForUrl — deliberately
# NOT named HTTP_PROXY/HTTPS_PROXY, because axios (used internally by
# @polymarket/clob-client-v2) auto-detects those two exact names and applies
# its own HTTP-CONNECT-only proxy handling, which silently breaks on a
# socks5h:// URL regardless of any custom agent patched in. Confirmed by
# live testing this session: setting HTTP_PROXY/HTTPS_PROXY as literal env
# vars broke CLOB auth every time, with or without a custom agent; renaming
# to PROXY_URL and reading it explicitly fixed it immediately.
PROXY_URL=
```

- [ ] **Step 2: Rename the same variable in `.env` (never read/print its value)**

```bash
sed -i 's/^HTTP_PROXY=\(.*\)$/PROXY_URL=\1/; /^HTTPS_PROXY=/d' .env
```

Verify success via `grep -c '^PROXY_URL=' .env` (expect `1`) and `grep -c '^HTTP_PROXY=\|^HTTPS_PROXY=' .env` (expect `0`) — never print the matched line's value.

- [ ] **Step 3: Add the proxy patch to `src/index.ts`**

Current first line of `src/index.ts` is `import http from 'http';` (used later for the health-check server). Replace it with:

```typescript
import { ProxyAgent } from 'proxy-agent';
import http from 'node:http';
import https from 'node:https';

const proxyUrl = process.env.PROXY_URL;
if (proxyUrl) {
  const proxyAgent = new ProxyAgent({ getProxyForUrl: () => proxyUrl });
  http.globalAgent = proxyAgent;
  https.globalAgent = proxyAgent;
}
```

Passing `getProxyForUrl` explicitly (not constructing `new ProxyAgent()` bare) is required — it's what keeps `HTTP_PROXY`/`HTTPS_PROXY` out of the picture entirely. `src/index.ts` has exactly one existing `import http from 'http';` line (used later for `http.IncomingMessage`/`http.ServerResponse` in the health-check server) — this replaces it, don't leave a duplicate `http` binding.

- [ ] **Step 4: Replace the `global-agent` import in `src/main.ts`**

Change line 1 of `src/main.ts` from:

```typescript
import 'global-agent/bootstrap';
```

to:

```typescript
import { ProxyAgent } from 'proxy-agent';
import http from 'node:http';
import https from 'node:https';

const proxyUrl = process.env.PROXY_URL;
if (proxyUrl) {
  const proxyAgent = new ProxyAgent({ getProxyForUrl: () => proxyUrl });
  http.globalAgent = proxyAgent;
  https.globalAgent = proxyAgent;
}
```

`src/main.ts` doesn't otherwise import `http`/`https` today — verify with `grep -n "^import" src/main.ts` before editing.

- [ ] **Step 5: Remove the `global-agent` dependency**

In `package.json`, delete the line `"global-agent": "^4.1.3",` from `dependencies`. Run `grep -rn "global-agent" src/` afterward — expect zero matches.

- [ ] **Step 6: Install and verify**

Run: `npm install`, then `npm run build`.
Expected: both pass.

- [ ] **Step 7: Manual verification that the SOCKS5 patch actually works — this exact scenario was already proven live this session with throwaway scripts; this step reproduces it against the real code**

Run a throwaway script (delete after, do not commit) that imports the compiled `dist/api/clob.js`'s `createClobClient` and `placeMarketOrder` (after the Step 3 patch has run, e.g. by importing `dist/index.js`'s side effects or replicating the same 5-line patch inline), and places a small real order ($1) on a liquid, long-dated market — check the API's `active`/`closed`/`clobTokenIds` fields for a currently-active market rather than reusing a hardcoded token ID, since market state changes over time. Expected: a real `orderID` comes back, no geoblock 403, no auth failure — reproducing this session's already-successful result (`{"success":true,"orderID":"0xcdab1c1d...","status":"delayed"}`).

- [ ] **Step 8: Commit**

```bash
git add .env.example src/index.ts src/main.ts package.json package-lock.json
git commit -m "fix(proxy): rename HTTP_PROXY/HTTPS_PROXY to PROXY_URL and use proxy-agent's getProxyForUrl explicitly

Setting literal HTTP_PROXY/HTTPS_PROXY env vars made axios (used internally
by @polymarket/clob-client-v2) auto-detect them and apply its own
HTTP-CONNECT-only proxy handling on our socks5h:// URL, breaking CLOB auth
regardless of any custom http.globalAgent/https.globalAgent patch. Reading
the proxy URL from a differently-named PROXY_URL variable and passing it to
ProxyAgent via getProxyForUrl keeps axios from ever seeing those two names."
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
