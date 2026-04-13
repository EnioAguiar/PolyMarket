# Domain Pitfalls: Polymarket Bot

**Domain:** AI-driven prediction market trading bot (Polymarket)
**Researched:** 2026-04-13
**Confidence:** MEDIUM-HIGH (multiple sources, real case studies, some bleeding-edge AI agent data)

---

## Critical Pitfalls

Mistakes that cause account blowups, catastrophic losses, or fundamental system failures.

---

### Pitfall 1: No Position Limits → Account Wipeout

**What goes wrong:** The bot places a bet larger than it can afford to lose, or allocates too much capital to a single market. One wrong prediction wipes out gains or blows the account.

**Why it happens:** Autonomy without constraints. When the bot has wallet access and no spending limits, a single erroneous decision can be catastrophic. The Lobstar Wilde incident ($441K lost) happened because an autonomous agent had unrestricted wallet access.

**Consequences:** Complete loss of trading capital on a single bad trade. The Markitzero case lost $4.6M on one presidential election market.

**Prevention:**
- Hard position size limits (max 2-5% of portfolio per market, per PROJECT.md's 5-10% guidance)
- Maximum daily loss threshold that halts trading
- No single market should exceed defined capital allocation
- Kill switch at defined drawdown (10%, 25%)

**Warning signs:**
- Position sizes that increase after losses ("revenge sizing")
- No circuit breaker after X consecutive losses
- Bot can place orders without size validation

**Phase to address:** **Phase 1 — Core Loop** (position sizing and kill switches must be foundational, not added later)

---

### Pitfall 2: Overtrading — Diluting Edge

**What goes wrong:** Bot trades too many markets simultaneously. Capital and attention get spread thin. The best mispriced opportunities are under-sized because capital is locked in mediocre positions.

**Why it happens:** The urge to be active. Prediction markets offer constant opportunities. Bots without discipline take many of them. Fees compound quietly. Each additional position dilutes the portfolio.

**Consequences:**
- Fee drag: Polymarket fees (~1% per side) compound on every open/close. Multiple positions = multiple fee rounds.
- Diluted best ideas: If you find a genuinely mispriced contract, you won't be sized correctly because capital is elsewhere.
- 70%+ of Polymarket traders lose money. Overtrading is a primary driver.

**Prevention:**
- Strict maximum open positions (recommend 3-5 active markets)
- Require minimum edge threshold before placing bet (e.g., odds differ from assessment by >15%)
- Minimum research quality gates (PROJECT.md: 10 sources, ★3 rating)
- Daily trade count limits

**Warning signs:**
- Bot is active in >10 markets simultaneously
- Average position size is shrinking over time
- Fee costs are >20% of losing trades

**Phase to address:** **Phase 1 — Core Loop** (position discipline must be built in)

---

### Pitfall 3: Source Quality — Using Low-Rated Sources

**What goes wrong:** Bot makes decisions based on unreliable, biased, or low-quality sources. Bad inputs → bad outputs. The AI hallucinates or misinterprets low-quality content.

**Why it happens:** SOURCE-01 and SOURCE-02 (★3 minimum, 10 sources) exist in requirements but aren't enforced. Bot takes shortcuts. News sources are unverified. Social media (Twitter/X) is treated as authoritative.

**Consequences:**
- AI hallucinations on low-quality content: AI tools generate confident but wrong outputs from bad sources
- Confirmation bias: Bot favors sources that support existing thesis
- Missed signals: Good sources that contradict thesis are ignored

**Prevention:**
- Enforce SOURCE-01: Only sources with ★3+ rating used for decisions
- Enforce SOURCE-02: Minimum 10 sources researched before decision
- Source database with rating decay (older sources lose relevance)
- Separate source categories: primary (authoritative), secondary (supporting), excluded (unreliable)

**Warning signs:**
- Bot makes decisions with <10 sources
- Sources include anonymous accounts or unverified accounts
- Same 2-3 sources used repeatedly
- No source diversity across categories (e.g., only Twitter)

**Phase to address:** **Phase 2 — Source Intelligence** (source rating system and enforcement)

---

### Pitfall 4: Resolution Rule Blindness

**What goes wrong:** Bot bets on an outcome it believes is "correct" per common sense, but the market resolves differently due to technical definitions in the resolution rules.

**Why it happens:** Prediction markets resolve based on specific written definitions, not intuitive reality. "Will Zelenskyy wear a suit?" resolved as NO because the outfit was deemed a blazer, not a suit — despite looking formal.

**Consequences:**
- Being directionally correct but resolution-wrong
- Losses despite accurate prediction of actual events
- The Markitzero case and others where logic didn't match contract definition

**Prevention:**
- Before any bet: Read and verify resolution rules for that specific market
- Flag markets with vague definitions as high-risk
- Build resolution rule checker into research phase
- Categories with ambiguous terms (Politics, Fashion) require extra caution

**Warning signs:**
- Market question uses words like "official", "publicly available", "launch", "formal"
- Market is about definitions (suit, suit vs blazer, etc.)
- No explicit source cited for resolution

**Phase to address:** **Phase 2 — Source Intelligence** (resolution rule verification as part of research)

---

## Moderate Pitfalls

Issues that degrade performance but don't cause catastrophic failures.

---

### Pitfall 5: Bankroll Management Failures

**What goes wrong:** No daily loss limits. Position sizing doesn't account for account equity. Capital gets locked in long-duration markets, missing better opportunities.

**Why it happens:** BANK-01 (daily bankroll limit) exists in requirements but implementation is overlooked. "Winner's curse" — bot sizes up after wins, down after losses (wrong).

**Prevention:**
- Daily loss limit: Stop trading after losing X% of daily bankroll
- Per-bet stake = f(account_size, not absolute) — equity-based sizing
- Track capital efficiency: returns locked in 6-month markets vs 5-minute markets
- Never recoup losses with larger bets

**Warning signs:**
- Same bet size regardless of account performance
- No daily loss tracking
- Capital locked in markets >24h (outside PROJECT.md scope)

**Phase to address:** **Phase 1 — Core Loop** (bankroll management is fundamental)

---

### Pitfall 6: API Rate Limit Failures

**What goes wrong:** Bot exceeds Polymarket's rate limits. Requests get throttled (delayed) or rejected (429). Critical orders (stops, takes) fail. Bot misses opportunities or executes at wrong prices.

**Why it happens:** Polymarket uses Cloudflare throttling (queues requests before rejecting). Trading endpoints have dual-tier limits: burst (3,500/10s for POST /order) and sustained (36,000/10min). Polling instead of WebSocket burns through limits fast.

**Specific limits that matter:**
- CLOB general: 9,000 req/10s
- Order placement burst: 3,500/10s
- Order placement sustained: 36,000/10min (~60/s average)
- WebSocket: unlimited subscriptions (as of Jan 2026)

**Prevention:**
- Use WebSocket for real-time data (orderbooks, prices) — don't poll
- Use batch endpoints (POST /books) instead of loops
- Implement exponential backoff with jitter for 429s
- Monitor X-RateLimit-Remaining header
- Get Verified tier in Builder Program for higher limits
- ThrottleDetector: monitor response latency for early throttling detection

**Warning signs:**
- Response times spike from 50ms to 500ms
- 429 errors appearing
- Orders occasionally fail silently

**Phase to address:** **Phase 1 — Core Loop** (rate limit handling is foundational infrastructure)

---

### Pitfall 7: Timing — Betting Too Late

**What goes wrong:** Bot enters a position after the market has already moved. The mispricing has been corrected. Bot pays for information it already had.

**Why it happens:** Delayed research → delayed entry. News-based markets move fast. Professional traders use bots monitoring headlines 24/7. The retail bot wakes up to stale data.

**Prevention:**
- Real-time source monitoring (Twitter/X feeds, news APIs)
- WebSocket for immediate price updates
- Define maximum research duration (e.g., 5-minute markets need research in <60 seconds)
- Early exit strategy: if thesis is already priced in, exit rather than hold for resolution

**Warning signs:**
- Average entry price is always worse than initial signal price
- Winning trades have low margins despite correct direction
- Bot often enters after major price movements

**Phase to address:** **Phase 1 — Core Loop** (timing is critical for 5-minute markets specifically)

---

### Pitfall 8: Over-Relying on AI Without Validation

**What goes wrong:** AI generates confident but wrong analysis. Hallucinations. The bot trusts AI output without verification. AI misreads social media posts (Lobstar Wilde incident triggered by "melodramatic 4 SOL request").

**Why it happens:** LLMs are text predictors with wallet access. GPT-5 in Alpha Arena lost 62% because it "tried to be a general-purpose trader" — it conflicted with itself and overleveraged. AI that isn't constrained produces garbage.

**Consequences:**
- $441K lost in Lobstar Wilde incident (AI sent tokens to wrong address based on misinterpreted social post)
- 62% portfolio loss (GPT-5 in controlled test)
- AI hallucinations propagating into bad trades

**Prevention:**
- AI generates signals, humans (or rule-based validators) confirm before execution
- Constrain AI to narrow domain (Polystrat's success: specialized, not general)
- Never let AI have unrestricted wallet access
- AI output requires structured validation before order placement
- Human-in-the-loop still produces best risk-adjusted returns (34% ROI vs 29% fully automated)

**Warning signs:**
- AI can place orders without validation
- Bot has full wallet access with no spending limits
- No domain constraints on AI behavior
- AI output used without sanity checks

**Phase to address:** **Phase 2 — AI Decision Layer** (AI constraints and validation)

---

### Pitfall 9: Market Manipulation Misreading

**What goes wrong:** Bot interprets artificial price movements as genuine signals. 25% of Polymarket trading volume may involve wash trading (Columbia University, Nov 2025). Whales manipulate prices, bot follows false signals.

**Why it happens:** Prediction markets have low liquidity and thin order books. Wash trading creates false volume/price signals. Whale wallets can move prices intentionally to trigger stop losses or attract followers.

**Prevention:**
- Verify volume with order book depth before trusting price moves
- Check if price movement corresponds to genuine news/events
- Wider spreads in low-liquidity markets = less reliable signals
- Use limit orders, not market orders in thin books
- Time-weighted average price (TWAP) for entry in uncertain conditions

**Warning signs:**
- Large price moves with no corresponding news
- Thin order book depth despite large price moves
- Sudden spikes in previously quiet markets
- Trading volume disproportionately large relative to market size

**Phase to address:** **Phase 2 — Source Intelligence** (market quality scoring)

---

## Minor Pitfalls

Issues that degrade performance gradually but can be fixed without major rework.

---

### Pitfall 10: Category-Specific — Crypto Volatility

**What goes wrong:** Crypto markets on Polymarket (tokenized events, ETF approvals, etc.) exhibit extreme volatility. Bet placed at 0.60 moves to 0.20 in minutes due to exchange movements unrelated to the specific question.

**Why it happens:** Crypto is levered to broader market sentiment. Bitcoin moves 5-10% on macro news. Crypto prediction markets are second-order (will ETH ETF approve?) but move with BTC.

**Prevention:**
- Crypto markets require faster research cycles
- Separate research pipelines for Crypto vs News vs Sports
- Wider position sizing guards for crypto volatility
- Avoid crypto markets during high-volatility macro events

**Phase to address:** **Phase 3 — Category Systems** (category-specific research optimization)

---

### Pitfall 11: Category-Specific — News Manipulation

**What goes wrong:** False news articles, manipulated headlines, or coordinated campaigns shift prediction markets. Bot acts on fake information. By the time correction happens, bot has already lost.

**Why it happens:** AI-generated misinformation is cheap and scalable. Bad actors can manufacture news articles in seconds. Prediction markets react to headlines, not fact-checking.

**Prevention:**
- Source verification before using news as signal
- Cross-reference with authoritative sources (official announcements, not rumored)
- Minimum source quality thresholds
- Delay between news and bet (let initial volatility settle)
- Track correction frequency of sources in rating system

**Phase to address:** **Phase 3 — Category Systems** (news-specific research with verification)

---

### Pitfall 12: Low-Liquidity Market Orders

**What goes wrong:** Bot uses market orders in thin books. Executes at 0.85 when fair value is 0.50. Spread destroys edge before the event resolves.

**Why it happens:** Prediction markets vary widely in liquidity. Big political/macro markets have tight spreads. Niche markets (Tyson vs Paul, fashion questions) have wide spreads.

**Prevention:**
- Always use limit orders — never market orders
- Check order book depth before entering
- Skip markets where spread >10% of price
- TWAP/VWAP for large positions in thin books

**Phase to address:** **Phase 1 — Core Loop** (order type enforcement)

---

### Pitfall 13: Holding to Resolution Instead of Exiting Early

**What goes wrong:** Bot holds winning position until market resolves, missing the opportunity to take profit earlier. New information changes odds. Capital stays locked. Resolution disputes occur.

**Why it happens:** Greed. "The market will resolve my way eventually." But holding introduces unnecessary risk: disputes, reversals, oracle failures.

**Prevention:**
- Take-profit targets (e.g., exit at 2x profit, not hold for max)
- Define exit criteria: "If odds reach X, take profit Y%"
- Monitor for thesis change signals post-entry
- Position is not free until closed

**Phase to address:** **Phase 1 — Core Loop** (exit strategy definition)

---

## Phase-Specific Warning Matrix

| Phase | Topics | Primary Pitfalls to Avoid |
|-------|--------|--------------------------|
| **Phase 1** | Core Loop | Position limits, overtrading, bankroll mgmt, rate limits, timing, low-liquidity orders, exit strategy |
| **Phase 2** | Source Intelligence | Source quality, resolution rules, AI validation, market manipulation misreading |
| **Phase 3** | Category Systems | Crypto volatility, news manipulation, domain-specific edge preservation |
| **Phase 4+** | Scaling | Correlated strategies with other bots, institutional front-running, market impact |

---

## Summary: Non-Negotiable Safety Features

These must exist before any real capital is deployed:

1. **Position size limits** — Max 5-10% per market
2. **Daily loss halt** — Stop after X% daily loss
3. **Kill switch** — Circuit breaker at 10%/25% drawdown
4. **Source quality gates** — ★3 minimum, 10 source minimum
5. **Order type enforcement** — Limit orders only
6. **Rate limit handling** — Exponential backoff, WebSocket for data
7. **AI output validation** — Human/rule-based check before execution
8. **No unrestricted wallet access** — Spending limits on all operations

---

## Sources

- [Whales Market: Common mistakes on prediction markets](https://whales.market/blog/common-mistakes-on-prediction-market/) — MEDIUM confidence
- [SwapHunt: Why You're Losing Money on Polymarket](https://medium.com/@swaphunt/why-youre-losing-money-on-polymarket-even-when-youre-right-4126e0ba194a) — MEDIUM confidence
- [Pump Parade: AI Trading Bots Lost $441K](https://pumpparade.medium.com/ai-trading-bots-lost-441k-in-one-error-heres-what-actually-works-and-what-doesn-t-4f04f890c189) — MEDIUM confidence
- [PickMyTrade: Top 5 Automation Mistakes](https://blog.pickmytrade.trade/top-5-automation-mistakes-blow-accounts-2025/) — MEDIUM confidence
- [AgentBets: Polymarket Rate Limits Guide](https://agentbets.ai/guides/polymarket-rate-limits-guide/) — HIGH confidence (primary source)
- [Columbia Study: Polymarket wash trading (via CoinDesk)](https://www.coindesk.com/markets/2025/11/07/polymarket-s-trading-volume-may-be-25-fake-columbia-study-finds) — MEDIUM confidence
- [Reddit r/PredictionsMarkets: Bot with 68% win rate still loses](https://www.reddit.com/r/PredictionsMarkets/comments/1s46vn7/my_polymarket_bot_wins_68_of_the_time_and_still/) — LOW confidence (anecdotal)
