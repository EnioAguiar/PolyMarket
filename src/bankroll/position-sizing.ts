import type { PositionSizingInput, PositionSizingResult } from './types.js';

const POLYMARKET_MIN_TOKENS = 5;
const POLYMARKET_MIN_USD = 1;  // approximate minimum in USDC

export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
  const { bankroll, odds, researchQuality } = input;
  
  // D-04: Fixed 5% of bankroll per bet
  const defaultPercentage = 0.05;
  
  // D-06: Adjust percentage based on research quality
  // Low quality = conservative (2%), High quality = can go up (8%)
  const qualityMultipliers = {
    low: 0.4,      // 2% if quality is low
    medium: 1.0,   // 5% default
    high: 1.6,     // 8% if quality is high
  };
  
  const multiplier = qualityMultipliers[researchQuality] || 1.0;
  const percentage = defaultPercentage * multiplier;
  
  // Calculate position size in tokens
  const positionValue = bankroll * percentage;
  const shareCount = positionValue / odds;
  
  // D-03: Minimum threshold - check Polymarket minimum
  const isWithinMinThreshold = shareCount >= POLYMARKET_MIN_TOKENS;
  
  // If below minimum, skip
  if (!isWithinMinThreshold) {
    return {
      positionSize: 0,
      shareCount: 0,
      isWithinMinThreshold: false,
      reason: `Position too small (${shareCount.toFixed(2)} shares < ${POLYMARKET_MIN_TOKENS} minimum)`,
    };
  }
  
  return {
    positionSize: positionValue,
    shareCount,
    isWithinMinThreshold: true,
    reason: `Position size: ${(percentage * 100).toFixed(1)}% of bankroll (quality: ${researchQuality})`,
  };
}

export function calculateShareCount(bankroll: number, percentage: number, odds: number): number {
  const positionValue = bankroll * percentage;
  return positionValue / odds;
}
