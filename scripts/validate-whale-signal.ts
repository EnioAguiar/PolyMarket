// Backtest for the "fresh/dormant whale" hypothesis: does an unusually large
// bet from a wallet with little or no prior trading history predict the
// market's real outcome better than the price it paid?
//
// Data source: Polymarket's public, no-auth Data API v2
// (https://data-api.polymarket.com/v2) -- no Jev/news cost, no leakage risk
// (everything here is on-chain fact: trade fills, wallet history, settled
// market outcomes). This is a genuinely different, cheaper validation than
// scripts/validate-research.ts's news-sentiment backtest.
//
// Scoring (controller correction, 2026-09-22, following review): raw
// hit-rate against 50% is the wrong yardstick -- these whales buy at market
// prices like 0.93 or 0.31, not a coin flip. A bet at 0.93 that wins 90% of
// the time is a LOSING signal. Score by realized edge per bet:
//   edge = payout (1 if won, 0 if lost) - price_paid
//   roi  = edge / price_paid
// and aggregate as portfolio ROI (total P&L / total staked), not accuracy.

const DATA_API = 'https://data-api.polymarket.com/v2';
const GAMMA_API = 'https://gamma-api.polymarket.com';

interface RawTrade {
  proxy_wallet: string;
  side: 'BUY' | 'SELL';
  token_id: string;
  condition_id: string;
  size: number; // shares, NOT usd
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  outcome: string;
  outcome_index: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(url);
    if (response.ok) return response.json() as Promise<T>;
    if (response.status === 429 || response.status === 503 || response.status === 500) {
      const retryAfter = Number(response.headers.get('retry-after')) || 2 * attempt;
      console.log(`[whale] ${response.status} on ${url.slice(0, 80)}... retrying in ${retryAfter}s`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      continue;
    }
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  throw new Error(`Exhausted retries for ${url}`);
}

// Page backward through the global large-trades feed. filter_amount is in
// CASH (usd-equivalent per the API's filter_type), not shares.
async function fetchLargeTrades(minAmountUsd: number, maxPages: number): Promise<RawTrade[]> {
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
    const url = cursor
      ? `${DATA_API}/trades?${baseParams}&cursor=${encodeURIComponent(cursor)}`
      : `${DATA_API}/trades?${baseParams}`;
    const res = await fetchJson<{ data: RawTrade[]; pagination: { next_cursor: string | null; has_more: boolean } }>(url);
    trades.push(...res.data);
    if (!res.pagination.has_more || !res.pagination.next_cursor) break;
    cursor = res.pagination.next_cursor;
  }
  return trades;
}

interface LogicalBet {
  wallet: string;
  conditionId: string;
  tokenId: string;
  outcomeIndex: number;
  title: string;
  slug: string;
  timestamp: number; // last fill's timestamp
  shares: number; // summed
  usdStaked: number; // summed size*price
  avgPrice: number; // usdStaked / shares
}

// Dedupe fills from the same wallet+condition into one logical bet when they
// land within a short window (a large order frequently fills across several
// trades at slightly different prices) -- review finding, 2026-09-22.
function dedupeFills(trades: RawTrade[]): LogicalBet[] {
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

interface WalletProfile {
  isFreshOrDormant: boolean;
  tradesBefore: number;
  gapDays: number | null;
}

// Reconstruct whether a wallet was "new" or "dormant" AT THE TIME of a given
// bet, using only that wallet's own trade timestamps (point-in-time fact,
// no external leakage risk). start=1 asks the user-shape feed for full
// history per the API's own docs.
async function classifyWallet(wallet: string, betTimestamp: number): Promise<WalletProfile> {
  const url = `${DATA_API}/trades?user=${wallet}&start=1&end=${betTimestamp - 1}&limit=50`;
  const res = await fetchJson<{ data: RawTrade[] }>(url);
  const before = res.data;
  const tradesBefore = before.length;
  if (tradesBefore === 0) return { isFreshOrDormant: true, tradesBefore: 0, gapDays: null };
  const mostRecentBefore = Math.max(...before.map((t) => t.timestamp));
  const gapDays = (betTimestamp - mostRecentBefore) / 86400;
  const FRESH_MAX_TRADES = 3;
  const DORMANT_MIN_GAP_DAYS = 14;
  return {
    isFreshOrDormant: tradesBefore <= FRESH_MAX_TRADES || gapDays >= DORMANT_MIN_GAP_DAYS,
    tradesBefore,
    gapDays,
  };
}

interface GammaOutcome {
  closed: boolean;
  outcomes: string[];
  outcomePrices: number[];
  question: string;
}

// Batch-fetch by condition_ids. Correction (review finding, 2026-09-22): the
// original comment here assumed omitting status params meant "no filter",
// but Gamma's own default is active=true (implicitly excludes resolved
// markets) -- confirmed live, a candidate's own condition_id returned []
// with no params and the real resolved market with `closed=true` added.
// Since this function only cares about "did this market resolve", closed=
// true is exactly the right filter: any candidate whose market is still
// open correctly stays absent from the result (skipped downstream, not
// silently mis-scored).
interface RawGammaMarket {
  conditionId: string;
  closed?: boolean;
  outcomes?: string;
  outcomePrices?: string;
  question: string;
}

async function fetchOutcomesByCondition(conditionIds: string[]): Promise<Map<string, GammaOutcome>> {
  const result = new Map<string, GammaOutcome>();
  const CHUNK = 20;
  for (let i = 0; i < conditionIds.length; i += CHUNK) {
    const chunk = conditionIds.slice(i, i + CHUNK);
    // Gamma rejects comma-joined condition_ids (returns []); repeated
    // params work (verified live, 2026-09-22 -- this bug silently zeroed
    // out every batch lookup on the first real run).
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

const TEAM_MATCHUP_PATTERN = /\bvs\.?\b/i;

async function main(): Promise<void> {
  // Real testing (2026-09-22) found $5k and $25k thresholds get the
  // pagination stuck inside single bursts of thousands of fills on
  // high-frequency micro-markets ("Bitcoin Up or Down" 5-minute markets,
  // live in-game sports) -- the same short-horizon-market-dominance
  // pattern found in the news-sentiment backtest. $100k clears that noise
  // and reaches genuinely old, diverse trades within a handful of pages.
  const MIN_BET_USD = 100000;
  const MAX_PAGES = 10; // real data exhausts around page 3-4 (~52 days back) at this threshold
  const MIN_AGE_DAYS = 5; // give markets time to actually close/settle

  console.log(`Fetching large trades (>= $${MIN_BET_USD}, up to ${MAX_PAGES} pages)...`);
  const rawTrades = await fetchLargeTrades(MIN_BET_USD, MAX_PAGES);
  console.log(`Fetched ${rawTrades.length} raw fills.`);

  const nowSec = Date.now() / 1000;
  const cutoffTimestamp = nowSec - MIN_AGE_DAYS * 86400;
  const oldEnough = rawTrades.filter((t) => t.timestamp <= cutoffTimestamp);
  console.log(`${oldEnough.length} fills are at least ${MIN_AGE_DAYS} days old (kept; rest discarded as too recent to have settled).`);

  const bets = dedupeFills(oldEnough);
  console.log(`Deduped into ${bets.length} logical bets.`);

  const walletCache = new Map<string, WalletProfile>();
  const candidates: Array<LogicalBet & WalletProfile> = [];
  let classifyErrors = 0;
  for (const bet of bets) {
    const cacheKey = `${bet.wallet}:${bet.timestamp}`;
    let profile = walletCache.get(cacheKey);
    if (!profile) {
      try {
        profile = await classifyWallet(bet.wallet, bet.timestamp);
        walletCache.set(cacheKey, profile);
      } catch (error) {
        // Don't let one wallet's transient failure kill the whole run --
        // count it explicitly and move on (review finding, 2026-09-22:
        // an uncaught error here previously crashed the run after 100s of
        // real work, losing all of it).
        classifyErrors++;
        console.log(`[whale] wallet classification failed for ${bet.wallet.slice(0, 10)}: ${error}`);
        continue;
      }
    }
    if (profile.isFreshOrDormant) candidates.push({ ...bet, ...profile });
  }
  console.log(`${candidates.length} bets are from a fresh (<=3 prior trades) or dormant (>=14d gap) wallet. (${classifyErrors} wallet lookups errored and were skipped)`);

  const uniqueConditions = [...new Set(candidates.map((c) => c.conditionId))];
  const outcomes = await fetchOutcomesByCondition(uniqueConditions);

  let totalStaked = 0;
  let totalPnl = 0;
  let scored = 0;
  let skippedUnresolved = 0;
  const sports = { staked: 0, pnl: 0, n: 0 };
  const other = { staked: 0, pnl: 0, n: 0 };

  for (const c of candidates) {
    const outcome = outcomes.get(c.conditionId);
    if (!outcome || outcome.outcomePrices.length !== 2) {
      skippedUnresolved++;
      continue;
    }
    const winnerIndex = outcome.outcomePrices.findIndex((p) => p === 1);
    if (winnerIndex === -1) {
      skippedUnresolved++;
      continue;
    }
    const won = winnerIndex === c.outcomeIndex;
    const payout = won ? 1 : 0;
    const edgePerShare = payout - c.avgPrice;
    const pnl = edgePerShare * c.shares;
    totalStaked += c.usdStaked;
    totalPnl += pnl;
    scored++;
    const bucket = TEAM_MATCHUP_PATTERN.test(c.title) ? sports : other;
    bucket.staked += c.usdStaked;
    bucket.pnl += pnl;
    bucket.n++;
    console.log(
      `[whale] "${c.title.slice(0, 60)}" wallet=${c.wallet.slice(0, 10)} staked=$${c.usdStaked.toFixed(0)} price=${c.avgPrice.toFixed(2)} ${won ? 'WON' : 'LOST'} pnl=$${pnl.toFixed(0)} tradesBefore=${c.tradesBefore} gapDays=${c.gapDays?.toFixed(1) ?? 'n/a'}`
    );
  }

  console.log(`\nScored ${scored} candidates (${skippedUnresolved} skipped: market not yet resolved to a clean 0/1 winner).`);
  console.log(`\nOverall: staked $${totalStaked.toFixed(0)}, P&L $${totalPnl.toFixed(0)}, ROI ${totalStaked > 0 ? ((totalPnl / totalStaked) * 100).toFixed(1) : 'n/a'}%`);
  console.log(`  - Team matchups (sports/esports, "X vs Y" pattern), n=${sports.n}: staked $${sports.staked.toFixed(0)}, P&L $${sports.pnl.toFixed(0)}, ROI ${sports.staked > 0 ? ((sports.pnl / sports.staked) * 100).toFixed(1) : 'n/a'}%`);
  console.log(`  - Other markets (politics/macro/events), n=${other.n}: staked $${other.staked.toFixed(0)}, P&L $${other.pnl.toFixed(0)}, ROI ${other.staked > 0 ? ((other.pnl / other.staked) * 100).toFixed(1) : 'n/a'}%`);
}

main().catch((error) => {
  console.error('Whale signal validation failed:', error);
  process.exit(1);
});
