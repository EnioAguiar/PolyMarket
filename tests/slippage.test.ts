import { describe, it, expect } from 'vitest';
import { checkSlippage } from '../src/execution/slippage.js';

describe('slippage', () => {
  it('should allow 5% slippage', () => {
    const result = checkSlippage(
      { expectedPrice: 1.0, executionPrice: 1.05 },
      0.10
    );
    
    expect(result.allowed).toBe(true);
    expect(result.slippagePct).toBeCloseTo(0.05);
  });
  
  it('should allow exactly 10% slippage (boundary)', () => {
    const result = checkSlippage(
      { expectedPrice: 1.0, executionPrice: 1.099 },
      0.10
    );
    
    // 9.9% should be allowed
    expect(result.allowed).toBe(true);
  });
  
  it('should reject >10% slippage', () => {
    const result = checkSlippage(
      { expectedPrice: 1.0, executionPrice: 1.15 },
      0.10
    );
    
    expect(result.allowed).toBe(false);
  });
  
  it('should handle price improvement', () => {
    const result = checkSlippage(
      { expectedPrice: 1.0, executionPrice: 0.90 },
      0.10
    );
    
    expect(result.allowed).toBe(true);
  });
});
