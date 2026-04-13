# Feature Landscape — Polymarket Bot

**Domain:** Prediction market trading bot
**Researched:** 2026-04-13
**Confidence:** MEDIUM (ecosystem research, multiple sources)

---

## Executive Summary

A Polymarket bot occupies a specific niche: it watches prediction markets, gathers signals from external sources, runs an LLM to decide whether a trade is warranted, executes on-chain, and manages a bankroll. The ecosystem has converged on a rough feature set that users expect, a handful of differentiators that separate bots from each other, and a set of anti-features that the community has learned to avoid.

**Table stakes:** Market monitoring, basic signal sources, trade execution, bankroll limits, Railway deployment with a loop/scheduler. Without these, the bot feels broken.

**Differentiators:** Multi-source research (Crypto APIs, Financial APIs, News, Sports), source credibility scoring with star ratings, LLM-powered decision reasoning, advanced bankroll strategies (Kelly Criterion, dynamic position sizing), copy-trading or whale tracking.

**Anti-features:** Building a UI when Telegram is enough, trying to predict resolution instead of trading the spread, aggressive auto-compounding, social features (leaderboards, chat) that bloat the core loop.

---

## Category 1: Market Monitoring (Polymarket API)

### Table Stakes

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| **Market discovery** — listing active markets via Gamma API (`/events`, `/markets`) | Users need to know what exists | Low |
| **Price fetching** — current odds via CLOB API (`/price`, `/prices`) | Basic market data for decision-making | Low |
| **Order book depth** — bid/ask spreads | Determines liquidity and execution quality | Low |
| **Market status** — open/closed, volume, creation date | Filtering what to care about | Low |

**Dependency:** None. This is the foundation everything else sits on.

**Reality check:** Polymarket's public API requires no auth, no key. Rate limits exist but are generous for a single bot. WebSocket streaming is available for real-time orderbook updates — polling is acceptable for MVP but WebSocket is the right long-term choice.

### Differentiators

| Feature | Value Proposition | Complexity |
|---------|-------------------|------------|
| **Cross-platform aggregation** — Kalshi, Limitless, PredictIt odds in one view | Find arbitrage / best price | High |
| **Whale tracking** — monitoring top trader wallets via Data API (`/positions`, `/trades`) | Follow smart money signals | Medium |
| **Historical price analysis** — `/prices-history` endpoint for trend detection | Surface momentum or reversal patterns | Medium |
| **Multi-market event handling** — correctly parsing events with multiple markets (e.g., "Which college?" with 5+ outcomes) | Avoid trading the wrong instrument | Medium |

### Anti-Features

| Anti-Feature | Why Avoid | Instead |
|--------------|-----------|---------|
| Building a full market explorer UI | Polymarket.com already does this | Telegram command interface |
| Scraping instead of using official API | Fragile, rate-limited, breakable | Use Gamma/CLOB APIs |
| Supporting deprecated/legacy endpoints | Maintenance burden | Stick to current API version |

---

## Category 2: Research Systems Per Category

### Table Stakes

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| **Polymarket native signals** — market price, volume, orderbook | Core data, no external dependency | Low |
| **Keyword/category market filtering** — filter by tag (Sports, Crypto, Politics) | Reduce noise, focus the bot | Low |

### Differentiators

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Crypto APIs** — on-chain data (Nansen, Arkham) for wallet labeling, whale identification | Know who is trading before they move the market | High | Requires API key, paid tier likely needed |
| **Financial APIs** — alternative data (Fred API, Yahoo Finance, CoinGecko) for fundamental signals | External validation of market premise | Medium | Many free tiers available |
| **News scrapers** — headline monitoring for event catalysts | Sentiment shift before price moves | High | Rate limits, reliability issues |
| **Sports APIs** — real-time scores, schedules, player stats | Bet on sports outcomes with data edge | High | SportRadar, TheOddsAPI — paid |
| **Political data** — FEC filings, poll aggregators, election calendars | Political markets are high-volume | Medium | Some free sources |
| **Sentiment aggregators** — social media monitoring (Twitter/X), Reddit | Early signal before market moves | High | X API is expensive; Reddit is free |

**Dependency:** Each research category is independent but they all feed into the same decision pipeline. Start with one category, prove the loop, then add more.

### Anti-Features

| Anti-Feature | Why Avoid | Instead |
|--------------|-----------|---------|
| Building your own news crawler from scratch | House of mirrors, maintenance nightmare | Use NewsData.io, NewsAPI, or similar |
| Real-time video/image analysis for event verification | Overkill for 2026, resolution latency is low anyway | Trust the market's resolution mechanism |
| Scraping Polymarket Twitter for sentiment | Fragile, violates ToS, noisy data | Use dedicated sentiment tools |

---

## Category 3: Source Classification with Star Ratings (1-5)

This is a **differentiation** category. Star ratings are not table stakes — they're a UX layer that signals confidence to the user.

### Approach

| Rating | Meaning | Example Source |
|--------|---------|----------------|
| ⭐⭐⭐⭐⭐ | Authoritative, real-time, institutional | SportRadar, official APIs |
| ⭐⭐⭐⭐ | Reliable, slight latency, good coverage | NewsData.io, Crypto APIs |
| ⭐⭐⭐ | Useful but with gaps | Reddit sentiment, Twitter alerts |
| ⭐⭐ | Noisy, delayed, best-effort | Free news scrapers |
| ⭐ | Fallback, not actionable alone | General web search |

### Implementation Notes

- **Per-signal rating:** Each research result gets a star rating before hitting the decision engine.
- **Aggregate scoring:** Multiple ⭐⭐ sources together may outweigh one ⭐⭐⭐. Weighted confidence score.
- **User-overridable:** Allow users to adjust weights per category (e.g., "I trust Sports APIs more than News").

### Complexity: **Medium** — requires a schema for source metadata, a rating system, and aggregation logic.

### Anti-Features

| Anti-Feature | Why Avoid | Instead |
|--------------|-----------|---------|
| Static ratings that never update | Sources go stale | Refresh ratings monthly or on incident |
| Binary trusted/untrusted classification | Loses nuance | Star scale captures confidence gradient |

---

## Category 4: AI-Powered Decision Making (LLM Integration)

### Table Stakes

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| **Prompt construction** — assembling market question + current odds + research signals into a structured prompt | Without this, you can't query an LLM meaningfully | Low |
| **Trade signal output** — structured decision (BUY YES / BUY NO / SKIP) with confidence | The core loop output | Low |
| **Dry-run mode** — log decisions without executing trades | Safety before going live | Low |

### Differentiators

| Feature | Value Proposition | Complexity |
|---------|-------------------|------------|
| **Multi-model reasoning** — compare outputs from Claude/GPT/DeepSeek for consensus | Reduces single-model bias | High |
| **Chain-of-thought logging** — show the LLM's reasoning before the decision | User trust and debugging | Medium |
| **Cost-aware batching** — group multiple market evaluations into a single LLM call | Cut API costs dramatically | Medium |
| **Dynamic prompt templates** — adjust reasoning depth based on market liquidity or bet size | Don't overthink small bets | Medium |
| **Memory of past decisions** — store previous trades and outcomes to inform future ones | Learn from losses | High |

### Decision Pipeline

```
Market Question → Research Signals (star-rated) → Prompt Assembly → LLM Decision → Trade Execution → Outcome Logging → Bankroll Update
```

### Complexity: **High** — LLM integration is the most complex piece. Multiple failure modes: cost overruns, latency, hallucinated confidence, poor instructions.

### Anti-Features

| Anti-Feature | Why Avoid | Instead |
|--------------|-----------|---------|
| Letting the LLM control the wallet without confirmation | Financial disaster risk | Always require user acknowledgment for trades above threshold |
| Streaming LLM responses in production | Latency, cost, no benefit | Batch decisions, return structured results |
| Using the cheapest model for financial decisions | Accuracy matters | Spend on reasoning model; cache where possible |

---

## Category 5: Bet Execution Automation

### Table Stakes

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| **Wallet connection** — read/write to user's Polymarket-connected wallet | Required for any trading | Medium |
| **Order placement** — market orders via CLOB API | Core action | Medium |
| **Order status tracking** — confirmations, fills, rejections | User trust | Low |
| **Gas/fee estimation** — show expected cost before execution | Prevent bad surprises | Low |
| **Dry-run mode** — simulate execution without blockchain calls | Test safely | Low |

### Differentiators

| Feature | Value Proposition | Complexity |
|---------|-------------------|------------|
| **Limit orders** — place bids at specific prices instead of market orders | Better entry, avoids slippage | High |
| **Conditional orders** — trigger when price crosses threshold | Automate entries/exits | High |
| **Partial fills handling** — correctly handle orders that don't fill completely | Avoid stuck state | Medium |
| **Multi-market execution** — execute on correlated markets simultaneously (e.g., Trump's re-election and GOP Senate majority) | Parlay-like exposure | High |
| **Slippage protection** — abort if price moved beyond threshold | Quality control | Medium |

### Anti-Features

| Anti-Feature | Why Avoid | Instead |
|--------------|-----------|---------|
| Market orders on illiquid markets | Severe slippage risk | Require minimum liquidity before executing |
| Automatic position closing | Bot can be wrong, user should decide | Notify, don't auto-close |
| Flash loans or leverage | Blows up on oracle failure | Stick to spot USDC trading |

---

## Category 6: Bankroll Management

### Table Stakes

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| **Max position size** — hard cap on any single bet (e.g., never more than 5% of bankroll) | Survive losing streaks | Low |
| **Daily loss limit** — stop trading if daily P&L drops below threshold | Prevent catastrophic days | Low |
| **Bankroll tracking** — running tally of balance, open positions, realized P&L | User needs to know their position | Low |

### Differentiators

| Feature | Value Proposition | Complexity |
|---------|-------------------|------------|
| **Kelly Criterion position sizing** — calculate bet size based on edge and bankroll | Optimal growth over time | High |
| **Dynamic limits** — increase max bet size when winning, shrink when losing | Preserve capital during drawdowns | Medium |
| **Category-level exposure caps** — max 20% in Crypto markets, 30% in Sports | Diversify risk | Medium |
| **Win-rate tracking** — per category, per signal source, per market type | Know where the edge is | Medium |
| **Auto-compounding** — reinvest profits on a schedule | Grow the bankroll automatically | Medium |

### Anti-Features

| Anti-Feature | Why Avoid | Instead |
|--------------|-----------|---------|
| Martingale / double-down after losses | One bad streak wipes you out | Fixed position sizing |
| No stop-loss at the bot level | Unlimited downside | Hard daily loss limit |
| Transparent logging of all decisions | User needs to audit | Persist every decision with timestamp and rationale |

---

## Category 7: Railway Deployment with Scheduler/Loop

### Table Stakes

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| **Railway deployment** — bot runs on Railway's infrastructure | Reliable 24/7 hosting | Low |
| **Cron scheduler** — run the decision loop every N minutes | Continuous operation | Low |
| **Health checks** — Railway health endpoint + self-ping | Know when the bot is dead | Low |
| **Secrets management** — API keys, wallet private key in Railway env vars | Security without hardcoding | Low |
| **Logs persistence** — structured logs accessible for debugging | Operational necessity | Low |

### Differentiators

| Feature | Value Proposition | Complexity |
|---------|-------------------|------------|
| **Event-driven triggers** — run on WebSocket event (price spike, whale trade) instead of pure cron | React faster, save on LLM calls | High |
| **Graceful shutdown** — finish in-progress trades before stopping | No half-executed orders | Medium |
| **Multi-instance safety** — mutex/lock to prevent duplicate trades if bot runs on multiple instances | Critical if Railway restarts the container | Medium |
| **Deployment pipeline** — GitHub Actions → Railway deploy on push | CI/CD so you don't manually deploy | Medium |
| **Alerting** — PagerDuty, Discord webhook on bot failure | You need to know when it breaks | Medium |

### Loop Architecture

```
┌─────────────────────────────────────────────┐
│  Railway Cron (every 5 min)                  │
│  Or: WebSocket price event trigger           │
└──────────────┬───────────────────────────────┘
               ▼
┌─────────────────────────────────────────────┐
│  Decision Loop                              │
│  1. Fetch target markets (filtered)          │
│  2. Gather research signals (parallel)       │
│  3. Score sources (star ratings)             │
│  4. Build LLM prompt                         │
│  5. Get LLM decision                         │
│  6. Check bankroll rules                     │
│  7. Execute trade if warranted               │
│  8. Log outcome                              │
└─────────────────────────────────────────────┘
```

### Anti-Features

| Anti-Feature | Why Avoid | Instead |
|--------------|-----------|---------|
| Running on local machine | Your laptop sleeps, bot stops | Railway (or Fly.io, Render) |
| No locking — multiple instances fighting | Duplicate trades, lost money | Redis-based mutex or Railway single-instance |
| No alerting — silent failures for days | You don't know bot is dead | Discord webhook on error |

---

## Feature Dependencies

```
Market Monitoring (Polymarket API)
    └── Required by everything

Research Systems (per category)
    └── Feed into → LLM Decision Making

LLM Decision Making
    └── Feeds into → Bet Execution Automation

Bet Execution Automation
    └── Updates → Bankroll Management

Bankroll Management
    └── Constrains → Bet Execution Automation (limits)

Railway Deployment
    └── Hosts all of the above
```

---

## MVP Recommendation

**Priority order for build:**

1. **Phase 1 — Core loop (table stakes):** Market monitoring + simple prompt (market question + price) + dry-run mode + Railway cron. No real money.
2. **Phase 2 — Execution:** Real wallet connection, market orders, dry-run removed, basic max position size.
3. **Phase 3 — Research:** Add 1-2 research categories (e.g., news API + Polymarket whale tracking). Implement star ratings.
4. **Phase 4 — Bankroll:** Kelly Criterion or fixed % position sizing, daily loss limit, win-rate tracking.
5. **Phase 5 — Reliability:** Health checks, alerting, multi-instance lock, graceful shutdown.

**Skip for MVP:** Cross-platform aggregation, multi-model LLM reasoning, auto-compounding, limit orders, multi-market execution.

---

## Confidence Assessment

| Area | Level | Notes |
|------|-------|-------|
| Market monitoring features | HIGH | Polymarket API is well-documented, stable |
| Research categories | MEDIUM | Ecosystem tools are fragmented, some paid APIs needed |
| Star rating system | LOW | No standard exists; must design from scratch |
| LLM integration | MEDIUM | Patterns established but cost/latency tradeoffs unclear |
| Bet execution | MEDIUM | CLOB API well-documented; on-chain adds uncertainty |
| Bankroll management | HIGH | Standard patterns from trading bots transfer directly |
| Railway deployment | HIGH | Standard Node.js deployment, cron well-documented |

---

## Sources

- Polymarket API docs: https://docs.polymarket.com/
- Awesome Prediction Market Tools (201 starred repo): https://github.com/aarora4/Awesome-Prediction-Market-Tools
- Polymarket bot guides: Bullpen, QuantVPS, LayerX blog
- Railway cron docs: https://blog.railway.com/p/run-scheduled-and-recurring-tasks-with-cron