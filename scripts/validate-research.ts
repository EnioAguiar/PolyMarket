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

async function runBacktest(): Promise<void> {
  console.log('\n=== RUN B: Resolved markets backtest (quantitative) ===\n');
  // order=id&ascending=false: the Gamma API's default ordering for closed=true
  // surfaces old/degenerate markets whose outcomePrices never settle to an
  // exact 0/1 winner (verified live: 0/100 valid winners with no order param
  // vs 100/100 with id-desc). Sorting by id descending gets real, recently
  // resolved markets with a clean settled outcome.
  const markets = await fetchMarkets({
    active: false,
    closed: true,
    limit: 100,
    order: 'id',
    ascending: false,
  });

  let withSignalCorrect = 0;
  let withSignalTotal = 0;
  let noSignalCount = 0;
  let fullTextCount = 0;
  let headlineOnlyCount = 0;
  let skippedNonYesNo = 0;
  let skippedNoWinner = 0;
  let skippedNoResolveDate = 0;

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
      } else {
        noSignalCount++;
      }

      console.log(
        `[sentiment] "${market.question.slice(0, 60)}" predicted=${predictedYes ? 'YES' : 'NO'} real=${realIsYes ? 'YES' : 'NO'} ${correct ? '\u2713' : '\u2717'} articles=${sentiment.articlesFound}${hasSignal ? '' : ' (NO SIGNAL, default 0.5)'} resolveDate=${market.resolveDate}`
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
      console.log(`[sentiment] "${market.question.slice(0, 60)}" ERROR: ${error}`);
    }

    // Tail-end: only applicable if we can reconstruct that the market was
    // near-certain before resolution. We don't have historical price here,
    // so approximate using the resolved outcomePrices themselves as a proxy
    // is invalid (that's the answer, not the pre-resolution price) -- skip
    // tail-end in the backtest and note the limitation explicitly.
  }

  console.log(`\nFetched ${markets.length} resolved markets.`);
  console.log(`Skipped (non Yes/No outcome pair, e.g. Over/Under or team names): ${skippedNonYesNo}`);
  console.log(`Skipped (no settled 0/1 winner in outcomePrices): ${skippedNoWinner}`);
  console.log(`Skipped (no resolveDate to bound the search): ${skippedNoResolveDate}`);
  console.log(
    `\nSentiment strategy (markets with real news signal only): ${withSignalCorrect}/${withSignalTotal} correct`
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
