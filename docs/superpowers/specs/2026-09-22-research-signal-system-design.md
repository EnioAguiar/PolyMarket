# Research Signal System — Design Spec

**Date:** 2026-09-22
**Status:** Approved in chat by the project owner (architecture presented, clarifying questions answered, operational flow confirmed) — written directly per this session's established pattern.
**Sub-project 4** (sub-projects 1-3 — Wallet & Trading Correctness, Infra Resilience, Safety Module Correctness — are complete).

## Goal

Build and validate a research/signal pipeline covering three strategies identified as fitting this bot's scale and existing architecture: sentiment/news-driven signals, tail-end sweep confirmation, and crypto resolution sniping. **This phase validates signal quality against real data — it does not wire any output into live order placement.** The existing trading path (sub-projects 1-3, tested and working) is not touched.

## Background

- The bot's real trading path (`src/websocket/integration.ts`'s `evaluateMarketForWebSocket`) currently has no directional signal at all — it buys YES on any new market that passes liquidity/safety/slippage checks, confirmed by reading the full function this session. Re-enabling `research/`/`ai/` was explicitly deferred earlier this session pending an AI provider decision; that decision is now made (see below).
- **TypeSafe/Jev is funded and live.** The project owner logged into TypeSafe via `omp` and has $10 of credit. The API key is stored locally by that login flow in `~/.omp/agent/agent.db`'s `auth_credentials` table (`provider='typesafe'`, `credential_type='api_key'`, JSON `data` column with a `key` field) — a plain portable bearer token, not an OAuth session scoped to the omp harness. Extracted directly into `polymarket/.env` as `TYPESAFE_API_KEY` this session (never printed to chat) and verified with a real `POST https://api.typesafe.ai/v1/systemone` call using model `jev-1.13.0`, which returned a real `noul` probability judgment. This key is the bot's own, independent of any omp-side session — the standalone Node process can call `api.typesafe.ai` directly.
- **Existing broken/paid research sources are not part of this phase**: `NEWSDATA_API_KEY`, `GOOGLE_API_KEY`/`GOOGLE_SEARCH_ENGINE_ID`, `REDDIT_CLIENT_ID`/`SECRET`, and `TWITTER_BEARER_TOKEN` (confirmed dead this session — live test against `/2/tweets/search/recent` returned 403, the app isn't attached to a Project under X's current API requirements) are all either unconfigured, paid, or dead. This phase does not fix or fund them.
- **Google News RSS** (`https://news.google.com/rss/search?q=<query>&hl=en-US&gl=US&ceid=US:en`) is confirmed free, keyless, and current (verified live this session, and Google's own product documentation/third-party sources confirm it remains functional in 2026 despite being undocumented). Used as the search/discovery layer for the sentiment strategy.
- **crawl4ai** (already a Python dependency this project shells out to via `child_process.spawn`, see `src/research/crawl4ai.ts`) is confirmed to have LLM-free extraction (`JsonCssExtractionStrategy`/`RegexExtractionStrategy`, or plain markdown conversion) — used here only to fetch full article text for URLs discovered by the RSS search, not to search itself (crawl4ai has no search capability, confirmed this session by direct research: it crawls known URLs, it does not discover them).
- **Binance's public data is confirmed free and unauthenticated**: the existing `wss://stream.binance.com:9443/ws/<symbol>@ticker` raw stream (used today in `src/research/binance.ts`) for live price, and the **Top Trader Long/Short Ratio** REST endpoints (`/futures/data/topLongShortPositionRatio`, `/futures/data/topLongShortAccountRatio` on the USDⓈ-M Futures API) for "what are the biggest accounts doing" sentiment — both confirmed free/public this session, not yet used anywhere in this codebase.
- Polymarket's Gamma API (`https://gamma-api.polymarket.com/markets`) returns `outcomes` (JSON array of outcome labels, e.g. `["Over","Under"]` or `["Yes","No"]`) and `outcomePrices` (parallel JSON array of `"1"`/`"0"` strings marking the winner) for closed/resolved markets — confirmed live this session by fetching a real resolved market. This is the ground truth the backtest (see Testing) needs.
- Three strategies were selected out of a broader landscape (researched this session: cross-platform/intra-market arbitrage, market-making, copy-trading, tail-end sweep, resolution sniping, sentiment/news) as fitting this bot's small bankroll (~$2.26 pUSD) and existing architecture — arbitrage/market-making/copy-trading were explicitly excluded (need sub-100ms execution or dedicated capital this project doesn't have and isn't built for).

## Non-Goals

- Wiring any of this phase's output into `evaluateMarketForWebSocket` or any other real order-placement path. That is a distinct, later decision (a sub-project 5, only after this phase's validation results are reviewed).
- Fixing or funding NewsData.io, Google Custom Search, Reddit, or Twitter/X as sources. Google News RSS replaces their intended role for this phase.
- Cross-platform arbitrage, market-making, or copy-trading strategies (out of scope per Background).
- A UI or dashboard for validation results — plain structured log output (JSON lines or a summary table printed to console) is sufficient for a human to review.
- Building a persistent database of research results. Validation runs are one-shot scripts; their output is read directly, not stored for later querying.
- Rate-limit hardening or production-grade retry logic for the new sources — this is a validation phase against a small, controlled sample of markets, not sustained production traffic. Sub-project 5 (if this phase validates well) would revisit this for production wiring.

## Design

### 1. Market classification

**File:** new `src/research/classify.ts`

Given a `Market` (from `src/api/polymarket.ts`, already has `question`, `resolveDate`, etc.), classify which strategy applies:

```typescript
export type MarketStrategy = 'resolution_sniping' | 'tail_end' | 'sentiment' | 'none';

export function classifyMarket(market: Market, midPrice: number | null): MarketStrategy {
  if (isCryptoThresholdQuestion(market.question)) return 'resolution_sniping';
  if (midPrice !== null && (midPrice >= 0.97 || midPrice <= 0.03)) return 'tail_end';
  if (midPrice !== null) return 'sentiment';
  return 'none'; // no orderbook data available to classify by price
}
```

`isCryptoThresholdQuestion` is a regex-based classifier (not an LLM call — this is a cheap, deterministic pre-filter before any paid/rate-limited research call): matches patterns like `/\b(BTC|Bitcoin|ETH|Ethereum)\b.*\$[\d,]+/i` combined with a comparison word (`above`, `below`, `reach`, `hit`, `exceed`, `over`, `under`). Extract the symbol (`BTC`→`btcusdt`, `ETH`→`ethusdt`) and the numeric threshold via a second regex pass. If extraction fails (ambiguous question), fall back to `midPrice`-based classification instead of guessing — a market misclassified as `sentiment` gets the (cheaper, less risky) generic path rather than a wrong price comparison.

### 2. Google News RSS source

**File:** new `src/research/sources/google-news-rss.ts`

```typescript
export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export async function searchGoogleNewsRss(query: string, maxResults = 10): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Google News RSS error: ${response.status}`);
  const xml = await response.text();
  return parseRssItems(xml).slice(0, maxResults);
}
```

`parseRssItems` is a minimal XML/RSS parser extracting `<item><title>`, `<link>`, `<pubDate>`, and the `<source>` tag from each `<item>` — use a small, focused regex-or-DOMParser-based extraction (no new heavy XML dependency; check `package.json` for an existing XML/RSS parsing library before adding one — if `xml2js` or similar is already a transitive dependency usable directly, prefer it over hand-rolled regex parsing of XML, which is fragile; if nothing suitable exists, a minimal regex extraction limited to these 4 well-known Google News RSS tag shapes is acceptable given the narrow, stable input format).

### 3. Article fetching via crawl4ai (no LLM)

**File:** modify `src/research/crawl4ai.ts` (or add a new focused function alongside the existing `Crawl4AIWebAdapter` class — read the existing file in full first; it currently hardcodes a topic→URL keyword table for a different purpose (§ Background) and this is a distinct use: fetching a specific, already-known URL from RSS results, not guessing one from a topic).

Add `export async function fetchArticleText(url: string): Promise<string>` that shells out to the same crawl4ai Python invocation pattern already used in this file (`spawn`), fetching a given URL and returning clean markdown/text (no LLM extraction strategy — plain page-to-markdown conversion is sufficient for a Jev judgment; Jev itself does the semantic work, not crawl4ai). Reuse the existing timeout/error-handling pattern in this file exactly rather than inventing a new one.

### 4. Jev client

**File:** new `src/ai/jev.ts`, replacing `src/ai/minimax.ts` as the judgment layer for this phase (do not delete `minimax.ts` in this phase — it is unused/orphaned already since `research`/`ai` are disconnected from the trading path per Background; deleting dead code unrelated to this feature is out of scope here, though it is a legitimate future cleanup item to note in the final README update).

```typescript
export interface JevNoulResult {
  probability: number; // 0-1
  confidence: number;  // 0-1, from Jev's own confidence field
}

export async function judgeNoul(state: string, instructions: string): Promise<JevNoulResult> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) throw new Error('TYPESAFE_API_KEY environment variable is required');

  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'jev-latest',
      state,
      questions: { judgment: { type: 'noul', instructions } },
    }),
  });
  if (!response.ok) throw new Error(`TypeSafe API error: ${response.status} ${await response.text()}`);
  const data = await response.json();
  // Confirm the exact response shape against a live call before finalizing this parse —
  // this session's manual curl test returned {"answers":{"bullish":{"type":"noul","noul":0.6}}}
  // for a single custom question key; adapt the field access below to match exactly.
  const answer = data.answers.judgment;
  return { probability: answer.noul, confidence: answer.confidence ?? 1 };
}
```

Note for the implementer: this session's live verification used a custom question key (`bullish`) rather than a fixed `judgment` key — confirm the real response's exact shape with one more live call during implementation (cheap, ~$0.00004/call) rather than trusting this spec's guess verbatim.

### 5. Sentiment strategy

**File:** new `src/research/strategies/sentiment.ts`

```typescript
export interface SentimentSignal {
  strategy: 'sentiment';
  marketId: string;
  question: string;
  articlesFound: number;
  probability: number; // Jev's judgment, aggregated across articles
  confidence: number;
  articles: { title: string; link: string; probability: number }[];
}

export async function evaluateSentiment(market: Market): Promise<SentimentSignal> {
  const articles = await searchGoogleNewsRss(market.question, 5);
  const judged = await Promise.all(
    articles.map(async (a) => {
      const text = await fetchArticleText(a.link).catch(() => a.title); // fall back to headline if full fetch fails
      const result = await judgeNoul(
        `Market question: "${market.question}"\n\nNews article: "${a.title}"\n\n${text}`,
        `Does this news article suggest the answer to the market question is YES?`
      );
      return { title: a.title, link: a.link, probability: result.probability };
    })
  );
  const avgProbability = judged.reduce((s, j) => s + j.probability, 0) / (judged.length || 1);
  return {
    strategy: 'sentiment',
    marketId: market.id,
    question: market.question,
    articlesFound: articles.length,
    probability: avgProbability,
    confidence: judged.length >= 3 ? 0.7 : 0.3, // low confidence with too few articles, not a Jev field
    articles: judged,
  };
}
```

### 6. Tail-end sweep strategy (with research confirmation, per the project owner's answer)

**File:** new `src/research/strategies/tail-end.ts`

```typescript
export interface TailEndSignal {
  strategy: 'tail_end';
  marketId: string;
  marketPrice: number;
  confirmed: boolean; // did research corroborate the near-certain outcome?
  confirmationProbability: number;
}

export async function evaluateTailEnd(market: Market, midPrice: number): Promise<TailEndSignal> {
  const impliedOutcome = midPrice >= 0.97 ? 'YES' : 'NO';
  const articles = await searchGoogleNewsRss(market.question, 3);
  const text = articles.map((a) => a.title).join('. ') || 'No recent news found.';
  const result = await judgeNoul(
    `Market question: "${market.question}"\nCurrent market price implies ${impliedOutcome} at ${(midPrice * 100).toFixed(1)}%.\nRecent headlines: ${text}`,
    `Does available evidence confirm the real-world event behind this question has already effectively happened, matching the market's implied ${impliedOutcome} outcome?`
  );
  return {
    strategy: 'tail_end',
    marketId: market.id,
    marketPrice: midPrice,
    confirmed: result.probability >= 0.7,
    confirmationProbability: result.probability,
  };
}
```

### 7. Resolution sniping strategy (crypto)

**File:** new `src/research/strategies/resolution-sniping.ts`

```typescript
export interface ResolutionSnipingSignal {
  strategy: 'resolution_sniping';
  marketId: string;
  symbol: string;
  threshold: number;
  livePrice: number;
  marketImpliesAbove: boolean; // what the market's current mid-price suggests
  realityIsAbove: boolean;     // what the live Binance price says
  mispriced: boolean;          // do they disagree?
}

export async function evaluateResolutionSniping(
  market: Market,
  midPrice: number,
  symbol: string,
  threshold: number
): Promise<ResolutionSnipingSignal> {
  const livePrice = await fetchBinancePrice(symbol); // new small helper, wraps the existing binance.ts ticker fetch or a lighter /api/v3/ticker/price REST call
  const realityIsAbove = livePrice >= threshold;
  const marketImpliesAbove = midPrice >= 0.5;
  return {
    strategy: 'resolution_sniping',
    marketId: market.id,
    symbol,
    threshold,
    livePrice,
    marketImpliesAbove,
    realityIsAbove,
    mispriced: marketImpliesAbove !== realityIsAbove,
  };
}
```

`fetchBinancePrice`: use Binance's simple public REST endpoint `GET https://api.binance.com/api/v3/ticker/price?symbol=<SYMBOL>` (a single JSON `{symbol, price}` response) rather than opening a new WebSocket per check — cheaper and simpler for a one-shot validation script. This is a different, equally public/keyless endpoint than the existing `binance.ts`'s WebSocket ticker stream; add it as a small new function rather than repurposing the WebSocket-based class.

### 8. Validation script — the actual deliverable for this phase

**File:** new `scripts/validate-research.ts`

Two runs, per the project owner's requirement to measure real accuracy, not just plausibility:

**Run A — live open markets** (qualitative spot-check):
1. `fetchMarkets({ active: true, closed: false, limit: 30 })`.
2. For each market: fetch its orderbook mid-price (reuse `src/api/clob.ts`'s `getOrderBook`/`getMidPrice` — read-only, no order placement), classify via `classifyMarket`, run the matching strategy function.
3. Print a structured summary table (market question truncated, strategy used, signal result, one-line reasoning) to console — human-reviewable, not stored.

**Run B — backtest against resolved markets** (quantitative accuracy):
1. `fetchMarkets({ active: false, closed: true, limit: 30 })` — the Gamma API's raw response includes `outcomes` and `outcomePrices` (confirmed this session); `src/api/polymarket.ts`'s `fetchMarkets` mapper currently does NOT surface these two fields on its `Market` return type — extend the `Market` type and this mapper to include `outcomes: string[]` and `outcomePrices: number[]`, parsed from the raw JSON string fields the same way `clobTokenIds` is already parsed.
2. For each resolved market, determine the real winning outcome from `outcomePrices` (index of `"1"` in the array, mapped through `outcomes`).
3. Run only the `sentiment` and `tail_end` strategies against these (resolution sniping's "live price" input is meaningless for a market that already resolved in the past — explicitly skip it for Run B, note this limitation in the script's output rather than fabricating a comparison). Feed the strategy functions the market's `question` only — do not feed them the known resolution, obviously.
4. Compare each strategy's predicted probability (rounded to a YES/NO call at the 0.5 threshold) against the real winning outcome. Print a hit-rate summary: `sentiment: N/M correct`, `tail_end: N/M correct` (only counting markets tail_end actually classified as tail-end — most resolved markets won't qualify, that's expected and fine, report the count that did).

Both runs are manual (`npx tsx scripts/validate-research.ts`), not part of `npm test` or CI — this is a one-time (or occasionally re-run) human-reviewed validation, not a permanent regression suite (Non-Goals).

## Testing

- No unit tests for the strategy functions' judgment quality — that's what the validation script measures, and Jev's probability output isn't a deterministic assertion target.
- Unit test `classifyMarket`'s regex-based crypto-question detection and threshold extraction — this IS deterministic and easy to get subtly wrong (e.g. "Bitcoin" vs "BTC", `$70,000` vs `$70k` formatting). Cover a handful of real-looking question strings.
- Unit test the Gamma API response parsing for `outcomes`/`outcomePrices` (Run B's ground truth) against the real shape captured this session.
- `google-news-rss.ts`'s RSS parsing: unit test against a captured real response sample (save one real response as a fixture during implementation, don't invent one).
- Manual verification: run both validation script modes for real, read the output, and report to the project owner rather than assuming success from a clean exit code.

## Success Criteria

- [ ] `TYPESAFE_API_KEY` is in `.env`, `src/ai/jev.ts`'s `judgeNoul` makes a real call and returns a valid `{probability, confidence}`.
- [ ] `google-news-rss.ts` returns real articles for a real query, verified live.
- [ ] `crawl4ai.ts`'s new `fetchArticleText` returns clean text for a real URL, verified live.
- [ ] `classifyMarket` correctly routes at least one real example of each strategy type (manually curated examples acceptable if live markets of each type aren't all available at test time).
- [ ] `resolution-sniping.ts` correctly compares a real Binance price against a real market's implied price for at least one live crypto-threshold market.
- [ ] Run A (live markets) produces a human-readable table for ≥20 real current markets.
- [ ] Run B (backtest) produces a real hit-rate number (not zero markets classified) for at least the `sentiment` strategy against resolved markets.
- [ ] No change to `src/websocket/integration.ts`, `src/index.ts`'s trading path, or any file touched by sub-projects 1-3's safety-critical logic.
- [ ] `npm run build && npx vitest run` passes (existing 42 tests unaffected, new unit tests from Testing section added and passing).
