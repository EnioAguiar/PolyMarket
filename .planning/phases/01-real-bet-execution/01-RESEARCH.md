# Phase 1 Research: EOA Type 0 on Polymarket

**Date:** 2026-05-11
**Phase:** 01-real-bet-execution

## Research Question

How to use EOA Type 0 (signature type 0) with Polymarket CLOB client for real bet execution?

## Key Findings

### Signature Types

| Type | Value | Description |
|------|-------|-------------|
| EOA | `0` | Standard Ethereum wallet (MetaMask). Funder is the EOA address and will need MATIC for gas. |
| POLY_PROXY | `1` | Existing Polymarket proxy wallet (Magic Link users) |
| GNOSIS_SAFE | `2` | Gnosis Safe wallet flow |
| POLY_1271 | `3` | Deposit wallet flow with ERC-1271 validation |

### EOA vs POLY_1271 Differences

**EOA (type 0):**
- Funder = signer = EOA address
- Need USDC on Polygon for buying
- Need MATIC for gas (Polygon transactions)
- Simpler flow - no ERC-1271 wrapping

**POLY_1271 (type 3):**
- Funder = deposit wallet address (separate from signer)
- Uses pUSD via deposit contract
- More complex setup

### USDC Address on Polygon

USDC contract on Polygon (Mainnet): `0x3c499c542cEF5E6931f0FE6561f6c0D3EaB0f85D`

Note: Previous code used pUSD address `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB` which is incorrect for EOA mode.

### EOA Flow

1. Create ClobClient with `signatureType: SignatureTypeV2.EOA` and `funderAddress: eoaAddress`
2. Derive API credentials via L1 auth
3. Create market/limit orders
4. Orders signed by EOA, executed on Polygon

### Allowance Requirements

For EOA:
- **BUY orders**: USDC allowance >= spending amount
- **SELL orders**: Conditional token allowance >= selling amount

Need to call `updateBalanceAllowance({ asset_type: AssetType.COLLATERAL })` for USDC.

### Market Order Price Parameter

From docs:
> The `price` field on market orders acts as a **worst-price limit** (slippage protection), not a target execution price.

For FOK market orders:
- BUY: `amount` = dollar amount to spend, `price` = worst-price limit
- SELL: `amount` = number of shares, `price` = worst-price limit

## Implementation Changes Needed

### src/api/clob.ts

1. Change `SignatureTypeV2.POLY_1271` → `SignatureTypeV2.EOA` (type 0)
2. Remove `DEPOSIT_WALLET_ADDRESS` env var requirement
3. Set `funderAddress` = EOA address (same as signer)
4. Fix `getUSDCBalance()` to use USDC contract, not pUSD
5. USDC contract address: `0x3c499c542cEF5E6931f0FE6561f6c0D3EaB0f85D`

### src/execution/limit-orders.ts

1. Import actual `placeMarketOrder`/`placeLimitOrder` from clob.ts
2. Add bankroll validation (5% fixed)
3. Add slippage check before order
4. Return txHash in OrderResult

### Railway Environment Variables

Remove:
- `DEPOSIT_WALLET_ADDRESS`

Add:
- `PRIVATE_KEY` (EOA wallet private key)
- Fund EOA with USDC + MATIC

## Sources

- https://docs.polymarket.com/api-reference/authentication (signature types table)
- https://docs.polymarket.com/trading/orders/create (market order flow)
- https://docs.polymarket.com/trading/deposit-wallets (reference only - not using)