export interface SlippageCheckInput {
  expectedPrice: number;
  executionPrice: number;
}

export interface SlippageCheckResult {
  allowed: boolean;
  slippagePct: number;
  threshold: number;
  reason: string;
}

export function checkSlippage(input: SlippageCheckInput, maxSlippagePct = 0.10): SlippageCheckResult {
  const { expectedPrice, executionPrice } = input;
  
  // D-09: 10% maximum slippage tolerance
  // D-10: If price moved >10% from decision, abort bet
  
  const slippagePct = Math.abs((executionPrice - expectedPrice) / expectedPrice);
  
  const allowed = slippagePct <= maxSlippagePct;
  
  if (!allowed) {
    return {
      allowed: false,
      slippagePct,
      threshold: maxSlippagePct,
      reason: `Slippage ${(slippagePct * 100).toFixed(2)}% exceeds ${(maxSlippagePct * 100).toFixed(0)}% threshold`,
    };
  }
  
  return {
    allowed: true,
    slippagePct,
    threshold: maxSlippagePct,
    reason: `Slippage ${(slippagePct * 100).toFixed(2)}% within ${(maxSlippagePct * 100).toFixed(0)}% threshold`,
  };
}
