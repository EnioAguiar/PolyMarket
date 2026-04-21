# Phase 6: Research Infrastructure - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Research infrastructure with categorized tools, data persistence via Railway volume, and integration with existing research chain. This phase enables the bot to research markets before betting using multiple source types.
</domain>

<decisions>
## Implementation Decisions

### Research Tool Categorization
- **D-01:** Hybrid categorization by market type + tool type
- **D-02:** Priority order within each market: API (1st) → Social Media (2nd) → Crawl4AI (3rd/last resort)
- **D-03:** Crawl4AI is fallback only - used when API fails or doesn't exist for a market type

### Market Categories (for tool assignment)
- Crypto (Binance, CoinGecko, etc.)
- Sports (API-Football, TheSportsDB)
- News (Google News, Bing News)
- Politics (News APIs, Reddit)
- General (Google News as fallback)

### Quick Filter (before research)
- **D-04:** Permissive quick filter - only removes obviously bad markets
- Remains valid: Time horizon (5min - 24h), minimum liquidity exists, accepted category
- Does NOT remove: Strange odds, seemingly bad markets (let research decide)

### Research Chain Trigger
- **D-05:** Research runs immediately after market passes quick filter
- **D-06:** Research Chain calculates confidence score (0-100%)
- **D-07:** Bet only if confidence >= 70% (configurable threshold)

### Data Persistence
- **D-08:** Railway Volume for persistent storage
- **D-09:** Volume mount path: `/data`
- **D-10:** SQLite database at `/data/polymarket.db`
- **D-11:** Database survives deploys (not wiped on restart)

### Research Chain Integration
- **D-12:** Integrate with existing `src/research/chain.ts` ResearchChain
- **D-13:** Existing `src/research/aggregator.ts` for multi-source aggregation
- **D-14:** Existing `src/db/schema.ts` tables for source ratings and results

### the agent's Discretion
- Exact confidence threshold (70%) can be tuned based on backtesting
- Specific sources to use per category can be refined as we learn
</decisions>

<canonical_refs>
## Canonical References

### Existing Code
- `src/research/chain.ts` — ResearchChain class to integrate with
- `src/research/aggregator.ts` — Multi-source aggregation
- `src/db/schema.ts` — Database tables (source_ratings, source_feeds, research_results)
- `src/websocket/integration.ts` — Where new_market events arrive

### Railway Documentation
- Railway Volume documentation (to be referenced during planning)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ResearchChain` class: Already implements aggregate → Bayesian score flow
- `ResearchAggregator`: Already handles multiple source types
- `source_ratings` table: Star rating system (1-5) for sources

### Integration Points
- New market events arrive at `src/websocket/integration.ts` → `evaluateMarketForWebSocket()`
- Research results can use existing `research_results` table
- Source configuration via existing `source_ratings` + `source_feeds` tables
</code_context>

<specifics>
## Specific Ideas

### Tool Priority Example (per market type)
```
CRYPTO:
  1. Binance API (price data) ← PRIMARY
  2. CoinGecko API (alternative prices)
  3. Crawl4AI (news sites, only if APIs fail)

SPORTS:
  1. API-Football ← PRIMARY
  2. Crawl4AI (team sites, news), only if API lacks data

NEWS/POLITICS:
  1. Google News API ← PRIMARY
  2. Reddit (sentiment)
  3. Crawl4AI (specific sites), only if needed
```

### Research Flow
```
new_market event
    │
    ▼
Quick Filter (time, liquidity, category)
    │
    ▼
Research Chain (all sources for market type)
    │
    ▼
Confidence Score
    │
    ▼
confidence >= 70%? ──YES──► BET
    │
   NO
    │
    ▼
  IGNORE
```
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 06-research-infrastructure*
*Context gathered: 2026-04-20*
