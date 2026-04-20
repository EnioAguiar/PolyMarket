import { describe, it, expect } from 'vitest';
import { calculatePositionSize } from '../src/bankroll/position-sizing.js';
import type { PositionSizingInput } from '../src/bankroll/types.js';

describe('position-sizing', () => {
  it('should calculate 5% of bankroll at medium quality', () => {
    const input: PositionSizingInput = {
      bankroll: 1000,
      odds: 2.0,
      category: 'crypto',
      researchQuality: 'medium',
    };
    
    const result = calculatePositionSize(input);
    
    expect(result.isWithinMinThreshold).toBe(true);
    expect(result.positionSize).toBeCloseTo(50);
  });
  
  it('should apply high quality multiplier (8%)', () => {
    const input: PositionSizingInput = {
      bankroll: 1000,
      odds: 2.0,
      category: 'crypto',
      researchQuality: 'high',
    };
    
    const result = calculatePositionSize(input);
    
    // 8% of 1000 = 80, / 2.0 = 40 shares
    expect(result.positionSize).toBeCloseTo(80);
  });
  
  it('should apply low quality multiplier (2%)', () => {
    const input: PositionSizingInput = {
      bankroll: 1000,
      odds: 2.0,
      category: 'crypto',
      researchQuality: 'low',
    };
    
    const result = calculatePositionSize(input);
    
    // 2% of 1000 = 20, / 2.0 = 10 shares
    expect(result.positionSize).toBeCloseTo(20);
  });
  
  it('should reject position below minimum tokens', () => {
    const input: PositionSizingInput = {
      bankroll: 100,
      odds: 10.0, // high odds = few shares
      category: 'crypto',
      researchQuality: 'medium',
    };
    
    const result = calculatePositionSize(input);
    
    // 5% of 100 = 5 tokens, / 10.0 odds = 0.5 shares < 5 minimum
    expect(result.isWithinMinThreshold).toBe(false);
    expect(result.positionSize).toBe(0);
  });
});
