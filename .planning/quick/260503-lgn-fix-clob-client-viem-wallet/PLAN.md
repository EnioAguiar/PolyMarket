---
quick_id: 260503-lgn
slug: fix-clob-client-viem-wallet
status: complete
date: 2026-05-03
---

## Fix CLOB Client Viem Wallet

Replace ethers.Wallet with viem wallet client in createClobClient().

### Tasks

1. **Replace ethers Wallet with viem**
   - files: src/api/clob.ts
   - action: Import viem, create WalletClient from privateKeyToAccount
   - verify: npm run build passes
   - done: true

### must_haves
- truths:
  - "CLOB client uses viem WalletClient (not ethers)"
  - "Bot builds without errors"
- artifacts:
  - path: "src/api/clob.ts"
    provides: "createClobClient() uses viem privateKeyToAccount"