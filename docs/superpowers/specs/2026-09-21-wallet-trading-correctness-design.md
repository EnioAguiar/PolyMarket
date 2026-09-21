# Wallet & Trading Correctness — Design Spec

**Date:** 2026-09-21
**Status:** Draft — pending review
**Sub-project 1 of 3** (see README.md "Próximos Passos" for the other two: infra resilience, safety module fixes)

## Goal

Make the bot sign and fund orders against the account's real Deposit Wallet instead of the bare EOA, so a real order placed by the bot settles instead of being rejected by the CLOB. This is the blocking prerequisite for every other trading fix — nothing downstream matters if the signature/funder pairing is wrong.

## Background (evidence, not restated here in full — see README.md)

This session confirmed on-chain and via the CLOB API itself:
- The Polymarket account created for this bot's EOA (`0x18a658c68cb3b21a0730F09703cF42c6E5BfD3cE`) is a **Deposit Wallet** at `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` — confirmed by decoding its deployed bytecode (embeds the Deposit Wallet Factory address `0x00000000000Fb5C9ADea0298D729A0CB3823Cc07` and the EOA as owner).
- A real test bet was placed successfully through the Polymarket UI against that Deposit Wallet, proving the account is fully functional — the bot's code just isn't configured to use it.
- `PUSD_ADDRESS` in `src/api/clob.ts` is a misnomer: it holds the correct address for USDC.e (`0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`), not pUSD. The real pUSD contract is `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB`.
- `getUSDCBalance()` reads the balance of the **EOA**, but after any deposit via Polymarket's Bridge API, the spendable balance (pUSD) lives on the **Deposit Wallet**, not the EOA. Today this function will silently report a wrong bankroll.
- `@polymarket/clob-client-v2` is pinned to `1.0.3-canary.0`; stable `1.1.0` has shipped since (many releases in between). `@polymarket/builder-signing-sdk` is obsolete under CLOB V2 (builder auth moved to a `builderCode` order field).

## Non-Goals

- Session Keys (separate credential model, gated behind Polymarket's Builder Program beta approval — tracked as a future improvement, not blocking).
- Safety module bug fixes (`recordTrade()` never called, kill switch broken, etc.) — sub-project 3.
- RPC fallback list and geoblock startup guard — sub-project 2.
- Reconnecting `research/` and `ai/` to the decision path — out of scope until trading itself is proven correct.
- Automating the collateral deposit (wrap/bridge) inside the bot — this remains a one-time manual action via Polymarket's Bridge API or UI, not bot-driven.

## Design

### 1. Dependency upgrade

`package.json`:
- `@polymarket/clob-client-v2`: `^1.0.3-canary.0` → `^1.1.0`.
- Remove `@polymarket/builder-signing-sdk` entirely (dependency + any import, currently unused in `src/`).
- Verify `SignatureTypeV2.POLY_1271` still exists under that name in `1.1.0` (checked already: yes, unchanged in the `1.1.0` type definitions).

### 2. Wallet address constants (`src/api/clob.ts`)

Replace the single misnamed constant with two correctly named ones:

```typescript
const USDCE_ADDRESS = getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'); // USDC.e — bridge-deposit source token, NOT collateral
const PUSD_ADDRESS = getAddress('0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB'); // pUSD — actual CLOB collateral, lives on the Deposit Wallet
```

### 3. Funder address resolution

Add a function parallel to the existing `getWalletAddress()` (which resolves the **signer** EOA):

```typescript
export function getFunderAddress(): `0x${string}` {
  const depositWallet = process.env.DEPOSIT_WALLET_ADDRESS;
  if (!depositWallet) {
    throw new Error('DEPOSIT_WALLET_ADDRESS environment variable is required');
  }
  return getAddress(depositWallet) as `0x${string}`;
}
```

`.env` / `.env.example`: `DEPOSIT_WALLET_ADDRESS` documented as "the Deposit Wallet account address shown in your Polymarket profile — NOT the MetaMask/EOA address, and NOT a value you compute locally." (The current `.env` value is stale — a different, unrelated Proxy Wallet account from a Google/Magic Link login. It must be updated to `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` for this specific account, or to whatever address the operator's own Polymarket profile shows if that ever changes.)

### 4. `createClobClient()` signature type and funder

Current (lines 35-94 of `src/api/clob.ts`) hardcodes `signatureType: SignatureTypeV2.EOA` and `funder = account.address` (i.e., funder == signer). Change to:

```typescript
const funder = getFunderAddress();
```

Both `ClobClient` constructions (the temporary one used for `createOrDeriveApiKey()`, and the final authenticated one) keep `funderAddress: funder`, but `funder` now holds `getFunderAddress()`'s Deposit Wallet address instead of `account.address`. Both also change `signatureType: SignatureTypeV2.EOA` to `signatureType: SignatureTypeV2.POLY_1271`.

The `walletClient` (signer) construction does not change — the EOA still signs, it just signs *for* the Deposit Wallet now instead of for itself.

### 5. Balance reading

Rename `getUSDCBalance()` → `getPUSDBalance()` (via `lsp rename`, not manual find/replace — it has 3 call sites across `src/index.ts`, `src/main.ts`, `src/api/telegram.ts`) and change its body to:
- Read `PUSD_ADDRESS` (not `USDCE_ADDRESS`).
- Read the balance of `getFunderAddress()` (the Deposit Wallet), not `getWalletAddress()` (the EOA).

Return type and error-handling behavior (`return 0` on failure, logged) stay the same — no caller changes needed beyond the rename.

### 6. Error handling: wrong signature type is a real failure mode

The CLOB backend, when queried with `POLY_1271` for a funder that isn't actually a deployed smart-contract wallet, returns HTTP 404 `"no deposit wallet found for owner"` (confirmed empirically this session on a not-yet-deployed wallet). `createOrDeriveApiKey()` and `updateBalanceAllowance()` already have try/catch with `logger.warn`/`logger.error` around them in the current code — that's sufficient; no new retry/fallback logic is being added here (that would be silent-failure scope creep). If the Deposit Wallet is ever un-deployed again (e.g., a fresh account), the existing warning logs already surface the problem; an operator reading logs will see the 404 and know to complete Polymarket's "Ativar Negociação" flow first.

## Testing

- `tests/` has no existing coverage for `src/api/clob.ts` (confirmed: CLOB client requires live credentials, per `.planning` history preserved in git). This spec does not add live-credential integration tests — matches existing project convention.
- Add a unit test for the one pure-logic change that's actually unit-testable without a live client: `getFunderAddress()` throwing when `DEPOSIT_WALLET_ADDRESS` is unset, and returning the checksummed address when set. This is a real edge case (a fresh clone without the env var configured) worth a regression test.
- Manual verification (already partially done this session): a real order placed against the configured `funderAddress` with `POLY_1271` either succeeds (200, order fills or rests) or fails with a specific, previously-seen error class (404 no-deposit-wallet, or a signature-rejection) — both are now understood failure modes, not mysteries.

## Success Criteria

- [ ] `npm run build` passes with `@polymarket/clob-client-v2@^1.1.0` and no `@polymarket/builder-signing-sdk` reference anywhere in `src/` or `package.json`.
- [ ] `createClobClient()` constructs both `ClobClient` instances with `signatureType: SignatureTypeV2.POLY_1271` and `funderAddress` resolved from `DEPOSIT_WALLET_ADDRESS`.
- [ ] `getPUSDBalance()` (renamed from `getUSDCBalance()`) reads `PUSD_ADDRESS` balance of the funder address, all 3 call sites still compile and pass their existing type checks.
- [ ] `.env.example` documents `DEPOSIT_WALLET_ADDRESS` correctly (Deposit Wallet account address, not EOA, not computed locally).
- [ ] New unit test for `getFunderAddress()` passes.
- [ ] Manual smoke test: bot's `createClobClient()` + `getPUSDBalance()` run against the real funded account (`0xA53EE08...`) and report the real pUSD balance (not 0, not the EOA's unrelated USDC-native balance).
