---
quick_id: 260503-bnk
slug: bankroll-percentage-telegram-logs
status: pending
date: 2026-05-03
---

## Bankroll Percentage + Telegram Status Logs

Implementar sistema de porcentagem de bankroll e logs de status no Telegram.

### Context

- Usuário tem ~$10 USDC na wallet
- Bot usa bankroll placeholder de 1000
- Precisa ler saldo real e usar X% do bankroll
- Telegram não mostra status do bot (o que está funcionando, erros, etc)

### must_haves
- truths:
  - "Bankroll usa X% do saldo real da wallet"
  - "Telegram mostra status do bot: WS conectado, mercados processados, erros"
  - "Posição máxima baseada em % configurável"
- artifacts:
  - path: "src/api/clob.ts"
    provides: "getWalletBalance() retorna USDC real"
  - path: "src/api/telegram.ts"
    provides: "notifyStatus() envia logs de funcionamento"
  - path: "src/config/index.ts"
    provides: "BANKROLL_USAGE_PCT configurável"

### Tasks

1. **Add getWalletBalance function in clob.ts**
   - files: src/api/clob.ts
   - action: Read USDC balance from wallet via CLOB client
   - verify: Build passes

2. **Add BANKROLL_USAGE_PCT config**
   - files: src/config/index.ts, src/types/index.ts
   - action: Add configurable % of bankroll to use per bet (ex: 0.05 = 5%)
   - verify: Build passes

3. **Update SafetyModule to use real balance**
   - files: src/safety/index.ts
   - action: Read real balance, use BANKROLL_USAGE_PCT instead of fixed 8%
   - verify: Build passes

4. **Add Telegram status notifications**
   - files: src/api/telegram.ts
   - action: Add notifyBotStatus() - logs WS connected, markets processed, errors
   - verify: Build passes

5. **Integrate status notifications into main loop**
   - files: src/websocket/integration.ts, src/index.ts
   - action: Call notifyBotStatus() periodically
   - verify: Build passes