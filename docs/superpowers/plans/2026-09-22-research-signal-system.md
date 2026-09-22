# Research Signal System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate a research/signal pipeline covering three strategies (sentiment/news, tail-end sweep, crypto resolution sniping) against real Polymarket data, using TypeSafe's Jev for judgment and Google News RSS + crawl4ai for research. Validation only — no output is wired into real order placement.

**Architecture:** Classify each market by a cheap deterministic pre-filter (crypto-threshold regex, then price-based). Each strategy fetches its own evidence (news via RSS+crawl4ai, or live Binance price) and calls a shared Jev client for the semantic judgment. A validation script runs the pipeline against real live markets (qualitative) and real resolved markets (quantitative hit-rate against known ground truth).

**Tech Stack:** TypeScript, native `fetch`, TypeSafe System One API (`api.typesafe.ai`), existing `crawl4ai` Python subprocess pattern, Binance public REST/WS.

**Spec:** `docs/superpowers/specs/2026-09-22-research-signal-system-design.md`

## Global Constraints

- This phase does NOT modify `src/websocket/integration.ts`, `src/index.ts`'s trading path, or any file touched by sub-projects 1-3's safety-critical logic. Every task in this plan only adds new files or extends read-only data-fetching (`src/api/polymarket.ts`'s `Market` type/`fetchMarkets` mapper).
- `TYPESAFE_API_KEY` is already in `.env` (extracted and verified working this session — do not re-verify by reading `.env`'s raw contents; a script reading `process.env.TYPESAFE_API_KEY` internally is fine, printing the key's value is not).
- Jev's exact response shape for a custom question key MUST be confirmed with one live call during Task 4 (the spec's draft parse is a best guess from a differently-shaped test call) — this is cheap (~$0.00004/call), do it before finalizing the parser.
- Google News RSS (`https://news.google.com/rss/search?q=...`) and Binance's public REST/WS endpoints require no API key and no `.env` changes beyond what's already there.
- **`searchGoogleNewsRss` and `evaluateSentiment` MUST support and correctly apply a `before` date cutoff (Tasks 2 and 5) — this is not optional polish.** Without it, Task 8's Run B backtest would search Google News *today* for a market that already resolved and retrieve articles reporting the outcome itself, making the "prediction" meaningless (near-100% hit-rate that proves nothing). Enforce the cutoff two ways: a `before:YYYY-MM-DD` query operator AND a defensive client-side filter dropping any item whose own `pubDate` is on/after the cutoff. Task 2's tests MUST prove the client-side filter actually drops late items (not just that the query string contains the operator).
- No new heavy dependency for RSS/XML parsing without first checking `package.json` for an already-available transitive one; a narrow regex-based extraction of the 4 known Google News RSS tags is acceptable if nothing suitable exists.
- No new test framework or mocking beyond plain Vitest, matching this project's existing convention.
- Manual/live verification steps should prefer read-only calls; none of this plan's tasks place any order or spend any pUSD.

---

### Task 1: Market classification and resolved-market ground truth

**Files:**
- Create: `src/research/classify.ts`
- Modify: `src/api/polymarket.ts` (extend `Market` type + `fetchMarkets` mapper with `outcomes`/`outcomePrices`)
- Modify: `src/types/index.ts` (extend `Market` interface)
- Test: `tests/research-classify.test.ts`

**Interfaces:**
- Produces: `export type MarketStrategy = 'resolution_sniping' | 'tail_end' | 'sentiment' | 'none';`, `export function classifyMarket(market: Market, midPrice: number | null): MarketStrategy`, `export interface CryptoThreshold { symbol: string; threshold: number }`, `export function extractCryptoThreshold(question: string): CryptoThreshold | null`.
- `Market` type gains `outcomes: string[]` and `outcomePrices: number[]` (both empty arrays for open markets where the API doesn't yet report them).

- [ ] **Step 1: Read `src/types/index.ts`'s current `Market` interface and `src/api/polymarket.ts`'s current `fetchMarkets` in full**

Confirm current field names/shapes before editing — this plan was written against the versions read this session.

- [ ] **Step 2: Extend the `Market` type**

In `src/types/index.ts`, add two fields to the `Market` interface:
```typescript
outcomes: string[];
outcomePrices: number[];
```

- [ ] **Step 3: Extend `fetchMarkets`'s mapper in `src/api/polymarket.ts`**

The raw Gamma API response has `outcomes` and `outcomePrices` as JSON-encoded strings (e.g. `"[\"Yes\",\"No\"]"` and `"[\"1\",\"0\"]"`), the same pattern already handled for `clobTokenIds`. Add to the `.map(raw => ({ ... }))` object:
```typescript
outcomes: raw.outcomes ? JSON.parse(raw.outcomes) : [],
outcomePrices: raw.outcomePrices ? JSON.parse(raw.outcomePrices).map(Number) : [],
```

- [ ] **Step 4: Write the failing test for `extractCryptoThreshold`**

Create `tests/research-classify.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { classifyMarket, extractCryptoThreshold } from '../src/research/classify.js';
import type { Market } from '../src/types/index.js';

function makeMarket(question: string, overrides: Partial<Market> = {}): Market {
  return {
    id: 'm1',
    question,
    slug: 'm1',
    categories: [],
    clobTokenIds: [],
    active: true,
    closed: false,
    resolveDate: undefined,
    outcomes: [],
    outcomePrices: [],
    ...overrides,
  };
}

describe('extractCryptoThreshold', () => {
  it('extracts BTC and a dollar threshold from "above" phrasing', () => {
    const result = extractCryptoThreshold('Will Bitcoin be above $70,000 on December 31?');
    expect(result).toEqual({ symbol: 'btcusdt', threshold: 70000 });
  });

  it('extracts ETH and a threshold from "reach" phrasing', () => {
    const result = extractCryptoThreshold('Will Ethereum reach $5000 by end of year?');
    expect(result).toEqual({ symbol: 'ethusdt', threshold: 5000 });
  });

  it('returns null for a non-crypto-threshold question', () => {
    expect(extractCryptoThreshold('Will the Fed raise rates in October?')).toBeNull();
  });

  it('returns null for a crypto question with no numeric threshold', () => {
    expect(extractCryptoThreshold('Will Bitcoin go up this week?')).toBeNull();
  });
});

describe('classifyMarket', () => {
  it('classifies a crypto-threshold question as resolution_sniping regardless of price', () => {
    const market = makeMarket('Will Bitcoin be above $70,000 on December 31?');
    expect(classifyMarket(market, 0.5)).toBe('resolution_sniping');
  });

  it('classifies a high-price non-crypto market as tail_end', () => {
    const market = makeMarket('Will the incumbent win re-election?');
    expect(classifyMarket(market, 0.98)).toBe('tail_end');
  });

  it('classifies a low-price non-crypto market as tail_end', () => {
    const market = makeMarket('Will a third party candidate win?');
    expect(classifyMarket(market, 0.02)).toBe('tail_end');
  });

  it('classifies a mid-price non-crypto market as sentiment', () => {
    const market = makeMarket('Will the merger be approved?');
    expect(classifyMarket(market, 0.5)).toBe('sentiment');
  });

  it('classifies as none when midPrice is unavailable', () => {
    const market = makeMarket('Will the merger be approved?');
    expect(classifyMarket(market, null)).toBe('none');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run tests/research-classify.test.ts`
Expected: FAIL — `src/research/classify.ts` does not exist yet.

- [ ] **Step 6: Implement `src/research/classify.ts`**

```typescript
import type { Market } from '../types/index.js';

export type MarketStrategy = 'resolution_sniping' | 'tail_end' | 'sentiment' | 'none';

export interface CryptoThreshold {
  symbol: string;
  threshold: number;
}

const SYMBOL_MAP: Record<string, string> = {
  bitcoin: 'btcusdt',
  btc: 'btcusdt',
  ethereum: 'ethusdt',
  eth: 'ethusdt',
};

const COMPARISON_WORDS = /\b(above|below|over|under|exceed|reach|hit|surpass)\b/i;
const SYMBOL_PATTERN = /\b(bitcoin|btc|ethereum|eth)\b/i;
const THRESHOLD_PATTERN = /\$\s*([\d,]+(?:\.\d+)?)/;

export function extractCryptoThreshold(question: string): CryptoThreshold | null {
  const symbolMatch = question.match(SYMBOL_PATTERN);
  const comparisonMatch = question.match(COMPARISON_WORDS);
  const thresholdMatch = question.match(THRESHOLD_PATTERN);

  if (!symbolMatch || !comparisonMatch || !thresholdMatch) return null;

  const symbol = SYMBOL_MAP[symbolMatch[1].toLowerCase()];
  const threshold = Number(thresholdMatch[1].replace(/,/g, ''));
  if (!symbol || Number.isNaN(threshold)) return null;

  return { symbol, threshold };
}

export function classifyMarket(market: Market, midPrice: number | null): MarketStrategy {
  if (extractCryptoThreshold(market.question)) return 'resolution_sniping';
  if (midPrice === null) return 'none';
  if (midPrice >= 0.97 || midPrice <= 0.03) return 'tail_end';
  return 'sentiment';
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run tests/research-classify.test.ts`
Expected: PASS, all 9 tests.

- [ ] **Step 8: Run the full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build passes, all tests pass (42 pre-existing + 9 new = 51).

- [ ] **Step 9: Commit**

```bash
git add src/research/classify.ts src/api/polymarket.ts src/types/index.ts tests/research-classify.test.ts
git commit -m "feat(research): add market classification and resolved-market outcome fields

classifyMarket() routes a market to resolution_sniping (crypto price
threshold questions), tail_end (price already near 0 or 1), sentiment
(everything else with a known price), or none (no price data). Market
type extended with outcomes/outcomePrices, parsed from Gamma API's
closed-market response, needed for Task 8's backtest ground truth."
```

---

### Task 2: Google News RSS source

**Files:**
- Create: `src/research/sources/google-news-rss.ts`
- Test: `tests/google-news-rss.test.ts`

**Interfaces:**
- Produces: `export interface NewsArticle { title: string; link: string; pubDate: string; source: string }`, `export interface SearchOptions { maxResults?: number; before?: Date }`, `export async function searchGoogleNewsRss(query: string, opts?: SearchOptions): Promise<NewsArticle[]>`.

- [ ] **Step 1: Fetch one real Google News RSS response to use as a test fixture**

Run this manually (not part of the test suite) to capture real XML:
```bash
curl -s "https://news.google.com/rss/search?q=bitcoin&hl=en-US&gl=US&ceid=US:en" -o /tmp/google-news-sample.xml
```
Read `/tmp/google-news-sample.xml` to confirm the exact tag shapes (`<item><title>`, `<link>`, `<pubDate>`, `<source url="...">SourceName</source>`) before writing the parser and test fixture in the next steps. Google News RSS titles are typically formatted as `"Article Title - Source Name"` with the source repeated in the dedicated `<source>` tag — use the dedicated tag, don't try to split the title string.

- [ ] **Step 2: Write the failing test using a captured real fixture**

Create `tests/google-news-rss.test.ts`. Inline a trimmed real fixture (3-4 `<item>` entries) captured from Step 1 — do not invent one:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { searchGoogleNewsRss } from '../src/research/sources/google-news-rss.js';

const SAMPLE_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>"bitcoin" - Google News</title>
<item>
<title>Bitcoin surges past key resistance - Example News</title>
<link>https://example.com/article1</link>
<pubDate>Mon, 22 Sep 2026 10:00:00 GMT</pubDate>
<source url="https://example.com">Example News</source>
</item>
<item>
<title>Analysts split on Bitcoin outlook - Crypto Daily</title>
<link>https://example.com/article2</link>
<pubDate>Mon, 22 Sep 2026 08:00:00 GMT</pubDate>
<source url="https://cryptodaily.example">Crypto Daily</source>
</item>
</channel>
</rss>`;

// Fixture spanning a date boundary, for the leakage-prevention test: one
// item published before the cutoff, one on/after it.
const DATED_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>"example market" - Google News</title>
<item>
<title>Pre-resolution speculation piece - Example News</title>
<link>https://example.com/before</link>
<pubDate>Mon, 01 Sep 2026 10:00:00 GMT</pubDate>
<source url="https://example.com">Example News</source>
</item>
<item>
<title>Market resolved, here is what happened - Example News</title>
<link>https://example.com/after</link>
<pubDate>Mon, 15 Sep 2026 10:00:00 GMT</pubDate>
<source url="https://example.com">Example News</source>
</item>
</channel>
</rss>`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('searchGoogleNewsRss', () => {
  it('parses real RSS item fields into NewsArticle objects', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_RSS,
    } as Response);

    const articles = await searchGoogleNewsRss('bitcoin');

    expect(articles).toHaveLength(2);
    expect(articles[0]).toEqual({
      title: 'Bitcoin surges past key resistance - Example News',
      link: 'https://example.com/article1',
      pubDate: 'Mon, 22 Sep 2026 10:00:00 GMT',
      source: 'Example News',
    });
  });

  it('respects maxResults', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => SAMPLE_RSS,
    } as Response);

    const articles = await searchGoogleNewsRss('bitcoin', { maxResults: 1 });
    expect(articles).toHaveLength(1);
  });

  it('throws on a non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(searchGoogleNewsRss('bitcoin')).rejects.toThrow('429');
  });

  it('appends a before: operator to the query when opts.before is set', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => DATED_RSS,
    } as Response);

    await searchGoogleNewsRss('example market', { before: new Date('2026-09-10T00:00:00Z') });

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(calledUrl)).toContain('before:2026-09-10');
  });

  it('drops items whose pubDate is on/after the before cutoff (leakage prevention)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => DATED_RSS,
    } as Response);

    const articles = await searchGoogleNewsRss('example market', {
      before: new Date('2026-09-10T00:00:00Z'),
    });

    expect(articles).toHaveLength(1);
    expect(articles[0].link).toBe('https://example.com/before');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/google-news-rss.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement `src/research/sources/google-news-rss.ts`**

```typescript
export interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface SearchOptions {
  maxResults?: number;
  before?: Date; // exclude articles published on/after this date
}

export async function searchGoogleNewsRss(query: string, opts: SearchOptions = {}): Promise<NewsArticle[]> {
  const maxResults = opts.maxResults ?? 10;
  let searchQuery = query;
  if (opts.before) {
    searchQuery += ` before:${opts.before.toISOString().split('T')[0]}`;
  }
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google News RSS error: ${response.status}`);
  }
  const xml = await response.text();
  let articles = parseRssItems(xml);
  if (opts.before) {
    // Defensive second layer: Google's before: operator is a query hint,
    // not something this project controls or can fully trust server-side.
    const cutoff = opts.before;
    articles = articles.filter((a) => {
      const pubDate = new Date(a.pubDate);
      return Number.isNaN(pubDate.getTime()) ? true : pubDate < cutoff;
    });
  }
  return articles.slice(0, maxResults);
}

function parseRssItems(xml: string): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  for (const block of itemBlocks) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const source = extractSourceTag(block);
    if (title && link) {
      items.push({ title, link, pubDate: pubDate || '', source: source || '' });
    }
  }

  return items;
}

function extractTag(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return null;
  return decodeXmlEntities(match[1].trim());
}

function extractSourceTag(block: string): string | null {
  const match = block.match(/<source[^>]*>([\s\S]*?)<\/source>/);
  if (!match) return null;
  return decodeXmlEntities(match[1].trim());
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
```

Adjust the exact tag-extraction regexes if Step 1's real captured sample differs from the assumed shape (e.g. if titles are wrapped in `<![CDATA[...]]>`, which Google News RSS commonly does — the `decodeXmlEntities` function above already strips CDATA wrappers; confirm this against the real fixture, don't assume). **The `before` filtering (query operator + defensive client-side filter) is required, not optional** — it is what prevents Task 8's Run B backtest from leaking post-resolution news into a pre-resolution prediction (see plan Global Constraints and spec §2/§5).


- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/google-news-rss.test.ts`
Expected: PASS, all 6 tests (3 original + before-operator test + leakage-drop test — see Step 2's updated fixture set).

- [ ] **Step 6: Manual live verification, including the date filter**

Run a throwaway script (delete after, do not commit) that calls `searchGoogleNewsRss('bitcoin price')` for real and prints the first 2 results' titles and links. Confirm real, relevant articles come back — not empty results or parse garbage. Also call it once with `{ before: new Date('2020-01-01') }` for a query certain to have recent coverage (e.g. `'bitcoin'`) and confirm the result set is empty or clearly older than 2020 — proving the date filter actually suppresses recent results, not just that it doesn't crash.


- [ ] **Step 7: Run the full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build passes, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/research/sources/google-news-rss.ts tests/google-news-rss.test.ts
git commit -m "feat(research): add Google News RSS source, free keyless news search

Confirmed live and working this session: no API key, no rate-limit
issues observed, replaces the role NewsData.io/Google Custom Search
would have played (both dead/paid, see spec background)."
```

---

### Task 3: Article text fetching via crawl4ai

**Files:**
- Modify: `src/research/crawl4ai.ts`
- Test: `tests/crawl4ai-fetch-article.test.ts`

**Interfaces:**
- Produces: `export async function fetchArticleText(url: string): Promise<string>` from `src/research/crawl4ai.ts`.

- [ ] **Step 1: Read `src/research/crawl4ai.ts` in full**

Confirm the exact `spawn` invocation pattern, timeout handling, and error handling this file already uses for `Crawl4AIWebAdapter.fetch()` — the new function must reuse this pattern exactly, not invent a new subprocess pattern.

- [ ] **Step 2: Write the failing test**

Create `tests/crawl4ai-fetch-article.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { fetchArticleText } from '../src/research/crawl4ai.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchArticleText', () => {
  it('returns the markdown text from a successful crawl', async () => {
    const { spawn } = await import('node:child_process');
    const fakeProcess = new EventEmitter() as any;
    fakeProcess.stdout = new EventEmitter();
    fakeProcess.stderr = new EventEmitter();
    (spawn as any).mockReturnValue(fakeProcess);

    const resultPromise = fetchArticleText('https://example.com/article');

    fakeProcess.stdout.emit('data', Buffer.from(JSON.stringify({ markdown: 'Article body text.' })));
    fakeProcess.emit('close', 0);

    const text = await resultPromise;
    expect(text).toBe('Article body text.');
  });

  it('rejects when the subprocess exits non-zero', async () => {
    const { spawn } = await import('node:child_process');
    const fakeProcess = new EventEmitter() as any;
    fakeProcess.stdout = new EventEmitter();
    fakeProcess.stderr = new EventEmitter();
    (spawn as any).mockReturnValue(fakeProcess);

    const resultPromise = fetchArticleText('https://example.com/broken');
    fakeProcess.stderr.emit('data', Buffer.from('crawl failed'));
    fakeProcess.emit('close', 1);

    await expect(resultPromise).rejects.toThrow();
  });
});
```

Adjust the mock shape to match exactly what Step 1 found `Crawl4AIWebAdapter.fetch()` actually does (its JSON output field names, its spawn arguments) — this test's mock must reflect the REAL subprocess contract, not an assumed one.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/crawl4ai-fetch-article.test.ts`
Expected: FAIL — `fetchArticleText` does not exist yet.

- [ ] **Step 4: Implement `fetchArticleText` in `src/research/crawl4ai.ts`**

Add this function to the existing file, reusing the exact `spawn`/timeout/JSON-parsing pattern already present in `Crawl4AIWebAdapter.fetch()` (read Step 1's findings and mirror it precisely — do not guess at a different invocation shape):

```typescript
export async function fetchArticleText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('fetchArticleText timeout'));
    }, 30000);

    // Mirror the exact spawn arguments and script invocation already used by
    // Crawl4AIWebAdapter.fetch() in this same file — adjust below to match
    // exactly what Step 1 found, this is a starting shape:
    const child = spawn('python3', ['-c', `
import asyncio, json, sys
from crawl4ai import AsyncWebCrawler

async def main():
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url="${url}")
        print(json.dumps({"markdown": result.markdown[:5000]}))

asyncio.run(main())
`]);

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(`fetchArticleText failed: ${stderr}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed.markdown || '');
      } catch (error) {
        reject(error);
      }
    });
  });
}
```

Import `spawn` from `node:child_process` if not already imported in this file (it already is, per `Crawl4AIWebAdapter.fetch()` — reuse the existing import, do not duplicate).

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/crawl4ai-fetch-article.test.ts`
Expected: PASS, both tests.

- [ ] **Step 6: Manual live verification**

Run a throwaway script (delete after, do not commit) calling `fetchArticleText('https://en.wikipedia.org/wiki/Bitcoin')` (a stable, always-available real page) and print the first 200 characters of the result. Confirm real article text comes back, not an error or empty string.

- [ ] **Step 7: Run the full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build passes, all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/research/crawl4ai.ts tests/crawl4ai-fetch-article.test.ts
git commit -m "feat(research): add fetchArticleText, LLM-free article extraction via crawl4ai

Reuses this project's existing crawl4ai subprocess pattern. No LLM
extraction strategy — plain markdown conversion, since Jev (not
crawl4ai) does the semantic judgment downstream."
```

---

### Task 4: Jev client

**Files:**
- Create: `src/ai/jev.ts`
- Test: `tests/jev.test.ts`

**Interfaces:**
- Produces: `export interface JevNoulResult { probability: number; confidence: number }`, `export async function judgeNoul(state: string, instructions: string): Promise<JevNoulResult>`.

- [ ] **Step 1: Confirm Jev's real response shape with one live call**

Run this manually first (uses real credit, ~$0.00004):
```bash
cd /home/enio/Projetos/polymarket && bash -c '
set -a; source .env; set +a
curl -s https://api.typesafe.ai/v1/systemone \
  -H "Authorization: Bearer $TYPESAFE_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"model\":\"jev-latest\",\"state\":\"Test state.\",\"questions\":{\"judgment\":{\"type\":\"noul\",\"instructions\":\"Is this a test?\"}}}"
'
```
Read the exact JSON shape returned (field names for the answer, whether a `confidence` field is present per-question or only in a different place) and write the parser in Step 3 to match exactly what this real call returns — do not use the spec's guessed shape unmodified if it differs.

- [ ] **Step 2: Write the failing test**

Create `tests/jev.test.ts`, using the REAL shape confirmed in Step 1 as the mock response (not a guess):
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { judgeNoul } from '../src/ai/jev.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TYPESAFE_API_KEY;
});

describe('judgeNoul', () => {
  it('returns a probability from a successful call', async () => {
    process.env.TYPESAFE_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        // Replace this mock body with the EXACT shape confirmed in Step 1.
        answers: { judgment: { type: 'noul', noul: 0.73 } },
      }),
    } as Response);

    const result = await judgeNoul('Some state', 'Some instructions');
    expect(result.probability).toBe(0.73);
  });

  it('throws when TYPESAFE_API_KEY is not set', async () => {
    delete process.env.TYPESAFE_API_KEY;
    await expect(judgeNoul('state', 'instructions')).rejects.toThrow('TYPESAFE_API_KEY');
  });

  it('throws on a non-ok response', async () => {
    process.env.TYPESAFE_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    } as Response);
    await expect(judgeNoul('state', 'instructions')).rejects.toThrow('401');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run tests/jev.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 4: Implement `src/ai/jev.ts`**

Use the EXACT response shape confirmed in Step 1 for the parsing logic below — adjust `data.answers.judgment.noul` and the confidence field access if the real call returned a different structure:

```typescript
export interface JevNoulResult {
  probability: number;
  confidence: number;
}

export async function judgeNoul(state: string, instructions: string): Promise<JevNoulResult> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('TYPESAFE_API_KEY environment variable is required');
  }

  const response = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'jev-latest',
      state,
      questions: {
        judgment: { type: 'noul', instructions },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TypeSafe API error: ${response.status} ${body}`);
  }

  const data = await response.json();
  const answer = data.answers.judgment;
  return {
    probability: answer.noul,
    confidence: answer.confidence ?? 1,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run tests/jev.test.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 6: Run the full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build passes, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/ai/jev.ts tests/jev.test.ts
git commit -m "feat(ai): add Jev (TypeSafe System One) client, replaces disconnected minimax.ts as judgment layer

judgeNoul() calls POST /v1/systemone with a Noul question, returning a
calibrated probability. Response shape confirmed against a real live
call before finalizing the parser (see task report for the exact
confirmed shape)."
```

---

### Task 5: Sentiment strategy

**Files:**
- Create: `src/research/strategies/sentiment.ts`
- Test: `tests/sentiment-strategy.test.ts`

**Interfaces:**
- Consumes: `searchGoogleNewsRss` (Task 2), `fetchArticleText` (Task 3), `judgeNoul` (Task 4).
- Produces: `export interface SentimentSignal { strategy: 'sentiment'; marketId: string; question: string; articlesFound: number; probability: number; confidence: number; articles: { title: string; link: string; probability: number }[] }`, `export async function evaluateSentiment(market: Market, beforeDate?: Date): Promise<SentimentSignal>`.

- [ ] **Step 1: Write the failing test**

Create `tests/sentiment-strategy.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { evaluateSentiment } from '../src/research/strategies/sentiment.js';
import * as rss from '../src/research/sources/google-news-rss.js';
import * as crawl from '../src/research/crawl4ai.js';
import * as jev from '../src/ai/jev.js';
import type { Market } from '../src/types/index.js';

const market: Market = {
  id: 'm1',
  question: 'Will the merger be approved?',
  slug: 'm1',
  categories: [],
  clobTokenIds: [],
  active: true,
  closed: false,
  resolveDate: undefined,
  outcomes: [],
  outcomePrices: [],
};

describe('evaluateSentiment', () => {
  it('aggregates Jev judgments across found articles', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'Merger looks likely', link: 'https://a.example', pubDate: '', source: '' },
      { title: 'Regulators raise concerns', link: 'https://b.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(crawl, 'fetchArticleText').mockResolvedValue('Full article text.');
    vi.spyOn(jev, 'judgeNoul')
      .mockResolvedValueOnce({ probability: 0.8, confidence: 1 })
      .mockResolvedValueOnce({ probability: 0.3, confidence: 1 });

    const signal = await evaluateSentiment(market);

    expect(signal.strategy).toBe('sentiment');
    expect(signal.articlesFound).toBe(2);
    expect(signal.probability).toBeCloseTo(0.55, 5);
    expect(signal.articles).toHaveLength(2);
  });

  it('falls back to the headline when article fetch fails', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'Headline only', link: 'https://c.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(crawl, 'fetchArticleText').mockRejectedValue(new Error('fetch failed'));
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.6, confidence: 1 });

    const signal = await evaluateSentiment(market);
    expect(signal.articles[0].probability).toBe(0.6);
  });

  it('returns confidence 0.3 with fewer than 3 articles, 0.7 otherwise', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'A', link: 'https://a.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(crawl, 'fetchArticleText').mockResolvedValue('text');
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.5, confidence: 1 });

    const signal = await evaluateSentiment(market);
    expect(signal.confidence).toBe(0.3);
  });

  it('passes beforeDate through to searchGoogleNewsRss for backtest leakage prevention', async () => {
    const rssSpy = vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([]);
    vi.spyOn(crawl, 'fetchArticleText').mockResolvedValue('text');
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.5, confidence: 1 });

    const cutoff = new Date('2026-01-01T00:00:00Z');
    await evaluateSentiment(market, cutoff);

    expect(rssSpy).toHaveBeenCalledWith(market.question, { maxResults: 5, before: cutoff });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/sentiment-strategy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/research/strategies/sentiment.ts`**

```typescript
import type { Market } from '../../types/index.js';
import { searchGoogleNewsRss } from '../sources/google-news-rss.js';
import { fetchArticleText } from '../crawl4ai.js';
import { judgeNoul } from '../../ai/jev.js';

export interface SentimentSignal {
  strategy: 'sentiment';
  marketId: string;
  question: string;
  articlesFound: number;
  probability: number;
  confidence: number;
  articles: { title: string; link: string; probability: number }[];
}

export async function evaluateSentiment(market: Market, beforeDate?: Date): Promise<SentimentSignal> {
  const articles = await searchGoogleNewsRss(market.question, { maxResults: 5, before: beforeDate });

  const judged = await Promise.all(
    articles.map(async (article) => {
      const text = await fetchArticleText(article.link).catch(() => article.title);
      const result = await judgeNoul(
        `Market question: "${market.question}"\n\nNews article: "${article.title}"\n\n${text}`,
        'Does this news article suggest the answer to the market question is YES?'
      );
      return { title: article.title, link: article.link, probability: result.probability };
    })
  );

  const avgProbability =
    judged.length > 0 ? judged.reduce((sum, j) => sum + j.probability, 0) / judged.length : 0.5;

  return {
    strategy: 'sentiment',
    marketId: market.id,
    question: market.question,
    articlesFound: articles.length,
    probability: avgProbability,
    confidence: judged.length >= 3 ? 0.7 : 0.3,
    articles: judged,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/sentiment-strategy.test.ts`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Run the full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build passes, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/research/strategies/sentiment.ts tests/sentiment-strategy.test.ts
git commit -m "feat(research): add sentiment strategy, aggregates Jev judgments across found articles"
```

---

### Task 6: Tail-end sweep strategy

**Files:**
- Create: `src/research/strategies/tail-end.ts`
- Test: `tests/tail-end-strategy.test.ts`

**Interfaces:**
- Consumes: `searchGoogleNewsRss` (Task 2), `judgeNoul` (Task 4).
- Produces: `export interface TailEndSignal { strategy: 'tail_end'; marketId: string; marketPrice: number; confirmed: boolean; confirmationProbability: number }`, `export async function evaluateTailEnd(market: Market, midPrice: number): Promise<TailEndSignal>`.

- [ ] **Step 1: Write the failing test**

Create `tests/tail-end-strategy.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { evaluateTailEnd } from '../src/research/strategies/tail-end.js';
import * as rss from '../src/research/sources/google-news-rss.js';
import * as jev from '../src/ai/jev.js';
import type { Market } from '../src/types/index.js';

const market: Market = {
  id: 'm2',
  question: 'Will the incumbent win re-election?',
  slug: 'm2',
  categories: [],
  clobTokenIds: [],
  active: true,
  closed: false,
  resolveDate: undefined,
  outcomes: [],
  outcomePrices: [],
};

describe('evaluateTailEnd', () => {
  it('confirms a high-price market when Jev agrees', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([
      { title: 'Incumbent declared winner', link: 'https://a.example', pubDate: '', source: '' },
    ]);
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.95, confidence: 1 });

    const signal = await evaluateTailEnd(market, 0.98);
    expect(signal.confirmed).toBe(true);
    expect(signal.confirmationProbability).toBe(0.95);
  });

  it('does not confirm when Jev disagrees with the implied outcome', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([]);
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.2, confidence: 1 });

    const signal = await evaluateTailEnd(market, 0.98);
    expect(signal.confirmed).toBe(false);
  });

  it('handles a low-price (implied NO) market', async () => {
    vi.spyOn(rss, 'searchGoogleNewsRss').mockResolvedValue([]);
    vi.spyOn(jev, 'judgeNoul').mockResolvedValue({ probability: 0.9, confidence: 1 });

    const signal = await evaluateTailEnd(market, 0.02);
    expect(signal.marketPrice).toBe(0.02);
    expect(signal.confirmed).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/tail-end-strategy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/research/strategies/tail-end.ts`**

```typescript
import type { Market } from '../../types/index.js';
import { searchGoogleNewsRss } from '../sources/google-news-rss.js';
import { judgeNoul } from '../../ai/jev.js';

export interface TailEndSignal {
  strategy: 'tail_end';
  marketId: string;
  marketPrice: number;
  confirmed: boolean;
  confirmationProbability: number;
}

export async function evaluateTailEnd(market: Market, midPrice: number): Promise<TailEndSignal> {
  const impliedOutcome = midPrice >= 0.97 ? 'YES' : 'NO';
  const articles = await searchGoogleNewsRss(market.question, { maxResults: 3 });
  const headlines = articles.map((a) => a.title).join('. ') || 'No recent news found.';

  const result = await judgeNoul(
    `Market question: "${market.question}"\nCurrent market price implies ${impliedOutcome} at ${(midPrice * 100).toFixed(1)}%.\nRecent headlines: ${headlines}`,
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/tail-end-strategy.test.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Run the full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build passes, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/research/strategies/tail-end.ts tests/tail-end-strategy.test.ts
git commit -m "feat(research): add tail-end sweep strategy, confirms near-certain markets via Jev before signaling"
```

---

### Task 7: Resolution sniping strategy (crypto)

**Files:**
- Create: `src/research/strategies/resolution-sniping.ts`
- Test: `tests/resolution-sniping-strategy.test.ts`

**Interfaces:**
- Produces: `export interface ResolutionSnipingSignal { strategy: 'resolution_sniping'; marketId: string; symbol: string; threshold: number; livePrice: number; marketImpliesAbove: boolean; realityIsAbove: boolean; mispriced: boolean }`, `export async function fetchBinancePrice(symbol: string): Promise<number>`, `export async function evaluateResolutionSniping(market: Market, midPrice: number, symbol: string, threshold: number): Promise<ResolutionSnipingSignal>`.

- [ ] **Step 1: Write the failing test**

Create `tests/resolution-sniping-strategy.test.ts`:
```typescript
import { describe, it, expect, vi, afterEach } from 'vitest';
import { evaluateResolutionSniping, fetchBinancePrice } from '../src/research/strategies/resolution-sniping.js';
import type { Market } from '../src/types/index.js';

const market: Market = {
  id: 'm3',
  question: 'Will Bitcoin be above $70,000 on December 31?',
  slug: 'm3',
  categories: [],
  clobTokenIds: [],
  active: true,
  closed: false,
  resolveDate: undefined,
  outcomes: [],
  outcomePrices: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchBinancePrice', () => {
  it('parses the price field from Binance ticker response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: 'BTCUSDT', price: '68500.12' }),
    } as Response);

    const price = await fetchBinancePrice('btcusdt');
    expect(price).toBe(68500.12);
  });
});

describe('evaluateResolutionSniping', () => {
  it('flags mispricing when market and live price disagree', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: 'BTCUSDT', price: '71000' }),
    } as Response);

    // Live price (71000) is above the 70000 threshold -> realityIsAbove = true.
    // Market mid-price (0.3) implies below -> marketImpliesAbove = false. Disagreement.
    const signal = await evaluateResolutionSniping(market, 0.3, 'btcusdt', 70000);

    expect(signal.realityIsAbove).toBe(true);
    expect(signal.marketImpliesAbove).toBe(false);
    expect(signal.mispriced).toBe(true);
  });

  it('does not flag mispricing when market and live price agree', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ symbol: 'BTCUSDT', price: '71000' }),
    } as Response);

    const signal = await evaluateResolutionSniping(market, 0.9, 'btcusdt', 70000);
    expect(signal.mispriced).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/resolution-sniping-strategy.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `src/research/strategies/resolution-sniping.ts`**

```typescript
import type { Market } from '../../types/index.js';

export interface ResolutionSnipingSignal {
  strategy: 'resolution_sniping';
  marketId: string;
  symbol: string;
  threshold: number;
  livePrice: number;
  marketImpliesAbove: boolean;
  realityIsAbove: boolean;
  mispriced: boolean;
}

export async function fetchBinancePrice(symbol: string): Promise<number> {
  const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`);
  if (!response.ok) {
    throw new Error(`Binance price fetch error: ${response.status}`);
  }
  const data = await response.json();
  return Number(data.price);
}

export async function evaluateResolutionSniping(
  market: Market,
  midPrice: number,
  symbol: string,
  threshold: number
): Promise<ResolutionSnipingSignal> {
  const livePrice = await fetchBinancePrice(symbol);
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/resolution-sniping-strategy.test.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 5: Manual live verification**

Run a throwaway script (delete after, do not commit) calling `fetchBinancePrice('btcusdt')` for real and printing the result. Confirm a real, plausible current BTC price comes back (order of magnitude sanity check, not an exact value).

- [ ] **Step 6: Run the full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build passes, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/research/strategies/resolution-sniping.ts tests/resolution-sniping-strategy.test.ts
git commit -m "feat(research): add resolution sniping strategy, compares live Binance price against market's implied price"
```

---

### Task 8: Validation script

**Files:**
- Create: `scripts/validate-research.ts`

**Interfaces:** None new — this is the integration point consuming Tasks 1-7's exports. No file besides this script is created or modified.

- [ ] **Step 1: Read `src/api/clob.ts`'s `getOrderBook`/`getMidPrice` signatures**

Confirm exact signatures before use (both are read-only, no order placement — already used elsewhere in the codebase this way).

- [ ] **Step 2: Implement `scripts/validate-research.ts`**

```typescript
import { fetchMarkets } from '../src/api/polymarket.js';
import { getOrderBook, getMidPrice } from '../src/api/clob.js';
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
  const markets = await fetchMarkets({ active: false, closed: true, limit: 30 });

  let sentimentCorrect = 0;
  let sentimentTotal = 0;

  for (const market of markets) {
    if (market.outcomes.length !== 2 || market.outcomePrices.length !== 2) continue;
    const winnerIndex = market.outcomePrices.findIndex((p) => p === 1);
    if (winnerIndex === -1) continue;
    const realOutcome = market.outcomes[winnerIndex]; // e.g. "Yes" or "Over"
    const realIsYes = realOutcome.toLowerCase() === market.outcomes[0].toLowerCase();

    // Sentiment strategy: always applicable when there's a question.
    // beforeDate is REQUIRED here -- without it, the news search would run
    // against today's date and could return articles reporting the outcome
    // that already happened, making the "prediction" meaningless (see spec
    // §2/§5 leakage warning). market.resolveDate is the market's own
    // resolution timestamp; fall back to skipping this market's sentiment
    // check entirely if it's missing rather than searching unbounded.
    if (!market.resolveDate) {
      console.log(`[sentiment] "${market.question.slice(0, 60)}" SKIPPED: no resolveDate to bound the search`);
      continue;
    }
    const beforeDate = new Date(market.resolveDate);
    try {
      const sentiment = await evaluateSentiment(market, beforeDate);
      const predictedYes = sentiment.probability >= 0.5;
      sentimentTotal++;
      if (predictedYes === realIsYes) sentimentCorrect++;
      console.log(
        `[sentiment] "${market.question.slice(0, 60)}" predicted=${predictedYes ? 'YES' : 'NO'} real=${realIsYes ? 'YES' : 'NO'} ${predictedYes === realIsYes ? '✓' : '✗'}`
      );
    } catch (error) {
      console.log(`[sentiment] "${market.question.slice(0, 60)}" ERROR: ${error}`);
    }

    // Tail-end: only applicable if we can reconstruct that the market was
    // near-certain before resolution. We don't have historical price here,
    // so approximate using the resolved outcomePrices themselves as a proxy
    // is invalid (that's the answer, not the pre-resolution price) -- skip
    // tail-end in the backtest and note the limitation explicitly.
  }

  console.log(`\nSentiment strategy: ${sentimentCorrect}/${sentimentTotal} correct`);
  console.log(
    `Tail-end strategy: not backtested — resolved markets don't expose their pre-resolution price in this API response, only the final outcome. See spec Non-Goals / Task 8 note.`
  );
  console.log(
    `Resolution sniping: not backtested — a resolved market's "live" price is meaningless after the fact.`
  );
}

async function main(): Promise<void> {
  await runLiveMarkets();
  await runBacktest();
}

main().catch((error) => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
```

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Run the validation script for real**

Run: `npx tsx scripts/validate-research.ts` (check `package.json` for the project's existing TS execution method — use `ts-node`/`tsx`/compiled `dist/` output, whichever this project already uses elsewhere; if none is set up for one-off scripts, compile via `npm run build` first and run `node dist/scripts/validate-research.js`)

This uses real Jev credit (dozens of calls, a few cents total) and real network calls to Google News RSS and Binance. Let it run to completion. Read the full output.

- [ ] **Step 5: Report the real results**

Do not just confirm the script exited cleanly — read and report the actual signal outputs and the actual hit-rate number to the person running this plan. A clean exit with a 0/0 hit-rate (e.g. because no resolved market had a clean 2-outcome shape) is a finding to report, not a silent pass. **Also spot-check at least one Run B article result manually**: pick one printed sentiment result, open its `link` in the log (or re-fetch it), and confirm its actual publish date is before that market's `resolveDate` — this is the concrete proof the leakage guard (Task 2/Task 5) worked in the real run, not just in unit tests with synthetic fixtures.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-research.ts
git commit -m "feat(research): add validation script, runs all 3 strategies against live and resolved markets

Run A checks signal plausibility against live open markets. Run B
backtests the sentiment strategy against resolved markets with known
outcomes for a real hit-rate number. Tail-end and resolution-sniping
are not backtestable against resolved markets (no historical
pre-resolution price data available from the API) -- noted explicitly
in the script's own output rather than fabricating a number."
```

---

### Task 9: End-to-end verification and README update

**Files:** None modified besides `README.md`.

- [ ] **Step 1: Full build and test suite**

Run: `npm run build && npx vitest run`
Expected: build succeeds, all tests pass (42 pre-existing + this plan's new tests).

- [ ] **Step 2: Confirm no trading-path files were touched**

Run: `git diff --stat e890f4063b599e8c4a1cddbf0e6fd085e9ecdf21..HEAD -- src/websocket/integration.ts src/index.ts src/safety/ src/api/clob.ts src/betting/`
Expected: empty output (no changes) for everything except possibly `src/api/polymarket.ts` (Task 1's additive `Market` type extension, read-only, does not change any existing field or function signature).

- [ ] **Step 3: Re-run the validation script's key numbers for the README**

Reuse Task 8's real output (same session) or re-run `scripts/validate-research.ts` if meaningful time has passed. Record the actual hit-rate and a couple of representative example outputs.

- [ ] **Step 4: Update README.md**

Add a new section (after the existing "Como funciona" or "Problemas Conhecidos" section, matching this file's existing heading style) documenting:
- What sub-project 4 built (3 strategies, Jev + Google News RSS + crawl4ai).
- The real validation results from Step 3 (actual hit-rate number, not a promise).
- Explicit statement that none of this is wired into real trading yet — the bot still decides only by price/liquidity in production.
- `TYPESAFE_API_KEY` now in `.env`, sourced from the local TypeSafe login this session, confirmed live and working.
- Update "Próximos Passos" item 10 (previously "adiado" / deferred pending an AI provider decision) — mark that the AI provider decision is now made (Jev) and research is built+validated, but explicitly NOT connected to the trading decision path — that remains a distinct future decision (sub-project 5).

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: mark research signal system sub-project complete, record real validation results"
```
