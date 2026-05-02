# Research: Phase 7 - Crawl4AI Social Sources (Twitter & Reddit)

**Phase:** 7
**Goal:** Integrate social media scraping (Twitter/X, Reddit) as research sources for prediction markets
**Date:** 2026-05-02

---

## Executive Summary

Phase 7 adds social media intelligence to the existing research pipeline by integrating:
1. **Crawl4AI** — New library for web scraping (JS/TS native)
2. **Twitter/X** — High-value but API-restricted social signal
3. **Reddit** — Structured discussions with PRAW library

The existing `ResearchChain` architecture (aggregator → scorer → recommendation) is extended with new `ResearchSource` adapters. No changes to core interfaces.

---

## 1. Crawl4AI Integration

### What is Crawl4AI?

Open-source LLM-friendly web crawler. Primary use: extracting clean markdown from websites for AI consumption.

**Key features relevant to this phase:**
- Async API (`AsyncWebCrawler`, `arun()`)
- CSS/XPath extraction for structured data
- Session management and anti-bot detection
- Markdown generation optimized for LLMs

### Installation (Python)

```bash
pip install crawl4ai
```

**Important:** Crawl4AI is a **Python** library. The project uses TypeScript for the core bot. Two integration paths:

**Option A: Python subprocess** — Spawn Python script for crawling, parse JSON output
**Option B: Direct import** — If Python runtime available via `python3` subprocess

Given the architecture (TypeScript core), **Option A is preferred** — spawn Python as a sidecar process and communicate via stdout JSON.

### Basic Usage Pattern

```python
from crawl4ai import AsyncWebCrawler

async def crawl(url: str) -> dict:
    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url)
        return {
            "markdown": result.markdown,
            "links": result.links,
            "metadata": result.metadata
        }
```

### Crawl4AI for Social Media Scraping

Twitter/X and Reddit have anti-bot measures. Crawl4AI's browser-based approach can handle:
- JavaScript rendering (Twitter timeline)
- Session cookies for authenticated access
- Rate limiting and retry logic

**For Twitter:** Use `session_cookie` approach — login once, extract cookies, reuse for subsequent crawls.

**For Reddit:** PRAW is more reliable for API access. Crawl4AI can be backup for non-API data (subreddit sidebars, wiki pages).

---

## 2. Twitter/X Scraping

### Current State (2026)

Twitter API (v2) has severe restrictions and pricing:
- **Free tier:** Read-only, rate limited, no posting
- **Basic ($100/mo):** 10,000 tweets/month, app-only auth
- **Pro ($5,000/mo):** 1M tweets/month

### Recommended Approach

**Option 1: Twitter API v2 via Tweepy**
- Requires API keys (Bearer token)
- Rate limits: 180 requests/15min for app-only, 450/15min for user context
- Works for: searching tweets, user timelines, trending topics

```python
import tweepy

def search_tweets(query: str, max_results: int = 10):
    client = tweepy.Client(bearer_token=BEARER_TOKEN)
    tweets = client.search_recent_tweets(query=query, max_results=max_results)
    return tweets.data
```

**Option 2: Nitter (RSS/Mirror)**
- Open-source Twitter mirror with RSS feeds
- No auth required, but unreliable (frequently down)
- Use as fallback only

**Option 3: Web scraping via Crawl4AI**
- For profiles, lists, trends (not search)
- Requires session cookies or stealth browser
- High failure rate without proper headers

### Twitter Data Points for Prediction Markets

| Data | Value | Reliability |
|------|-------|-------------|
| Search volume for topic | High | API available |
| Sentiment (requires LLM) | Medium | Must classify |
| Trending hashtag presence | High | API/trending endpoint |
| Influencer posts | Medium | Requires account access |
| Real-time reaction to events | High | WebSocket ideal |

### Key Constraints

1. **Rate limits are strict** — 180 requests/15min (app-only) means ~720 queries/hour max
2. **Search requires paid tier** — Free tier has search disabled in many contexts
3. **Authentication rotation needed** — Guest tokens expire frequently
4. **No bulk download** — Every approach requires pagination

**Recommendation:** Use Twitter API v2 with Tweepy for search, accept limitations. Do NOT attempt to scrape without auth — accounts get banned quickly.

---

## 3. Reddit Scraping

### PRAW (Python Reddit API Wrapper)

**Best approach** — Official API wrapper, reliable, free.

```python
import praw

def get_subreddit_posts(subreddit: str, limit: int = 10):
    reddit = praw.Reddit(client_id=CLIENT_ID, client_secret=CLIENT_SECRET, user_agent="polymarket-bot/1.0")
    posts = reddit.subreddit(subreddit).hot(limit=limit)
    return [{"title": p.title, "score": p.score, "url": p.url} for p in posts]
```

### Reddit API Rate Limits

- **Normal API:** 60 requests/minute (authenticated)
- **Premium:** Higher limits
- **No daily cap** — only per-minute rate limiting

### Data Points for Prediction Markets

| Data | Value | Method |
|------|-------|--------|
| Post volume on topic | High | PRAW search |
| Comment sentiment | Medium | PRAW + LLM |
| Cross-posting (sentiment sync) | High | PRAW |
| Controversial discussions | High | Sort by controversial |
| Rising topics | High | PRAW rising |

### Subreddit Strategy

Focus on prediction-market-relevant subreddits:
- `r/CryptoCurrency` — general crypto sentiment
- `r/Bitcoin`, `r/Ethereum` — specific crypto
- `r/Sports` — sports betting discussions
- `r/worldnews` — geopolitical events
- `r/predictionmarkets` — meta discussion on PM

---

## 4. Architecture Integration

### Existing Pattern (from binance.ts, newsdata.ts)

```typescript
// All sources implement ResearchSource interface
export interface ResearchSource {
  id: string;
  name: string;
  category: SourceCategory;
  rating: 1 | 2 | 3 | 4 | 5;
  
  fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal>;
  isAvailable(): boolean;
}
```

### New Adapters to Create

1. **`TwitterAdapter`** — Wraps Python Tweepy script via subprocess
2. **`RedditAdapter`** — Uses PRAW directly (Python subprocess)
3. **`SocialAggregator`** — Combines social signals with existing sources

### File Structure

```
src/research/
  ├── twitter.ts        # TwitterAdapter (subprocess wrapper)
  ├── reddit.ts         # RedditAdapter (subprocess wrapper)
  ├── binance.ts        # existing
  ├── newsdata.ts       # existing
  ├── aggregator.ts     # existing
  ├── chain.ts          # existing
  ├── confidence.ts     # existing
  └── interface.ts       # existing

scripts/                # Python helper scripts
  ├── twitter_scraper.py
  └── reddit_scraper.py
```

### Subprocess Communication

Python scripts output JSON to stdout:

```python
# reddit_scraper.py output format
{"source": "reddit", "posts": [...], "timestamp": "2026-05-02T..."}
```

TypeScript reads stdout, parses JSON, converts to `ResearchSignal`.

---

## 5. Key Technical Decisions

### Decision 1: Twitter Rating

Twitter as a source has mixed reliability:
- High noise (bots, spam, manipulated narratives)
- Fast signal for breaking news
- Requires LLM for sentiment analysis

**Recommendation:** ★3 rating (minimum viable). Override with higher weight for breaking news events.

### Decision 2: Reddit Rating

Reddit is more structured than Twitter:
- Conversations are longer-form
- Community voting provides quality signal
- Niche communities have expert discussion

**Recommendation:** ★4 rating. Better signal-to-noise than Twitter for well-defined topics.

### Decision 3: Crawl4AI vs PRAW for Reddit

PRAW is more reliable for Reddit API access. Crawl4AI is backup:
- Primary: PRAW (API)
- Fallback: Crawl4AI (for non-API content like wiki, sidebars)

### Decision 4: Rate Limit Handling

Both Twitter and Reddit have rate limits. Implement:
1. Token bucket algorithm for request throttling
2. Exponential backoff on 429 responses
3. Cache responses for same-topic queries (5-min TTL)

---

## 6. Validation Strategy

### Unit Tests

- Mock Python subprocess responses
- Test rate limit handling (429 simulation)
- Test JSON parsing from stdout

### Integration Tests

- Run Python scripts with real credentials (mocked)
- Verify signal format matches `ResearchSignal` interface

### Performance Targets

- Twitter query: < 3 seconds (including subprocess spawn)
- Reddit query: < 2 seconds
- Combined social signals: < 5 seconds added latency

---

## 7. Security Considerations

### API Keys

- Twitter Bearer Token → environment variable, not in code
- Reddit Client ID/Secret → environment variable

### Anti-Bot Detection

- Twitter: Rotate user agents, add delays, use session cookies
- Reddit: PRAW handles this automatically

### Rate Limit Abuse

- Implement circuit breaker — open circuit after X consecutive 429s
- Log all rate limit events for monitoring

---

## 8. Common Pitfalls

1. **Twitter search disabled on free tier** — Use Nitter RSS as fallback
2. **Rate limits hit unexpectedly** — Always implement exponential backoff
3. **JSON parsing from Python** — Ensure strict schema validation
4. **Blocking subprocess calls** — Use `child_process.spawn` with timeout
5. **Crawl4AI installation issues** — Requires Playwright browser install (`crawl4ai-setup`)

---

## 9. Dependencies to Add

### Python (scripts/)

```txt
# requirements.txt
tweepy>=4.14.0
praw>=7.7.0
crawl4ai>=0.8.0
```

### TypeScript (package.json)

No new npm packages needed — using subprocess approach.

---

## 10. Source Requirements

| Source | Category | Rating | API | Rate Limit |
|--------|----------|--------|-----|------------|
| Twitter | social | ★3 | Tweepy + Twitter API v2 | 180 req/15min |
| Reddit | social | ★4 | PRAW | 60 req/min |
| Crawl4AI | utility | ★2 | Python subprocess | none |

**Minimum social sources before bet decision:** 2 (Twitter + Reddit can combine)

---

## 11. Open Questions

1. **Twitter API tier** — Does user have paid Twitter API access? If not, Nitter fallback only.
2. **Sentiment analysis** — Is LLM sentiment classification needed now, or can raw post counts serve as proxy?
3. **Crawl4AI installation** — Does Railway Python environment support Playwright browser install?

---

*Research completed: 2026-05-02*
*Source: Crawl4AI docs, Twitter API docs, PRAW documentation, web search*