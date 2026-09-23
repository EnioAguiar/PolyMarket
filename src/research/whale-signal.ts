// Shared core for the "fresh/dormant whale" signal: does an unusually large
// bet from a wallet with little or no prior trading history predict the
// market's real outcome better than the price it paid?
//
// Data source: Polymarket's public, no-auth Data API v2
// (https://data-api.polymarket.com/v2) -- on-chain fact only, no leakage
// risk (unlike the news-sentiment pipeline). Used by both the historical
// backtest (scripts/validate-whale-signal.ts) and the live monitor
// (src/whale-monitor/index.ts) so classification rules stay in one place.
//
// Scoring convention: raw hit-rate against 50% is the wrong yardstick --
// these whales buy at market-implied prices (0.37-1.00), not a coin flip.
// Score by realized edge per bet: edge = payout (1 if won, 0 if lost) -
// price_paid; aggregate as portfolio ROI (total P&L / total staked), not
// accuracy.
import https from 'node:https';
import { ProxyAgent } from 'proxy-agent';

// IMPORTANT: native `fetch()` is backed by undici, which has its own
// dispatcher and ignores the classic `http.globalAgent`/`https.globalAgent`
// -- confirmed live, 2026-09-22: undici's own ProxyAgent additionally only
// accepts `http:`/`https:` URLs, and this project's proxy is `socks5h://`,
// so undici's proxy support doesn't apply here at all. This module uses
// Node's classic `https.get` instead (matching src/api/geoblock.ts's own
// established reason for the same choice), which correctly inherits the
// `https.globalAgent` patch below -- the same `proxy-agent` package
// (SOCKS5-capable, unlike `global-agent`) already used by src/index.ts.
// Gated behind the same POLYMARKET_PROXY_URL env var as the rest of the
// bot, so deployments sharing a Railway IP pool (rate-limit risk raised
// live, 2026-09-22) can opt into routing this module's calls through the
// same already-provisioned proxy without a second one.
const proxyUrl = process.env.POLYMARKET_PROXY_URL;
if (proxyUrl) {
  https.globalAgent = new ProxyAgent({ getProxyForUrl: () => proxyUrl }) as unknown as https.Agent;
}

export const DATA_API = 'https://data-api.polymarket.com/v2';
export const GAMMA_API = 'https://gamma-api.polymarket.com';

export const FRESH_MAX_TRADES = 3;
export const DORMANT_MIN_GAP_DAYS = 14;

export interface RawTrade {
  proxy_wallet: string;
  side: 'BUY' | 'SELL';
  token_id: string;
  condition_id: string;
  size: number; // shares, NOT usd
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  event_slug: string;
  outcome: string;
  outcome_index: number;
}

function httpsGetJson<T>(url: string): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: T | null }> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          const status = res.statusCode ?? 0;
          if (status < 200 || status >= 300) {
            resolve({ status, headers: res.headers, body: null });
            return;
          }
          try {
            resolve({ status, headers: res.headers, body: JSON.parse(data) as T });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

export async function fetchJson<T>(url: string): Promise<T> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { status, headers, body } = await httpsGetJson<T>(url);
    if (status >= 200 && status < 300) return body as T;
    if (status === 429 || status === 503 || status === 500) {
      const retryAfterHeader = headers['retry-after'];
      const retryAfter = Number(Array.isArray(retryAfterHeader) ? retryAfterHeader[0] : retryAfterHeader) || 2 * attempt;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    throw new Error(`HTTP ${status} for ${url}`);
  }
  throw new Error(`Exhausted retries for ${url}`);
}

// Page backward through the global large-trades feed. filter_amount is in
// CASH (usd-equivalent per the API's filter_type), not shares. `stopAtOrBefore`
// (epoch seconds), when given, stops paginating once a page's oldest trade
// is at or before it -- lets a caller catch up exactly to where it left
// off after downtime instead of guessing a fixed page count (review
// finding, 2026-09-22: a live monitor hardcoded to 1 page would silently
// lose everything older than that page's oldest trade after any real
// outage/redeploy longer than that page covers).
export async function fetchLargeTrades(
  minAmountUsd: number,
  maxPages: number,
  stopAtOrBefore?: number
): Promise<RawTrade[]> {
  const trades: RawTrade[] = [];
  let cursor: string | null = null;
  const baseParams = `filter_type=CASH&filter_amount=${minAmountUsd}&limit=200&side=BUY`;
  for (let page = 0; page < maxPages; page++) {
    // The API's own docs are explicit: on feed endpoints, re-send the same
    // filters on every page -- the cursor carries only its seek anchor, and
    // dropping filters silently re-anchors the feed instead of erroring
    // (bug found live, 2026-09-22: sending only `?cursor=` on pages after
    // the first caused every subsequent page to re-fetch the same window
    // instead of advancing).
    const url: string = cursor
      ? `${DATA_API}/trades?${baseParams}&cursor=${encodeURIComponent(cursor)}`
      : `${DATA_API}/trades?${baseParams}`;
    // Pace requests to stay under the documented public-endpoint rate limit
    // (60/min) -- review finding, 2026-09-22: a catch-up walk of many pages
    // in a tight loop with no delay hammered the API fast enough to
    // exhaust fetchJson's own retries and fail the whole cycle, which is
    // worse than the data-loss bug this pagination was added to fix (the
    // cycle now advances lastSeenTimestamp not at all instead of partially).
    if (page > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const res = await fetchJson<{ data: RawTrade[]; pagination: { next_cursor: string | null; has_more: boolean } }>(url);
    trades.push(...res.data);
    const oldestInPage = res.data.length > 0 ? Math.min(...res.data.map((t) => t.timestamp)) : Infinity;
    if (stopAtOrBefore !== undefined && oldestInPage <= stopAtOrBefore) break;
    if (!res.pagination.has_more || !res.pagination.next_cursor) break;
    cursor = res.pagination.next_cursor;
  }
  return trades;
}

export interface LogicalBet {
  wallet: string;
  conditionId: string;
  tokenId: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  eventSlug: string;
  timestamp: number; // last fill's timestamp
  shares: number; // summed
  usdStaked: number; // summed size*price
  avgPrice: number; // usdStaked / shares
}

// Dedupe fills from the same wallet+condition into one logical bet when they
// land within a short window (a large order frequently fills across several
// trades at slightly different prices).
export function dedupeFills(trades: RawTrade[]): LogicalBet[] {
  const WINDOW_SECONDS = 120;
  const byKey = new Map<string, RawTrade[]>();
  for (const t of trades) {
    const key = `${t.proxy_wallet}:${t.condition_id}`;
    const bucket = byKey.get(key) ?? [];
    bucket.push(t);
    byKey.set(key, bucket);
  }
  const bets: LogicalBet[] = [];
  for (const fills of byKey.values()) {
    fills.sort((a, b) => a.timestamp - b.timestamp);
    let group: RawTrade[] = [];
    const flush = () => {
      if (group.length === 0) return;
      const shares = group.reduce((sum, f) => sum + f.size, 0);
      const usdStaked = group.reduce((sum, f) => sum + f.size * f.price, 0);
      const last = group[group.length - 1];
      bets.push({
        wallet: last.proxy_wallet,
        conditionId: last.condition_id,
        tokenId: last.token_id,
        outcomeIndex: last.outcome_index,
        title: last.title,
        slug: last.slug,
        eventSlug: last.event_slug,
        timestamp: last.timestamp,
        shares,
        usdStaked,
        avgPrice: usdStaked / shares,
      });
      group = [];
    };
    for (const f of fills) {
      if (group.length > 0 && f.timestamp - group[group.length - 1].timestamp > WINDOW_SECONDS) flush();
      group.push(f);
    }
    flush();
  }
  return bets;
}

export interface WalletProfile {
  isFreshOrDormant: boolean;
  tradesBefore: number;
  gapDays: number | null;
}

// Reconstruct whether a wallet was "new" or "dormant" AT THE TIME of a given
// bet, using only that wallet's own trade timestamps (point-in-time fact,
// no external leakage risk). start=1 asks the user-shape feed for full
// history per the API's own docs.
export async function classifyWallet(wallet: string, betTimestamp: number): Promise<WalletProfile> {
  const url = `${DATA_API}/trades?user=${wallet}&start=1&end=${betTimestamp - 1}&limit=50`;
  const res = await fetchJson<{ data: RawTrade[] }>(url);
  const before = res.data;
  const tradesBefore = before.length;
  if (tradesBefore === 0) return { isFreshOrDormant: true, tradesBefore: 0, gapDays: null };
  const mostRecentBefore = Math.max(...before.map((t) => t.timestamp));
  const gapDays = (betTimestamp - mostRecentBefore) / 86400;
  return {
    isFreshOrDormant: tradesBefore <= FRESH_MAX_TRADES || gapDays >= DORMANT_MIN_GAP_DAYS,
    tradesBefore,
    gapDays,
  };
}

export interface GammaOutcome {
  closed: boolean;
  outcomes: string[];
  outcomePrices: number[];
  question: string;
}

interface RawGammaMarket {
  conditionId: string;
  closed?: boolean;
  outcomes?: string;
  outcomePrices?: string;
  question: string;
}

// Batch-fetch by condition_ids. Gamma's own default is active=true
// (implicitly excludes resolved markets) -- closed=true is required to see
// settled markets; any candidate whose market is still open correctly
// stays absent from the result. Gamma also rejects comma-joined
// condition_ids (returns []); repeated params are required.
export async function fetchOutcomesByCondition(conditionIds: string[]): Promise<Map<string, GammaOutcome>> {
  const result = new Map<string, GammaOutcome>();
  const CHUNK = 20;
  for (let i = 0; i < conditionIds.length; i += CHUNK) {
    const chunk = conditionIds.slice(i, i + CHUNK);
    const params = chunk.map((id) => `condition_ids=${id}`).join('&');
    const url = `${GAMMA_API}/markets?${params}&closed=true`;
    const rows = await fetchJson<RawGammaMarket[]>(url);
    for (const raw of rows) {
      result.set(raw.conditionId, {
        closed: raw.closed ?? false,
        outcomes: raw.outcomes ? JSON.parse(raw.outcomes) : [],
        outcomePrices: raw.outcomePrices ? JSON.parse(raw.outcomePrices).map(Number) : [],
        question: raw.question,
      });
    }
  }
  return result;
}

export const TEAM_MATCHUP_PATTERN = /\bvs\.?\b/i;

// Score a single resolved bet against its real outcome. Returns null if the
// market hasn't settled to a clean 0/1 winner yet.
export function scoreBet(
  bet: LogicalBet,
  outcome: GammaOutcome | undefined
): { won: boolean; pnl: number } | null {
  if (!outcome || outcome.outcomePrices.length !== 2) return null;
  const winnerIndex = outcome.outcomePrices.findIndex((p) => p === 1);
  if (winnerIndex === -1) return null;
  const won = winnerIndex === bet.outcomeIndex;
  const payout = won ? 1 : 0;
  const pnl = (payout - bet.avgPrice) * bet.shares;
  return { won, pnl };
}
