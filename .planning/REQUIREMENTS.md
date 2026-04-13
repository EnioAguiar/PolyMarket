# Requirements: Polymarket Bot

**Defined:** 2026-04-13
**Core Value:** Make profitable short-term betting decisions through systematic AI-powered research, source classification, and disciplined bankroll management.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Market Monitoring (Core Loop)

- [ ] **MON-01**: Connect to Polymarket API (Gamma + CLOB) for market discovery
- [ ] **MON-02**: Fetch current odds and orderbook depth for any market
- [ ] **MON-03**: Filter markets by category (Crypto, Financial, News, Sports)
- [ ] **MON-04**: Filter markets by time horizon (5min to 24h only)
- [ ] **MON-05**: WebSocket connection for real-time orderbook updates

### Research Pipeline

- [ ] **RES-01**: Research pipeline per category (Crypto APIs, Financial APIs, News, Sports)
- [ ] **RES-02**: Source database with star rating (★1-5), minimum ★3 to use
- [ ] **RES-03**: Minimum 10 sources researched before bet decision
- [ ] **RES-04**: Source classification by recency, quality, and confidence
- [ ] **RES-05**: Category-specific source feeds (exchange APIs, Glassnode, news APIs, sports APIs)

### AI Decision Engine

- [ ] **AI-01**: LLM integration for probability estimation from research signals
- [ ] **AI-02**: Chain-of-thought logging for all decisions
- [ ] **AI-03**: AI output validation (rule-based sanity check before execution)
- [ ] **AI-04**: Dry-run mode (log decisions without executing trades)

### Bet Execution

- [ ] **EXEC-01**: Wallet connection via Polymarket CLOB API
- [ ] **EXEC-02**: Automatic order placement (market orders)
- [ ] **EXEC-03**: Order status tracking (confirmations, fills, rejections)
- [ ] **EXEC-04**: Slippage protection (abort if price moved beyond threshold)
- [ ] **EXEC-05**: Limit orders (place bids at specific prices)

### Bankroll Management

- [ ] **BANK-01**: Max position size per bet (5-10% of bankroll)
- [ ] **BANK-02**: Daily loss limit (stop trading if threshold exceeded)
- [ ] **BANK-03**: Drawdown kill switch (halt all trading on extreme drawdown)
- [ ] **BANK-04**: Bankroll tracking (running balance, open positions, P&L)
- [ ] **BANK-05**: Kelly Criterion or fixed % position sizing

### Source Intelligence

- [ ] **SRC-01**: Source database with categories, ratings, and feed configs
- [ ] **SRC-02**: Weighted confidence scoring (multiple low-rated sources vs single high-rated)
- [ ] **SRC-03**: Resolution rule verification before bet placement
- [ ] **SRC-04**: Source quality enforcement (code-enforced ★3 minimum, not aspirational)

### Deployment

- [ ] **DEPL-01**: Railway deployment with cron scheduler
- [ ] **DEPL-02**: Health checks and self-ping
- [ ] **DEPL-03**: Secrets management (API keys, wallet key in env vars)
- [ ] **DEPL-04**: Structured logging (Pino for TS, python-json-logger for Python)
- [ ] **DEPL-05**: Graceful shutdown (finish in-progress trades before stopping)
- [ ] **DEPL-06**: Multi-instance mutex lock (prevent duplicate trades)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Research

- **SRC-05**: Multi-model LLM consensus reasoning (Claude + GPT + DeepSeek)
- **SRC-06**: Cross-platform aggregation (Kalshi, PredictIt odds)
- **SRC-07**: Whale tracking via on-chain data

### Advanced Execution

- **EXEC-06**: Conditional orders (trigger when price crosses threshold)
- **EXEC-07**: Multi-market execution (correlated markets simultaneously)
- **EXEC-08**: Auto-compounding (reinvest profits on schedule)

### Scaling

- **DEPL-07**: Event-driven triggers (WebSocket price event instead of pure cron)
- **DEPL-08**: CI/CD pipeline (GitHub Actions → Railway)
- **DEPL-09**: Alerting (Discord/PagerDuty on bot failure)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Long-term bets (>24h) | Too much exposure, not the focus |
| Manual betting | Fully automated execution only |
| Non-Polymarket markets | Polymarket only for v1 |
| Custom UI for market explorer | Polymarket.com already does this |
| Social features (leaderboards, chat) | Bloat the core loop |
| Building own news crawler | Use NewsData.io/NewsAPI instead |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MON-01 | Phase 1 | Pending |
| MON-02 | Phase 1 | Pending |
| MON-03 | Phase 1 | Pending |
| MON-04 | Phase 1 | Pending |
| MON-05 | Phase 4 | Pending |
| RES-01 | Phase 2 | Pending |
| RES-02 | Phase 2 | Pending |
| RES-03 | Phase 2 | Pending |
| RES-04 | Phase 2 | Pending |
| RES-05 | Phase 2 | Pending |
| AI-01 | Phase 2 | Pending |
| AI-02 | Phase 2 | Pending |
| AI-03 | Phase 2 | Pending |
| AI-04 | Phase 1 | Pending |
| EXEC-01 | Phase 1 | Pending |
| EXEC-02 | Phase 1 | Pending |
| EXEC-03 | Phase 1 | Pending |
| EXEC-04 | Phase 3 | Pending |
| EXEC-05 | Phase 3 | Pending |
| BANK-01 | Phase 1 | Pending |
| BANK-02 | Phase 1 | Pending |
| BANK-03 | Phase 1 | Pending |
| BANK-04 | Phase 1 | Pending |
| BANK-05 | Phase 3 | Pending |
| SRC-01 | Phase 2 | Pending |
| SRC-02 | Phase 2 | Pending |
| SRC-03 | Phase 2 | Pending |
| SRC-04 | Phase 2 | Pending |
| DEPL-01 | Phase 1 | Pending |
| DEPL-02 | Phase 1 | Pending |
| DEPL-03 | Phase 1 | Pending |
| DEPL-04 | Phase 1 | Pending |
| DEPL-05 | Phase 4 | Pending |
| DEPL-06 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after auto-initialization*
