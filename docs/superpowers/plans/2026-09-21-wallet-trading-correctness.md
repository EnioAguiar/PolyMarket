# Wallet & Trading Correctness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconfigure the bot's CLOB client to sign and fund orders against the account's real Deposit Wallet (`POLY_1271`) instead of the bare EOA (`EOA`), and fix the bankroll balance read to look at the Deposit Wallet's pUSD instead of the EOA's unrelated native-USDC balance.

**Architecture:** No new modules. All changes are inside `src/api/clob.ts` (constants, a new address-resolution function, and the existing `createClobClient()`/balance-reading functions), plus `package.json` (dependency versions) and `.env`/`.env.example` (the Deposit Wallet address value and its documentation).

**Tech Stack:** TypeScript, `@polymarket/clob-client-v2`, `viem`, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-21-wallet-trading-correctness-design.md`

## Global Constraints

- Deposit Wallet address for this account: `0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (confirmed on-chain this session — do not recompute or guess a different value).
- pUSD contract address: `0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB`.
- `@polymarket/clob-client-v2` target version: `^1.1.0`.
- No new test framework or mocking library — this repo uses plain Vitest with no mocks anywhere in `tests/` (pure-function tests only); match that convention.
- Do not add retry/fallback logic beyond what's specified — the spec explicitly rejects that as scope creep (see spec Section 6).

---

### Task 1: Add `getFunderAddress()`

**Files:**
- Modify: `src/api/clob.ts` (add function after `getWalletAddress()`, i.e. after line 33)
- Test: `tests/funder-address.test.ts`

**Interfaces:**
- Produces: `export function getFunderAddress(): \`0x${string}\`` — reads `process.env.DEPOSIT_WALLET_ADDRESS`, throws `Error('DEPOSIT_WALLET_ADDRESS environment variable is required')` if unset, otherwise returns the checksummed address via viem's `getAddress()` (already imported in this file).

- [ ] **Step 1: Write the failing test**

Create `tests/funder-address.test.ts`:

```typescript
import { describe, it, expect, afterEach } from 'vitest';
import { getFunderAddress } from '../src/api/clob.js';

describe('getFunderAddress', () => {
  const original = process.env.DEPOSIT_WALLET_ADDRESS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DEPOSIT_WALLET_ADDRESS;
    } else {
      process.env.DEPOSIT_WALLET_ADDRESS = original;
    }
  });

  it('throws when DEPOSIT_WALLET_ADDRESS is unset', () => {
    delete process.env.DEPOSIT_WALLET_ADDRESS;
    expect(() => getFunderAddress()).toThrow(
      'DEPOSIT_WALLET_ADDRESS environment variable is required'
    );
  });

  it('returns the checksummed address when set', () => {
    process.env.DEPOSIT_WALLET_ADDRESS = '0xa53ee08c9a1e8c63bb27162dc53a1af8d2bc3f7b';
    expect(getFunderAddress()).toBe('0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/funder-address.test.ts`
Expected: FAIL — `getFunderAddress` is not exported from `src/api/clob.ts` (does not exist yet).

- [ ] **Step 3: Implement `getFunderAddress()`**

In `src/api/clob.ts`, insert immediately after the closing `}` of `getWalletAddress()` (currently line 33):

```typescript
export function getFunderAddress(): `0x${string}` {
  const depositWallet = process.env.DEPOSIT_WALLET_ADDRESS;
  if (!depositWallet) {
    throw new Error('DEPOSIT_WALLET_ADDRESS environment variable is required');
  }
  return getAddress(depositWallet) as `0x${string}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/funder-address.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/api/clob.ts tests/funder-address.test.ts
git commit -m "feat(clob): add getFunderAddress() resolving the Deposit Wallet address"
```

---

### Task 2: Upgrade SDK, fix `PUSD_ADDRESS`, wire `createClobClient()` to `POLY_1271`

**Files:**
- Modify: `package.json`
- Modify: `src/api/clob.ts:12` (constant), `src/api/clob.ts:35-94` (`createClobClient`)

**Interfaces:**
- Consumes: `getFunderAddress()` from Task 1.
- Produces: `createClobClient()` return type and call signature unchanged (`(config: Config) => Promise<ClobClient>`) — only its internal wiring changes, so `src/index.ts` and `src/main.ts` (its only callers) need no edits.

- [ ] **Step 1: Bump the SDK version and drop the obsolete builder-signing dependency**

In `package.json`, change line 14-15 from:

```json
    "@polymarket/builder-signing-sdk": "^1.0.0",
    "@polymarket/clob-client-v2": "^1.0.3-canary.0",
```

to:

```json
    "@polymarket/clob-client-v2": "^1.1.0",
```

(Confirmed via `grep -r "builder-signing-sdk" src/` this session: zero imports anywhere in `src/` — safe to delete outright, no dangling references to clean up.)

- [ ] **Step 2: Install and verify the lockfile updates**

Run: `npm install`
Expected: `package-lock.json` updates, `@polymarket/builder-signing-sdk` disappears from `node_modules/@polymarket/`, `@polymarket/clob-client-v2` resolves to a `1.1.x` version.

- [ ] **Step 3: Fix the `PUSD_ADDRESS` constant**

In `src/api/clob.ts:12`, change:

```typescript
const PUSD_ADDRESS = getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
```

to:

```typescript
const PUSD_ADDRESS = getAddress('0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB');
```

- [ ] **Step 4: Wire `createClobClient()` to use the Deposit Wallet as funder with `POLY_1271`**

In `src/api/clob.ts`, inside `createClobClient()` (currently lines 35-94), change line 57 from:

```typescript
  const funder = account.address;
```

to:

```typescript
  const funder = getFunderAddress();
```

Then change both occurrences of `signatureType: SignatureTypeV2.EOA,` (lines 63 and 81, inside the two `new ClobClient({...})` calls) to `signatureType: SignatureTypeV2.POLY_1271,`. Leave every other field in both constructor calls (`host`, `chain`, `signer`, `creds`, `funderAddress: funder`) unchanged — only the signature type and what `funder` resolves to are different now.

Also update the log line right above (currently line 45):

```typescript
  logger.info({ address: account.address }, 'Wallet account created (EOA mode)');
```

to:

```typescript
  logger.info({ address: account.address, funder }, 'Wallet account created (Deposit Wallet mode)');
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: PASS — `SignatureTypeV2.POLY_1271` exists in `@polymarket/clob-client-v2@1.1.0`'s type definitions (confirmed this session by fetching the package's shipped `.d.ts`), so this is a type-level no-op beyond the value change.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/api/clob.ts
git commit -m "fix(clob): sign for the Deposit Wallet (POLY_1271) instead of the bare EOA, upgrade clob-client-v2 to 1.1.0"
```

---

### Task 3: Fix the bankroll balance read

**Files:**
- Modify: `src/api/clob.ts:103-131` (`getUSDCBalance`, renamed to `getPUSDBalance`)

**Interfaces:**
- Consumes: `getFunderAddress()` from Task 1, `PUSD_ADDRESS` from Task 2.
- Produces: `export async function getPUSDBalance(): Promise<number>` — same signature as the function it replaces, so its 3 call sites (`src/index.ts:189`, `src/main.ts:19`, `src/api/telegram.ts:94`) only need the identifier renamed, not restructured.

- [ ] **Step 1: Rename via LSP rename, not manual find/replace**

Use the `lsp` tool: action `rename`, `file: src/api/clob.ts`, `symbol: getUSDCBalance`, `new_name: getPUSDBalance`. This must update all 3 call sites (`src/index.ts`, `src/main.ts`, `src/api/telegram.ts`) atomically — verify afterward with:

Run: `grep -rn "getUSDCBalance\|getPUSDBalance" src/`
Expected: zero occurrences of `getUSDCBalance`, exactly 4 occurrences of `getPUSDBalance` (the definition + 3 call sites).

- [ ] **Step 2: Fix the function body to target the Deposit Wallet's pUSD, not the EOA's USDC**

Inside the now-renamed `getPUSDBalance()`, the body currently reads (line numbers as in the pre-rename file — re-locate by content, the rename does not change line numbers):

```typescript
export async function getPUSDBalance(): Promise<number> {
  const logger = getLogger();
  try {
    const publicClient = createSharedPublicClient();
    const walletAddr = getWalletAddress();

    const USDC_ADDRESS = getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');

    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: [{
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }],
      functionName: 'balanceOf',
      args: [getAddress(walletAddr)],
    });

    const usdcBalance = Number(balance) / 1e6;
    logger.info({ address: walletAddr, usdcAddress: USDC_ADDRESS, rawBalance: balance.toString(), balance: usdcBalance }, 'USDC balance retrieved');
    return usdcBalance;
  } catch (error) {
    logger.error({ error, address: getWalletAddress() }, 'Failed to get USDC balance');
    return 0;
  }
}
```

Replace the whole body with:

```typescript
export async function getPUSDBalance(): Promise<number> {
  const logger = getLogger();
  const funder = getFunderAddress();
  try {
    const publicClient = createSharedPublicClient();

    const balance = await publicClient.readContract({
      address: PUSD_ADDRESS,
      abi: [{
        inputs: [{ name: 'account', type: 'address' }],
        name: 'balanceOf',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
      }],
      functionName: 'balanceOf',
      args: [funder],
    });

    const pusdBalance = Number(balance) / 1e6;
    logger.info({ funder, pusdAddress: PUSD_ADDRESS, rawBalance: balance.toString(), balance: pusdBalance }, 'pUSD balance retrieved');
    return pusdBalance;
  } catch (error) {
    logger.error({ error, funder }, 'Failed to get pUSD balance');
    return 0;
  }
}
```

(This removes the dead-end local `USDC_ADDRESS` constant entirely, uses the module-level `PUSD_ADDRESS` from Task 2, and reads the Deposit Wallet's balance instead of the EOA's.)

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/api/clob.ts src/index.ts src/main.ts src/api/telegram.ts
git commit -m "fix(clob): rename getUSDCBalance to getPUSDBalance, read the Deposit Wallet's pUSD instead of the EOA's USDC"
```

---

### Task 4: Update `.env` and `.env.example` documentation

**Files:**
- Modify: `.env` (not committed — local only)
- Modify: `.env.example`

**Interfaces:** None (config values only, no code).

- [ ] **Step 1: Update `.env.example`**

Find the `DEPOSIT_WALLET_ADDRESS` line (currently: `# Deposit wallet address - get from polymarket.com/settings or via POST /deposit API`). Replace the comment with:

```
# Deposit Wallet account address — copy it from polymarket.com's profile menu
# after connecting via MetaMask. This is NOT your MetaMask/EOA address, and
# it cannot be computed locally (confirmed this session: local derivation via
# @polymarket/builder-relayer-client gave 3 different wrong addresses across
# all 3 known wallet-type shapes). It's a required variable, not optional.
DEPOSIT_WALLET_ADDRESS=
```

- [ ] **Step 2: Update the local `.env`**

Set `DEPOSIT_WALLET_ADDRESS=0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b` (replacing the stale value, which belongs to an unrelated Google/Magic Link Proxy Wallet account). Do this with a targeted `sed` substitution, not by reading and rewriting the whole file:

```bash
sed -i 's/^DEPOSIT_WALLET_ADDRESS=.*/DEPOSIT_WALLET_ADDRESS=0xA53EE08c9A1E8C63Bb27162dc53A1af8d2Bc3F7b/' .env
```

- [ ] **Step 3: Commit** (only `.env.example` — `.env` is gitignored)

```bash
git add .env.example
git commit -m "docs(env): document DEPOSIT_WALLET_ADDRESS as the Deposit Wallet account address, not the EOA"
```

---

### Task 5: End-to-end verification against the live account

**Files:** None modified — this is a verification-only task.

- [ ] **Step 1: Confirm the build and unit tests pass together**

Run: `npm run build && npx vitest run`
Expected: build succeeds, all existing tests plus the new `tests/funder-address.test.ts` pass.

- [ ] **Step 2: Confirm `getBalanceAllowance` no longer 404s**

Run a throwaway script (delete it after, do not commit it) that calls `createClobClient()` with the real `.env` loaded, then `client.getBalanceAllowance({ asset_type: AssetType.COLLATERAL })`.
Expected: a real allowance object is returned — NOT the `{"error":"no deposit wallet found for owner","status":404}` observed earlier this session with the old `EOA` configuration.

- [ ] **Step 3: Confirm `getPUSDBalance()` reports the real balance**

In the same throwaway script, call `getPUSDBalance()`.
Expected: returns approximately `0.98` (the pUSD remaining after this session's test bet) — not `0`, and not a value matching the EOA's unrelated native-USDC balance.

- [ ] **Step 4: Delete the throwaway verification script**

```bash
rm -f <script-name>
git status --porcelain
```
Expected: clean working tree (only the script existed and is now gone — nothing else should be dirty).

- [ ] **Step 5: Update README.md**

In the "Próximos Passos" list, mark items 2 and 3 (the `POLY_1271`/funder fix and the `getUSDCBalance()` fix) as done, the same way item 1 (the deposit) was already marked done earlier this session.

```bash
git add README.md
git commit -m "docs: mark wallet/trading correctness sub-project complete in Próximos Passos"
```
