# Requirements: Polymarket Bot

**Defined:** 2026-05-03
**Core Value:** Make profitable short-term betting decisions through systematic AI-powered research, source classification, and disciplined bankroll management.

## v1 Requirements

### Execution

- [ ] **EXEC-01**: Bot places market orders via CLOB client (not dry-run)
- [ ] **EXEC-02**: Position size follows bankroll rules (5% fixed, min 5 tokens)
- [ ] **EXEC-03**: Slippage protection triggers if price moves beyond threshold
- [ ] **EXEC-04**: Order confirmation logged with transaction hash

### Research

- [ ] **RES-01**: ResearchChain.collectSignals() fetches from all available sources
- [ ] **RES-02**: Minimum 10 sources enforced before decision
- [ ] **RES-03**: Bayesian confidence scoring applied to aggregate signals
- [ ] **RES-04**: Research quality affects position size (high quality = up to 10%, low quality = up to 5%)

### AI

- [ ] **AI-01**: MiniMax receives research summary and confidence
- [ ] **AI-02**: AI outputs probability estimate with reasoning
- [ ] **AI-03**: AI decision integrated into bet/skip flow

## v2 Requirements

### Monitoring

- **MON-01**: WebSocket reconnects with exponential backoff on disconnect
- **MON-02**: Heartbeat (PING/PONG) every 10 seconds to keep connection alive

### Social Sources

- **SOCL-01**: Twitter adapter uses official API (Tweepy)
- **SOCL-02**: Reddit adapter uses official API (PRAW)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Limit orders | Market orders first, limit orders v2 |
| Kelly Criterion | Fixed 5% is simpler and less prone to AI hallucination |
| Multi-wallet | Single wallet for v1 |
| Non-Polymarket markets | Polymarket only for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EXEC-01 | Phase 1 | Pending |
| EXEC-02 | Phase 1 | Pending |
| EXEC-03 | Phase 1 | Pending |
| EXEC-04 | Phase 1 | Pending |
| RES-01 | Phase 2 | Pending |
| RES-02 | Phase 2 | Pending |
| RES-03 | Phase 2 | Pending |
| RES-04 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 11 total
- Mapped to phases: 11
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-03*
*Last updated: 2026-05-03 after v1.1 milestone definition*