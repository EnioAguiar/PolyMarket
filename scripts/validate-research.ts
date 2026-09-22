import { loadConfig } from '../src/config/index.js';
import { initLogger } from '../src/logging/index.js';
import { fetchMarkets } from '../src/api/polymarket.js';
import { getOrderBook, getMidPrice, createClobClient } from '../src/api/clob.js';
import { classifyMarket, extractCryptoThreshold } from '../src/research/classify.js';
import { evaluateSentiment } from '../src/research/strategies/sentiment.js';
import { evaluateTailEnd } from '../src/research/strategies/tail-end.js';
import { evaluateResolutionSniping } from '../src/research/strategies/resolution-sniping.js';
import type { Market } from '../src/types/index.js';

async function getMidPriceForMarket(market: Market): Promise<number | null> {
  const tokenId = market.clobTokenIds[0];
  if (!tokenId) return null;
  try {
    const orderbook = await getOrderBook(tokenId);
    return getMidPrice(orderbook);
  } catch {
    return null;
  }
}

// A resolved market's outcome pair isn't always Yes/No -- sports totals use
// Over/Under, handicaps use team names, etc. evaluateSentiment always asks
// Jev a fixed "...does this suggest the answer is YES?" question, which only
// maps onto a real outcome label for genuine Yes/No markets. Scoring a
// non-Yes/No market against that fixed question would measure noise, not
// signal quality, so Run B restricts itself to markets whose outcomes are
// actually a Yes/No pair (controller amendment, 2026-09-22).
function isYesNoPair(outcomes: string[]): boolean {
  if (outcomes.length !== 2) return false;
  const normalized = outcomes.map((o) => o.trim().toLowerCase());
  return (
    (normalized[0] === 'yes' && normalized[1] === 'no') ||
    (normalized[0] === 'no' && normalized[1] === 'yes')
  );
}

async function runLiveMarkets(): Promise<void> {
  console.log('\n=== RUN A: Live open markets (qualitative) ===\n');
  const markets = await fetchMarkets({ active: true, closed: false, limit: 30 });

  for (const market of markets) {
    const midPrice = await getMidPriceForMarket(market);
    const strategy = classifyMarket(market, midPrice);

    let result: unknown = null;
    try {
      if (strategy === 'sentiment') {
        result = await evaluateSentiment(market);
      } else if (strategy === 'tail_end' && midPrice !== null) {
        result = await evaluateTailEnd(market, midPrice);
      } else if (strategy === 'resolution_sniping' && midPrice !== null) {
        const crypto = extractCryptoThreshold(market.question);
        if (crypto) {
          result = await evaluateResolutionSniping(market, midPrice, crypto.symbol, crypto.threshold);
        }
      }
    } catch (error) {
      result = { error: String(error) };
    }

    console.log(
      `[${strategy.padEnd(18)}] ${market.question.slice(0, 70).padEnd(72)} price=${midPrice?.toFixed(3) ?? 'N/A'}`
    );
    if (result) console.log('  ->', JSON.stringify(result).slice(0, 300));
  }
}

// Broad, backtest-reporting-only pattern for "is this any kind of asset
// price-threshold question" (crypto or not) -- deliberately separate from
// classify.ts's extractCryptoThreshold(), which is a production routing
// decision scoped to Binance-comparable crypto symbols only. This is purely
// for honestly labeling Run B's buckets; it is never used to route a real
// strategy call (controller amendment, 2026-09-22, following review that
// the "other markets" bucket label was factually wrong -- the actual
// non-crypto survivors in this backtest were stock/commodity price
// thresholds, not genuine independent event/news questions).
//
// Widened-run fix (2026-09-22): the first version only accepted a $-prefixed
// number or a comma-grouped bare number, so "Will US Dollar Index (DXY) hit
// (LOW) 100.60 Week of September..." (no $, no comma -- value under 1000)
// slipped through undetected and was miscounted as a "genuine event" market
// when it's really the same other-asset threshold task. A decimal point is
// as strong a non-year signal as a thousands separator (years never carry
// one), so accept a bare decimal number too.
const PRICE_THRESHOLD_PATTERN =
  /\b(above|below|over|under|exceed|reach|hit|surpass)\b[\s\S]{0,20}?(\$\s*[\d,]+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|\b\d+\.\d+\b)/i;

async function runBacktest(): Promise<void> {
  console.log('\n=== RUN B: Resolved markets backtest (quantitative) ===\n');
  // order=id&ascending=false was the original choice (avoids markets whose
  // outcomePrices never settle to an exact 0/1 winner), but review found it
  // exclusively surfaces a correlated BTC/ETH hourly strike-price ladder --
  // paginating deeper with offset (verified live) returns more of the same
  // ladder, not genuine event markets, because id-desc is just "most
  // recently resolved" and that feed happens to be dominated by hourly
  // crypto strikes right now.
  //
  // order=volumeNum&ascending=false, verified live (2026-09-22), instead
  // surfaces exactly the genuine independent event/news markets Run B was
  // always meant to test -- "Will Donald Trump win the 2024 US Presidential
  // Election?", "Fed decreases interest rates by 50+ bps after January 2026
  // meeting?", "US forces enter Iran by April 30?" -- all real Yes/No pairs
  // with clean settled 0/1 outcomes. High-volume markets are structurally
  // unlikely to be thin technical strike-ladder questions (those observed
  // at volumeNum ~15-51, orders of magnitude below real event markets).
  const PAGES = 2;
  const PAGE_SIZE = 100;
  const seen = new Set<string>();
  const markets: Market[] = [];
  for (let page = 0; page < PAGES; page++) {
    const batch = await fetchMarkets({
      active: false,
      closed: true,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      order: 'volumeNum',
      ascending: false,
    });
    if (batch.length === 0) break;
    for (const m of batch) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        markets.push(m);
      }
    }
  }


  let withSignalCorrect = 0;
  let withSignalTotal = 0;
  let noSignalCount = 0;
  let errorCount = 0;
  let fullTextCount = 0;
  let headlineOnlyCount = 0;
  let skippedNonYesNo = 0;
  let skippedNoWinner = 0;
  let skippedNoResolveDate = 0;

  // Market-type breakdown (controller amendment, 2026-09-22): the combined
  // withSignal hit-rate conflates structurally different tasks. Bucket into
  // three honest groups instead of two:
  //   - crypto-strike: extractCryptoThreshold() matches (BTC/ETH threshold).
  //   - other-price-strike: not crypto, but still a price-threshold
  //     question on some other asset (stock, commodity) -- structurally
  //     the same near-term technical-threshold task as crypto-strike, NOT
  //     a genuine independent event/news question.
  //   - genuine-event: neither -- an actual candidate independent
  //     event/news market (election, approval, geopolitical event, etc).
  // Also track distinct resolveDate timestamps per bucket: markets sharing
  // the same resolveDate (e.g. a ladder of BTC strikes all settling at the
  // same 3PM ET timestamp) are correlated draws of the same underlying
  // price path, not independent trials -- reporting raw n alongside
  // distinct-expiry n makes that visible instead of hiding it.
  let cryptoStrikeCorrect = 0;
  let cryptoStrikeTotal = 0;
  const cryptoStrikeExpiries = new Set<string>();
  let otherStrikeCorrect = 0;
  let otherStrikeTotal = 0;
  const otherStrikeExpiries = new Set<string>();
  let genuineEventCorrect = 0;
  let genuineEventTotal = 0;
  const genuineEventExpiries = new Set<string>();

  // Cap how many crypto-strike markets sharing the same resolveDate get a
  // real (paid) sentiment evaluation -- review found a single hourly
  // expiry can have 10-15 correlated strike rungs, all resolved by the same
  // underlying price path, so evaluating all of them burns Jev/news budget
  // for near-zero extra information (controller amendment, 2026-09-22).
  const CRYPTO_STRIKE_CAP_PER_EXPIRY = 3;
  const cryptoStrikeEvaluatedPerExpiry = new Map<string, number>();
  let cryptoStrikeCappedSkipped = 0;

  for (const market of markets) {
    if (market.outcomes.length !== 2 || market.outcomePrices.length !== 2) continue;

    if (!isYesNoPair(market.outcomes)) {
      skippedNonYesNo++;
      continue;
    }

    const winnerIndex = market.outcomePrices.findIndex((p) => p === 1);
    if (winnerIndex === -1) {
      skippedNoWinner++;
      continue;
    }
    const realOutcome = market.outcomes[winnerIndex]; // "Yes" or "No"
    const realIsYes = realOutcome.toLowerCase() === 'yes';

    // Sentiment strategy: always applicable when there's a question.
    // beforeDate is REQUIRED here -- without it, the news search would run
    // against today's date and could return articles reporting the outcome
    // that already happened, making the "prediction" meaningless (see spec
    // §2/§5 leakage warning). market.resolveDate is the market's own
    // resolution timestamp; fall back to skipping this market's sentiment
    // check entirely if it's missing rather than searching unbounded.
    if (!market.resolveDate) {
      console.log(`[sentiment] "${market.question.slice(0, 60)}" SKIPPED: no resolveDate to bound the search`);
      skippedNoResolveDate++;
      continue;
    }
    const beforeDate = new Date(market.resolveDate);
    const isCryptoStrike = extractCryptoThreshold(market.question) !== null;
    const isOtherStrike = !isCryptoStrike && PRICE_THRESHOLD_PATTERN.test(market.question);
    const marketType = isCryptoStrike ? 'crypto-strike' : isOtherStrike ? 'other-price-strike' : 'genuine-event';

    if (isCryptoStrike) {
      const evaluatedForExpiry = cryptoStrikeEvaluatedPerExpiry.get(market.resolveDate) ?? 0;
      if (evaluatedForExpiry >= CRYPTO_STRIKE_CAP_PER_EXPIRY) {
        cryptoStrikeCappedSkipped++;
        continue;
      }
      cryptoStrikeEvaluatedPerExpiry.set(market.resolveDate, evaluatedForExpiry + 1);
    }
    try {
      const sentiment = await evaluateSentiment(market, beforeDate);
      const predictedYes = sentiment.probability >= 0.5;
      const hasSignal = sentiment.articlesFound > 0;
      const correct = predictedYes === realIsYes;

      // evaluateSentiment defaults probability to 0.5 (>= 0.5 -> "predicted
      // YES") when zero articles survive the beforeDate cutoff. Folding
      // those into the accuracy count would silently score a no-data
      // default as a confident prediction and skew the hit-rate against
      // whatever the real Yes/No split happens to be, independent of Jev's
      // actual judging quality. Bucket them separately (controller
      // amendment, 2026-09-22).
      if (hasSignal) {
        withSignalTotal++;
        if (correct) withSignalCorrect++;
        if (marketType === 'crypto-strike') {
          cryptoStrikeTotal++;
          cryptoStrikeExpiries.add(market.resolveDate);
          if (correct) cryptoStrikeCorrect++;
        } else if (marketType === 'other-price-strike') {
          otherStrikeTotal++;
          otherStrikeExpiries.add(market.resolveDate);
          if (correct) otherStrikeCorrect++;
        } else {
          genuineEventTotal++;
          genuineEventExpiries.add(market.resolveDate);
          if (correct) genuineEventCorrect++;
        }
      } else {
        noSignalCount++;
      }

      console.log(
        `[sentiment] "${market.question.slice(0, 60)}" predicted=${predictedYes ? 'YES' : 'NO'} real=${realIsYes ? 'YES' : 'NO'} ${correct ? '\u2713' : '\u2717'} articles=${sentiment.articlesFound}${hasSignal ? '' : ' (NO SIGNAL, default 0.5)'} type=${marketType} resolveDate=${market.resolveDate}`
      );
      for (const article of sentiment.articles) {
        console.log(`    - p=${article.probability.toFixed(2)} "${article.title.slice(0, 70)}" ${article.link}`);
        // evaluateSentiment itself reports whether Jev judged real crawled
        // article text or the bare-headline fallback (usedFullText) -- a
        // second independent fetchArticleText() re-probe here would be
        // unreliable: crawl4ai has real flakiness (timeouts, per-site
        // anti-bot defenses) and a retry can succeed or fail differently
        // than the original call that actually fed Jev (controller
        // amendment, 2026-09-22).
        if (article.usedFullText) {
          fullTextCount++;
        } else {
          headlineOnlyCount++;
          console.log(`      (full-text fetch failed -- Jev judged this on headline only)`);
        }
      }
    } catch (error) {
      // Previously silently dropped this market from every counter --
      // fetched-count and (withSignal + noSignal) would then disagree with
      // no explanation (review finding, 2026-09-22). Count and log it
      // explicitly instead.
      errorCount++;
      console.log(`[sentiment] "${market.question.slice(0, 60)}" ERROR (excluded from all counts): ${error}`);
    }

    // Tail-end: only applicable if we can reconstruct that the market was
    // near-certain before resolution. We don't have historical price here,
    // so approximate using the resolved outcomePrices themselves as a proxy
    // is invalid (that's the answer, not the pre-resolution price) -- skip
    // tail-end in the backtest and note the limitation explicitly.
  }

  console.log(`\nFetched ${markets.length} resolved markets (${PAGES} pages x ${PAGE_SIZE}, deduplicated).`);
  console.log(`Skipped (non Yes/No outcome pair, e.g. Over/Under or team names): ${skippedNonYesNo}`);
  console.log(`Skipped (no settled 0/1 winner in outcomePrices): ${skippedNoWinner}`);
  console.log(`Skipped (no resolveDate to bound the search): ${skippedNoResolveDate}`);
  console.log(`Errored (Jev/news call threw, excluded from all counts below): ${errorCount}`);
  console.log(`Skipped (crypto-strike, capped at ${CRYPTO_STRIKE_CAP_PER_EXPIRY} evaluations per distinct resolveDate to avoid spending budget on correlated ladder rungs): ${cryptoStrikeCappedSkipped}`);
  console.log(
    `\nSentiment strategy (markets with real news signal only): ${withSignalCorrect}/${withSignalTotal} correct`
  );
  console.log(
    `  - Crypto price-threshold (BTC/ETH, e.g. "Bitcoin above 88,200 on September 22, 3PM ET?"): ${cryptoStrikeCorrect}/${cryptoStrikeTotal} correct${cryptoStrikeTotal > 0 ? ` (${((cryptoStrikeCorrect / cryptoStrikeTotal) * 100).toFixed(1)}%)` : ''}, ${cryptoStrikeExpiries.size} distinct resolveDate timestamp(s) -- markets sharing a timestamp are correlated draws of the same price path, not independent trials`
  );
  console.log(
    `  - Other-asset price-threshold (stocks/commodities, e.g. "Will Coinbase (COIN) hit (HIGH) $200 in September?" -- NOT genuine event/news questions, same structural task as crypto-strike): ${otherStrikeCorrect}/${otherStrikeTotal} correct${otherStrikeTotal > 0 ? ` (${((otherStrikeCorrect / otherStrikeTotal) * 100).toFixed(1)}%)` : ''}, ${otherStrikeExpiries.size} distinct resolveDate timestamp(s)`
  );
  console.log(
    `  - Genuine independent event/news markets (neither of the above -- elections, approvals, geopolitical events, etc): ${genuineEventCorrect}/${genuineEventTotal} correct${genuineEventTotal > 0 ? ` (${((genuineEventCorrect / genuineEventTotal) * 100).toFixed(1)}%)` : ''}, ${genuineEventExpiries.size} distinct resolveDate timestamp(s). *** DO NOT TRUST THIS NUMBER AS A PREDICTIVE HIT-RATE. *** Confirmed live (2026-09-22): resolveDate for administratively-resolved event markets often lands well after the real-world outcome was already public (e.g. a market resolving on inauguration day gets judged on a same-day "X sworn in" headline). before:resolveDate is a leakage-safe cutoff ONLY for markets whose resolution IS the real-world moment (e.g. hourly crypto strikes) -- see google-news-rss.ts's SearchOptions doc comment. This number reflects Jev reading already-public outcomes back, not prediction, until a properly-lagged cutoff (resolveDate minus a real margin, not resolveDate itself) is implemented and re-validated.`
  );
  console.log(
    `  - Combined (all three buckets, for continuity with prior reporting -- NOT a single coherent task, see buckets above): ${withSignalCorrect}/${withSignalTotal} correct${withSignalTotal > 0 ? ` (${((withSignalCorrect / withSignalTotal) * 100).toFixed(1)}%)` : ''}`
  );
  console.log(
    `Sentiment strategy, zero-article "no signal" markets (excluded from the accuracy number above, defaulted to a bare 0.5/"YES" guess): ${noSignalCount}`
  );
  console.log(
    `Article text source: ${fullTextCount} judged on full crawled article text, ${headlineOnlyCount} fell back to headline-only (crawl4ai fetch failed)`
  );
  console.log(
    `Tail-end strategy: not backtested — resolved markets don't expose their pre-resolution price in this API response, only the final outcome. See spec Non-Goals / Task 8 note.`
  );
  console.log(
    `Resolution sniping: not backtested — a resolved market's "live" price is meaningless after the fact.`
  );
}

async function main(): Promise<void> {
  // getOrderBook() (used by Run A for mid-prices) requires the CLOB client
  // singleton to already be initialized -- src/main.ts does this the same
  // way in its non-dry-run path. Without it every getOrderBook() call
  // throws "CLOB client not initialized" and Run A's mid-prices are all
  // N/A (confirmed live: this is exactly what happened before this init
  // was added). This derives/reads CLOB API credentials -- no orders are
  // placed, matching the brief's read-only requirement.
  const config = loadConfig();
  initLogger(config);
  await createClobClient(config);

  await runLiveMarkets();
  await runBacktest();
}

main().catch((error) => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
