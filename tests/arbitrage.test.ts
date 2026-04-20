import { describe, it, expect } from 'vitest';
import { checkArbitrage, calculateArbitrageProfit } from '../src/execution/arbitrage.js';

describe('arbitrage', () => {
  it('should detect arbitrage when YES + NO < 0.99', () => {
    const orderbook = {
      bids: [{ price: 0.45, size: 100 }], // NO side
      asks: [{ price: 0.50, size: 100 }], // YES side
    };
    
    const result = checkArbitrage(orderbook);
    
    expect(result.isArbitrage).toBe(true);
    expect(result.combinedPrice).toBe(0.95);
    expect(result.profitPct).toBeGreaterThan(0);
  });
  
  it('should NOT detect arbitrage when YES + NO > 0.99', () => {
    const orderbook = {
      bids: [{ price: 0.55, size: 100 }], // NO side
      asks: [{ price: 0.50, size: 100 }], // YES side
    };
    
    const result = checkArbitrage(orderbook);
    
    expect(result.isArbitrage).toBe(false);
    expect(result.combinedPrice).toBe(1.05);
  });
  
  it('should calculate arbitrage profit correctly', () => {
    const yesPrice = 0.50;
    const noPrice = 0.45;
    const stake = 100;
    
    const result = calculateArbitrageProfit(yesPrice, noPrice, stake);
    
    expect(result.totalCost).toBe(stake);
    expect(result.profit).toBeGreaterThan(0);
  });
});
