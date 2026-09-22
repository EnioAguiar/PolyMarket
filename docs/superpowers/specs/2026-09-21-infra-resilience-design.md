# Infra Resilience — Proxy Wiring, RPC Fallback, Geoblock Guard — Design Spec

**Date:** 2026-09-21 (rewritten twice same day — two design flaws caught and fixed before implementation, both empirically validated with a real order. See revision notes below.)
**Status:** Draft, but the core mechanism is proven live — written without a synchronous approval round-trip, per explicit standing instruction from the project owner earlier this session ("vá para plan 2 spec e plan sem pergunta... não vou estar no pc para confirmar").
**Sub-project 2 of 3** (sub-project 1, Wallet & Trading Correctness, is complete — see `docs/superpowers/plans/2026-09-21-wallet-trading-correctness.md`)

## Revision notes

1. The first draft proposed `global-agent`. Before any code was written, review caught that `global-agent`'s built-in proxy agent classes do a bare `net.connect(proxy.port, proxy.hostname)` with **no SOCKS handshake at all**. The project's proxy is `socks5h://...`. Replaced with `proxy-agent` (already a declared dependency, confirmed SOCKS5-capable via its source).
2. **The second draft's `proxy-agent` usage was itself broken, caught by live testing, not by reading source.** Setting `process.env.HTTP_PROXY`/`HTTPS_PROXY` (even just to feed `ProxyAgent`'s own auto-detection) also makes **axios** — which `@polymarket/clob-client-v2` uses internally — auto-detect the same variables and apply its own built-in proxy handling, which is HTTP-CONNECT-only and cannot parse a `socks5h://` URL. This happens regardless of any custom `http.globalAgent`/`https.globalAgent` patch, because axios's own env-based proxy logic runs first and conflicts with it. Live symptom: `createOrDeriveApiKey()` failed instantly (~20ms, too fast to be a real network round-trip) with an unserializable empty error object whenever `HTTP_PROXY`/`HTTPS_PROXY` were set as literal environment variables — with or without a custom agent patched in. The fix (below) never sets those two variable names as real env vars; the proxy URL is read from a differently-named variable and passed explicitly.

## Goal

Make the bot's actual trading-relevant outbound traffic (CLOB order submission, the geoblock check itself) go through the configured SOCKS5 proxy in production, make RPC calls survive a dead default endpoint, and make the bot fail loud — not silently attempt and lose — when Polymarket's own geoblock would reject trading.

## Background (evidence from this session)

- **The bot's real entry point never activates any proxy today.** `import 'global-agent/bootstrap'` exists only in `src/main.ts` (the legacy polling entry point). `src/index.ts` — what `npm start` actually runs as `dist/index.js` on Railway — never imports it.
- **`global-agent` cannot proxy this project's SOCKS5 URL at all** (Revision note 1) — a harder blocker than the missing import.
- **Unproxied, order submission is rejected; a read is not.** This session ran the bot's own `placeMarketOrder()` (not the UI) against a real, liquid market with no proxy active: `{"error":"Trading restricted in your region...","status":403}`. `client.getBalanceAllowance()` — a read — succeeded from the same unproxied environment. Matches documented policy: restricted jurisdictions read/close but don't open new orders. Separately, `polymarket.com/api/geoblock` reported `blocked:false, country:CH` from the same raw egress — i.e. **the public geoblock-check endpoint and the CLOB's own order-submission enforcement disagreed** for this specific IP. The guard in this spec is built to share the CLOB's actual enforcement path (Design §2), not to trust the general-purpose check blindly, precisely because of this discrepancy.
- **Fixed and empirically proven end-to-end this session, after two failed attempts:** with `proxy-agent`'s `ProxyAgent` constructed via `getProxyForUrl` (reading the SOCKS5 URL from a variable axios doesn't also auto-detect) and patched onto `http.globalAgent`/`https.globalAgent`, the bot's own `createClobClient()` → `placeMarketOrder()` path, run through the Decodo India proxy, returned a **real accepted order**: `{"success":true,"orderID":"0xcdab1c1d...","status":"delayed"}`. This is the first time this session that `POLY_1271` order *signing* was proven, not just balance/allowance reads — a geoblock 403 fires before signature verification, so nothing before this proved signing worked.
- **`@polymarket/clob-client-v2` uses axios internally with no custom agent configured** (confirmed: `grep` for `httpAgent|httpsAgent|globalAgent` in its bundle returns nothing) — it falls through to Node's `http.globalAgent`/`https.globalAgent`, patchable process-wide, **and** to axios's own environment-variable-based proxy auto-detection, which is the trap in Revision note 2.
- **Viem's `http()` transport (Polygon RPC calls) uses `fetch` by default**, which has its own dispatcher system entirely separate from `http`/`https` — no patch here affects it (see Non-Goals).
- **The RPC fallback list is dead code beyond index 0.** `src/api/http.ts`'s `POLYGON_RPC_URLS` has 3 entries; `createSharedPublicClient()` only ever reads index 0 or the env override. Confirmed live: `polygon.llamarpc.com` fails outright in this session's environment; `getPUSDBalance()` silently returned `0` until manually pointed at `https://1rpc.io/matic`. `https://polygon-bor-rpc.publicnode.com` and `https://polygon.drpc.org` also confirmed responsive; `https://rpc.ankr.com/polygon` now requires an API key.
- **`proxy-agent` correctly handles SOCKS5** — confirmed via its source: `socks`/`socks4`/`socks4a`/`socks5`/`socks5h` schemes all delegate to `socks-proxy-agent`.

## Non-Goals

- Proxying viem's Polygon RPC calls or any other `fetch`-based traffic. Real engineering effort (a custom undici dispatcher with a hand-rolled SOCKS5 `connect`) for zero observed benefit — Polygon RPC nodes were never seen geoblocking anything.
- Rotating/managing multiple proxy countries automatically, or retrying a geoblocked request through a different exit. This spec makes the bot aware and honest about being blocked; it does not build a bypass-retry system.
- Deciding which Decodo proxy country to use long-term — India and Romania were empirically confirmed clean this session; that's an operational choice already made.
- Safety module bug fixes — sub-project 3.
- The `result.success`/`errorMsg` validation bug in `placeMarketOrder`/`placeLimitOrder` — already fixed and committed this session (`0e6f70fc`).
- Reconciling *why* `polymarket.com/api/geoblock` and `clob.polymarket.com`'s order-submission enforcement disagreed for the unproxied IP. Noted as a real discrepancy (Background); this spec routes around it rather than explaining it.

## Design

### 1. A new env var for the proxy URL, read explicitly — never set as `HTTP_PROXY`/`HTTPS_PROXY`

`.env` / `.env.example`: rename the proxy configuration from `HTTP_PROXY`/`HTTPS_PROXY` to a single `POLYMARKET_PROXY_URL` variable (same `socks5h://...` value). This is the load-bearing fix from Revision note 2 — as long as literal `HTTP_PROXY`/`HTTPS_PROXY` env vars exist in the process, axios auto-detects and breaks on them regardless of any custom agent. Any other tooling that expects the standard `HTTP_PROXY` name (there is none identified in this codebase — `grep -rn "HTTP_PROXY\|HTTPS_PROXY" src/` only ever appears in the code this spec is replacing) is unaffected by the rename.

`src/index.ts`: add, as the very first lines of the file (before any other import that could eagerly issue an HTTP request):

```typescript
import { ProxyAgent } from 'proxy-agent';
import http from 'node:http';
import https from 'node:https';

const proxyUrl = process.env.POLYMARKET_PROXY_URL;
if (proxyUrl) {
  const proxyAgent = new ProxyAgent({ getProxyForUrl: () => proxyUrl });
  http.globalAgent = proxyAgent;
  https.globalAgent = proxyAgent;
}
```

Passing `getProxyForUrl` explicitly — rather than constructing `new ProxyAgent()` bare and relying on its own env auto-detection — means `ProxyAgent` never needs `HTTP_PROXY`/`HTTPS_PROXY` to be set either, closing the loop: nothing in the process ever populates the two variable names axios watches.

**Remove `global-agent` entirely:**
- `package.json`: drop the `global-agent` dependency.
- `src/main.ts`: replace `import 'global-agent/bootstrap';` with the same block used in `index.ts` above.

### 2. Geoblock startup guard, using a proxy-aware request (not `fetch`)

New module `src/api/geoblock.ts`:

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

`https.get` (built on `https.request`), not `fetch` — it honors `https.globalAgent` once patched in §1, so this check shares the exact egress path `@polymarket/clob-client-v2`'s axios-based order calls use. Given the Background's noted discrepancy between this endpoint and the CLOB's own order-submission enforcement, treat a `blocked: false` result from this check as informative, not an ironclad guarantee — it is still the best pre-flight signal available without submitting a real order, and it uses the correct (proxied) egress now, which the original unproxied comparison did not.

In `src/index.ts`'s `main()`, after `initLogger(config)` and before the existing `if (!config.dryRun) { ... }` block:

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

Widen `if (!config.dryRun)` to `if (!config.dryRun && !geoblocked)`. Geoblocked runs fall into the same branch that already exists for `dryRun` (bankroll 0, no `createClobClient()` call), and the bot keeps running (WebSocket monitoring, health endpoint, Telegram if configured).

### 3. Real RPC fallback

`src/api/http.ts`: replace the single-URL selection with viem's built-in `fallback()` transport:

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

`polygon.llamarpc.com` and `rpc.ankr.com/polygon` are dropped entirely (dead / now requires a key this project doesn't have). If `POLYGON_RPC_URL` is set, it's tried first, then falls through to the 3 verified defaults.

## Testing

- `checkGeoblock()` and the proxy patch: **already manually verified live this session**, end-to-end, with a real order (see Background) — not merely planned. Re-verify after the actual code lands (as opposed to the throwaway scripts used to prove the design) as part of Success Criteria below.
- `createSharedPublicClient()`'s fallback behavior: manual verification only, matching this project's existing convention (no test coverage exists for `src/api/http.ts` today).

## Success Criteria

- [ ] `.env` / `.env.example` use `POLYMARKET_PROXY_URL`, not `HTTP_PROXY`/`HTTPS_PROXY`. `grep -rn "HTTP_PROXY\|HTTPS_PROXY" .env src/` returns nothing.
- [ ] `src/index.ts` and `src/main.ts` both patch `http.globalAgent`/`https.globalAgent` with `proxy-agent`'s `ProxyAgent` constructed via explicit `getProxyForUrl`, reading `POLYMARKET_PROXY_URL`, as their first executable statements. `global-agent` is removed from `package.json` and no file imports it.
- [ ] With `POLYMARKET_PROXY_URL` set to the real Decodo proxy, `checkGeoblock()`'s reported `ip`/`country` matches the proxy's known exit (India or Romania) — proof the patch is live, not just present in the diff.
- [ ] `checkGeoblock()` exists in `src/api/geoblock.ts`, uses `https.get` (not `fetch`), runs in `main()` before any live-trading client is created, and gates the live-trading branch.
- [ ] When geoblocked, the bot logs a clear error, does not call `createClobClient()`, and keeps running.
- [ ] `createSharedPublicClient()` uses `fallback()` over the 3 verified-working RPC URLs.
- [ ] `npm run build` passes.
- [ ] Manual smoke test, reproducing this session's already-successful live result with the actual (not throwaway) code: `createClobClient()` + `placeMarketOrder()` through the wired proxy returns a real `orderID`, no geoblock 403, no auth failure.
