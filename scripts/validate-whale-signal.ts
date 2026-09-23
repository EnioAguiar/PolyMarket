// Backtest for the "fresh/dormant whale" hypothesis. See
// src/research/whale-signal.ts for the shared classification/scoring core
// (also used by the live monitor, src/whale-monitor/index.ts) and its doc
// comment for the full methodology history.

import {
  fetchLargeTrades,
  dedupeFills,
  classifyWallet,
  fetchOutcomesByCondition,
  scoreBet,
  TEAM_MATCHUP_PATTERN,
  type LogicalBet,
  type WalletProfile,
} from '../src/research/whale-signal.js';

async function main(): Promise<void> {
  // Threshold history (2026-09-22): $100k was chosen while a pagination bug
  // was still live (cursor pages silently dropped filter_type/filter_amount
  // /side, so pages after the first re-anchored to the UNFILTERED firehose
  // feed -- thousands of fills/minute -- which looked like "large trades
  // cluster into bursts" but was actually the dropped filters, confirmed by
  // re-testing after the fix: $20k has no such burst and reaches 9 days
  // back in 8 clean pages). Lowered to $20k for a much bigger, still-clean
  // sample -- this also stops discarding the mid-size conviction bets
  // ($20-100k) the whale hypothesis is actually about.
  const MIN_BET_USD = 20000;
  const MAX_PAGES = 20; // ~20 * 200 = up to 4000 raw fills, ~3 weeks back at this threshold
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
  const classified: Array<LogicalBet & WalletProfile> = [];
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
    classified.push({ ...bet, ...profile });
  }
  const candidates = classified.filter((c) => c.isFreshOrDormant);
  // Control arm (review finding, 2026-09-22): the fresh/dormant filter was
  // never compared against a baseline of "copy any large bet regardless of
  // wallet history" -- without that, a positive result here could just mean
  // "large bets are informative in general", not that freshness/dormancy
  // specifically adds anything. Score the complement group too, on the same
  // data already fetched (classification happened for every bet either
  // way; this is free).
  const controlGroup = classified.filter((c) => !c.isFreshOrDormant);
  console.log(`${candidates.length} bets are from a fresh (<=3 prior trades) or dormant (>=14d gap) wallet; ${controlGroup.length} are from an established wallet (control arm). (${classifyErrors} wallet lookups errored and were skipped)`);

  const uniqueConditions = [...new Set(classified.map((c) => c.conditionId))];
  const outcomes = await fetchOutcomesByCondition(uniqueConditions);

  function scoreGroup(items: Array<LogicalBet & WalletProfile>, label: string) {
    let totalStaked = 0;
    let totalPnl = 0;
    let scored = 0;
    let skippedUnresolved = 0;
    const sports = { staked: 0, pnl: 0, n: 0 };
    const other = { staked: 0, pnl: 0, n: 0 };
    const byEvent = new Map<string, { staked: number; pnl: number; n: number; title: string }>();

    for (const c of items) {
      const result = scoreBet(c, outcomes.get(c.conditionId));
      if (!result) {
        skippedUnresolved++;
        continue;
      }
      const { won, pnl } = result;
      totalStaked += c.usdStaked;
      totalPnl += pnl;
      scored++;
      const bucket = TEAM_MATCHUP_PATTERN.test(c.title) ? sports : other;
      bucket.staked += c.usdStaked;
      bucket.pnl += pnl;
      bucket.n++;
      const eventAgg = byEvent.get(c.eventSlug) ?? { staked: 0, pnl: 0, n: 0, title: c.title };
      eventAgg.staked += c.usdStaked;
      eventAgg.pnl += pnl;
      eventAgg.n++;
      byEvent.set(c.eventSlug, eventAgg);
      console.log(
        `[whale:${label}] "${c.title.slice(0, 55)}" wallet=${c.wallet.slice(0, 10)} staked=$${c.usdStaked.toFixed(0)} price=${c.avgPrice.toFixed(2)} ${won ? 'WON' : 'LOST'} pnl=$${pnl.toFixed(0)} tradesBefore=${c.tradesBefore} gapDays=${c.gapDays?.toFixed(1) ?? 'n/a'}`
      );
    }

    console.log(`\n[${label}] Scored ${scored} candidates (${skippedUnresolved} skipped: market not yet resolved to a clean 0/1 winner).`);
    console.log(`[${label}] Distinct real-world events (by Gamma eventSlug): ${byEvent.size} -- this, not the bet count, is the real sample size for statistical confidence.`);
    const clustered = [...byEvent.entries()].filter(([, v]) => v.n >= 3).sort((a, b) => b[1].n - a[1].n);
    if (clustered.length > 0) {
      console.log(`[${label}] Events with 3+ correlated bets (same real-world outcome, not independent trials):`);
      for (const [slug, v] of clustered) {
        console.log(`  - "${v.title.slice(0, 50)}" (${slug}): ${v.n} bets, staked $${v.staked.toFixed(0)}, P&L $${v.pnl.toFixed(0)}, ROI ${((v.pnl / v.staked) * 100).toFixed(1)}%`);
      }
    }
    console.log(`[${label}] Overall: staked $${totalStaked.toFixed(0)}, P&L $${totalPnl.toFixed(0)}, ROI ${totalStaked > 0 ? ((totalPnl / totalStaked) * 100).toFixed(1) : 'n/a'}%`);
    console.log(`  - Team matchups (sports/esports, "X vs Y" pattern), n=${sports.n}: staked $${sports.staked.toFixed(0)}, P&L $${sports.pnl.toFixed(0)}, ROI ${sports.staked > 0 ? ((sports.pnl / sports.staked) * 100).toFixed(1) : 'n/a'}%`);
    console.log(`  - Other markets (politics/macro/events), n=${other.n}: staked $${other.staked.toFixed(0)}, P&L $${other.pnl.toFixed(0)}, ROI ${other.staked > 0 ? ((other.pnl / other.staked) * 100).toFixed(1) : 'n/a'}%`);
    return { totalStaked, totalPnl, scored };
  }

  const freshResult = scoreGroup(candidates, 'fresh/dormant');
  const controlResult = scoreGroup(controlGroup, 'control: established wallets');

  console.log(`\n=== Control comparison ===`);
  console.log(`Fresh/dormant ROI: ${freshResult.totalStaked > 0 ? ((freshResult.totalPnl / freshResult.totalStaked) * 100).toFixed(1) : 'n/a'}% (n=${freshResult.scored})`);
  console.log(`Established-wallet ROI: ${controlResult.totalStaked > 0 ? ((controlResult.totalPnl / controlResult.totalStaked) * 100).toFixed(1) : 'n/a'}% (n=${controlResult.scored})`);
  console.log(`If these are close, the fresh/dormant filter adds little beyond "large bets are informative in general".`);
}

main().catch((error) => {
  console.error('Whale signal validation failed:', error);
  process.exit(1);
});
