---
quick_id: 260503-rbn
slug: real-balance-no-hardcoded
status: completed
date: 2026-05-03
---

## Remover hardcoded 1000 e usar saldo real no bankroll

### Context

Problema: O bot usava `1000` hardcoded como bankroll em vários lugares, causando que os safety checks bloqueassem todas as apostas incorretamente. Com $10.21 USDC real, o bankroll deveria ser ~$5.10.

### Changes

1. **src/websocket/integration.ts**
   - Removido `const bankroll = 1000`
   - `safetyModule.checkBet()` agora usa `this.bankroll` internamente

2. **src/main.ts**
   - Adicionado `getUSDCBalance()` para pegar saldo real
   - Calcula `effectiveBankroll = realBalance * bankrollUsagePct`

3. **src/index.ts**
   - Mesmo pattern: saldo real → bankroll efetivo
   - `setSafetyModule()` chamado antes do `setCycleManager()`

4. **src/safety/types.ts**
   - `BetCheckInput.bankroll` agora é opcional

5. **src/safety/index.ts**
   - Usa `this.bankroll` como fallback quando bankroll não é passado

6. **src/safety/position-limits.ts**
   - Refatorado para receber bankroll como parâmetro separado
   - `PositionSizeCheckInput` não precisa mais de bankroll

7. **src/api/telegram.ts**
   - Default em `getBankrollStatus()` mudou de `1000` → `0`

### Resultado

- Saldo real: $10.21 USDC
- Bankroll efetivo (50%): $5.10
- Aposta máxima (8%): $0.41

### Verification

- Build passa ✅
- 7 arquivos modificados, 27 insertions, 19 deletions