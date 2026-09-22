# Infra Resilience — Proxy Wiring, RPC Fallback, Geoblock Guard — Design Spec

**Date:** 2026-09-21 (rewritten same day after a design flaw was caught before implementation — see revision note below)
**Status:** Draft — written without a synchronous approval round-trip, per explicit standing instruction from the project owner earlier this session ("vá para plan 2 spec e plan sem pergunta... não vou estar no pc para confirmar"). Self-reviewed against the evidence below; flag anything on return for revision.
**Sub-project 2 of 3** (sub-project 1, Wallet & Trading Correctness, is complete — see `docs/superpowers/plans/2026-09-21-wallet-trading-correctness.md`)

## Revision note

The first draft of this spec proposed wiring `global-agent` into `src/index.ts`. Before any code was written, review caught that `global-agent`'s built-in proxy agent classes (`node_modules/global-agent/dist/classes/HttpProxyAgent.js`) do a bare `net.connect(proxy.port, proxy.hostname)` with **no SOCKS handshake at all** — they only implement plain HTTP CONNECT-style proxying. The project's actual proxy (`.env`'s `HTTP_PROXY`/`HTTPS_PROXY`) is `socks5h://user-...@dc.decodo.com:10001`. `global-agent` cannot speak this protocol regardless of namespace configuration — the whole first draft would have compiled, run, and silently failed to proxy anything. This revision replaces `global-agent` with `proxy-agent` (already a declared dependency, confirmed via its source to correctly delegate `socks:`/`socks4:`/`socks5:`/`socks5h:` schemes to `socks-proxy-agent`).

## Goal

Make the bot's actual trading-relevant outbound traffic (CLOB order submission, the geoblock check itself) go through the configured SOCKS5 proxy in production, make RPC calls survive a dead default endpoint, and make the bot fail loud — not silently attempt and lose — when Polymarket's own geoblock would reject trading, exactly as this session's live test just proved happens today.

## Background (evidence from this session, not restated here in full — see README.md)

- **The bot's real entry point never activates any proxy.** `import 'global-agent/bootstrap'` exists only in `src/main.ts` (the legacy polling entry point). `src/index.ts` — what `npm start` actually runs as `dist/index.js` on Railway — never imports it.
- **Even if wired into the right file, `global-agent` cannot proxy this project's SOCKS5 URL at all** (see Revision note above) — this is a harder blocker than the missing import, and no amount of namespace/env-var fixing solves it.
- **Live proof this actually breaks trading, not just theoretical:** this session ran the bot's own `placeMarketOrder()` (not the UI) against a real, liquid market, with no proxy active. It came back rejected: `{"error":"Trading restricted in your region, please refer to available regions - https://docs.polymarket.com/developers/CLOB/geoblock","status":403}`. `client.getBalanceAllowance()` — a read — succeeded from the same unproxied environment; only order *submission* was rejected. This matches the documented policy exactly: restricted jurisdictions can read/close but not open new orders.
- **`@polymarket/clob-client-v2` uses axios internally with no custom agent configured** (confirmed: `grep -n "httpAgent\|httpsAgent\|globalAgent" node_modules/@polymarket/clob-client-v2/dist/index.js` returns nothing) — so it falls through to Node's default `http.globalAgent`/`https.globalAgent`, which **can** be patched process-wide. This is the mechanism this spec uses.
- **Viem's `http()` transport (used for Polygon RPC calls) uses `fetch` by default** (confirmed in `node_modules/viem/_esm/utils/rpc/http.js`), and neither Node's legacy `http.globalAgent` patching nor `global-agent` nor a plain `proxy-agent`-style patch affects `fetch`/undici at all — `fetch` has its own dispatcher system, entirely separate from the `http`/`https` module. This spec deliberately does **not** attempt to proxy viem's RPC calls (see Non-Goals) — Polygon RPC nodes were never observed to geoblock anything this session; only Polymarket's own domains (`polymarket.com`, `clob.polymarket.com`) did.
- **The RPC fallback list is dead code beyond index 0.** `src/api/http.ts`'s `POLYGON_RPC_URLS` array has 3 entries, but `createSharedPublicClient()` only ever reads index 0 or the `POLYGON_RPC_URL` env override — no actual fallback logic exists. Confirmed live: the default endpoint (`polygon.llamarpc.com`) fails outright in at least one deployment-like environment, and `getPUSDBalance()` silently returned `0` until `POLYGON_RPC_URL` was manually overridden to `https://1rpc.io/matic`, which responded correctly. `https://polygon-bor-rpc.publicnode.com` and `https://polygon.drpc.org` were also confirmed responsive this session; `https://rpc.ankr.com/polygon` now demands an API key.
- **`proxy-agent` (already a declared dependency, was missing from `node_modules` until reinstalled during sub-project 1's Task 2) correctly handles SOCKS5** — confirmed via its own source (`node_modules/proxy-agent/dist/index.js`): `socks`/`socks4`/`socks4a`/`socks5`/`socks5h` schemes all delegate to `socks-proxy-agent`'s `SocksProxyAgent` (also a declared dependency).

## Non-Goals

- Proxying viem's Polygon RPC calls or any other `fetch`-based traffic through the SOCKS5 proxy. This would require a custom undici dispatcher with a hand-rolled SOCKS5 `connect` implementation — real engineering effort for zero observed benefit, since no evidence this session showed Polygon RPC nodes geoblocking anything. If this changes, it's a new spec, not a silent scope add here.
- Rotating/managing multiple proxy countries automatically, or retrying a geoblocked request through a different exit. This spec makes the bot aware and honest about being blocked; it does not build a bypass-retry system.
- Deciding which Decodo proxy country to use long-term — India and Romania were empirically confirmed clean against both `polymarket.com/api/geoblock` and `clob.polymarket.com` this session; that's an operational choice already made, not something this code should hardcode.
- Safety module bug fixes — sub-project 3.
- The `result.success`/`errorMsg` validation bug in `placeMarketOrder`/`placeLimitOrder` — already fixed and committed this session (`0e6f70fc`) while validating sub-project 1, not part of this spec.

## Design

### 1. Patch `http.globalAgent`/`https.globalAgent` with a SOCKS5-aware proxy agent

`src/index.ts`: add, as the very first lines of the file (before any other import that could eagerly issue an HTTP request):

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

`ProxyAgent`'s constructor with no arguments auto-detects `HTTP_PROXY`/`HTTPS_PROXY`/`ALL_PROXY`/`NO_PROXY` from the environment and picks the right underlying agent by URL scheme — no namespace configuration needed, and `.env`'s existing `socks5h://` value works as-is. Guard on the env vars being set at all so a deployment with no proxy configured doesn't pointlessly construct an agent that immediately no-ops.

**Remove `global-agent` entirely** (clean cutover, matches the project's existing convention from sub-project 1 of not leaving obsolete tooling half-wired):
- `package.json`: drop the `global-agent` dependency.
- `src/main.ts`: replace `import 'global-agent/bootstrap';` with the same `ProxyAgent`-based block used in `index.ts` above (main.ts is legacy but still imports; leaving a `require`/`import` of a removed package would break its compile).

### 2. Geoblock startup guard, using a proxy-aware request (not `fetch`)

New module `src/api/geoblock.ts` (one clear responsibility — checking and reporting geoblock status — keeps `index.ts` from growing further):

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

This deliberately uses `https.get` (built on `https.request`), **not** `fetch` — `https.request`-based calls honor `https.globalAgent` once patched in Section 1, so this check reflects the exact same egress path that `@polymarket/clob-client-v2`'s axios-based order calls will use. A `fetch`-based check would silently measure the *unproxied* IP while real orders went through the proxy (or vice versa) — precisely the mismatch this session observed (`curl` reporting `CH`/unblocked while the bot's own unproxied order call got a 403), which this design closes by using the same request mechanism for both.

In `src/index.ts`'s `main()`, after `initLogger(config)` and before the existing `if (!config.dryRun) { ... }` block that creates the live trading client:

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

(`geoblocked` is declared as a local `let` inside `main()`, not a module-level variable — nothing outside `main()` needs to read it.) Widen the existing live-trading condition from `if (!config.dryRun)` to `if (!config.dryRun && !geoblocked)`. When geoblocked, the bot falls into the same branch that already exists for `dryRun` — bankroll stays 0, no `createClobClient()` call is made, and the bot keeps running (WebSocket monitoring, health endpoint, Telegram if configured) instead of attempting and losing trades it already knows will be rejected. No new Telegram-specific alerting code is added — `logger.error` is sufficient for now; Telegram's broader alerting gaps are tracked separately under sub-project 3 (CONCERNS.md already documents several).

### 3. Real RPC fallback

`src/api/http.ts`: replace the single-URL selection with viem's built-in `fallback()` transport, which actually retries the next URL when one fails (the current code has never done this — the array is decorative):

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

`polygon.llamarpc.com` (dead in this session's test environment) and `rpc.ankr.com/polygon` (now requires an API key this project doesn't have) are dropped entirely rather than kept at low priority — keeping a URL known to need a key it lacks just wastes a retry cycle on every failover. If `POLYGON_RPC_URL` is set, it's tried first, then falls through to the 3 verified defaults — the override isn't lost, it just stops being a single point of failure.

## Testing

- `checkGeoblock()` is a thin, proxy-aware wrapper around a public, unauthenticated, well-known endpoint — no unit test with a mock adds real coverage (this project's existing tests never mock network calls). Manual verification: call it directly with and without `HTTP_PROXY` set, confirm the reported `ip`/`country` actually changes when the proxy is active — that's the concrete proof the patch in Section 1 is doing something, not just present in the diff.
- `createSharedPublicClient()`'s fallback behavior: manual verification only, matching this project's existing convention (no test coverage exists for `src/api/http.ts` today).
- Manual smoke test (full list in Success Criteria) covers all three changes together, since they're small and interdependent — the geoblock guard's real-world meaning depends on the proxy patch actually being in effect first.

## Success Criteria

- [ ] `src/index.ts` and `src/main.ts` both patch `http.globalAgent`/`https.globalAgent` with `proxy-agent`'s `ProxyAgent` (guarded on `HTTP_PROXY`/`HTTPS_PROXY` being set) as their first executable statements. `global-agent` is removed from `package.json` and no file imports it.
- [ ] With `.env`'s existing `socks5h://` proxy URL active, `checkGeoblock()`'s reported `ip`/`country` changes compared to running with the proxy env vars unset — concrete proof the SOCKS5 proxy is actually in effect for `https.request`-based traffic, not just configured.
- [ ] `checkGeoblock()` exists in `src/api/geoblock.ts`, uses `https.get`/`https.request` (not `fetch`), is called during `main()` startup before any live-trading client is created, and gates the live-trading branch (`!config.dryRun` widened to `!config.dryRun && !geoblocked`).
- [ ] When geoblocked, the bot logs a clear error, does not call `createClobClient()`, and continues running (health endpoint, WebSocket monitoring) rather than crashing.
- [ ] `createSharedPublicClient()` uses `fallback()` over the 3 verified-working RPC URLs, with `polygon.llamarpc.com` and `rpc.ankr.com/polygon` removed from the list.
- [ ] `npm run build` passes.
- [ ] Manual smoke test: with the Decodo proxy correctly configured (India or Romania, both confirmed clean this session) and the Section 1 patch active, `checkGeoblock()` reports `blocked: false` from that exit IP. The true-positive path (an actually-blocked exit) is not separately smoke-tested — deliberately routing through a known-restricted-country proxy just to watch the bot correctly refuse to trade is operational overhead this project doesn't need; the live evidence already gathered this session (`placeMarketOrder()` rejected with a 403 from the unproxied raw environment) is the true-positive proof, and it predates this fix. The code path is covered by review, not a second live drill.
