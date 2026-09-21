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
