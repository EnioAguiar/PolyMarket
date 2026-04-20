import type { BetCheckInput, SafetyCheckResult, SafetyModuleConfig } from './types.js';

/**
 * Check if a bet exceeds the maximum position size limit (BANK-01)
 * Max position size: 5-10% of bankroll per bet (configurable in config.yaml)
 */
export function checkPositionSize(
  input: BetCheckInput,
  config: SafetyModuleConfig
): SafetyCheckResult {
  const maxPositionValue = input.bankroll * config.maxPositionSizePct;
  const positionValue = input.positionSize;
  
  if (positionValue > maxPositionValue) {
    return {
      passed: false,
      checkType: 'position',
      message: `Position size ${positionValue} exceeds max ${maxPositionValue} (${config.maxPositionSizePct * 100}% of bankroll)`,
      value: positionValue,
      threshold: maxPositionValue,
    };
  }
  
  return {
    passed: true,
    checkType: 'position',
    value: positionValue,
    threshold: maxPositionValue,
  };
}

/**
 * Calculate what the max position size should be for given odds and bankroll
 */
export function getMaxPositionSize(
  bankroll: number,
  maxPositionPct: number,
  odds: number
): number {
  const maxValue = bankroll * maxPositionPct;
  return maxValue / odds;
}
