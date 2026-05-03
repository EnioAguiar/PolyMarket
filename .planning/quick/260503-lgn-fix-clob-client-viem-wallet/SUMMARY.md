---
status: complete
date: 2026-05-03
quick_id: 260503-lgn
slug: fix-clob-client-viem-wallet
---

## Fix CLOB Client Viem Wallet

**Completed:** 2026-05-03

### Problem
`@polymarket/clob-client-v2` expects a `ClobSigner` (viem `WalletClient`), but the code was using `ethers.Wallet`. This would cause runtime errors when placing orders.

### Solution
Replaced `ethers.Wallet` with viem's `privateKeyToAccount` + `createWalletClient`:

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

const account = privateKeyToAccount(privateKey as `0x${string}`);
const walletClient = createWalletClient({
  account,
  transport: http(),
  chain: polygon,
});

clobClient = new ClobClient({ host, chain, signer: walletClient });
```

### Files Changed
- `src/api/clob.ts` — Replaced ethers Wallet with viem wallet client

### Verification
- Build passes ✓

### Notes
- viem 2.48.1 already installed (dependency of @polymarket/clob-client-v2)
- PRIVATE_KEY env var must have `0x` prefix (hex string)
- Chain: Polygon (config.polymarket.chainId)