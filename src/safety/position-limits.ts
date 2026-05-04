import type { SafetyCheckResult, SafetyModuleConfig } from './types.js';

export interface PositionSizeCheckInput {
  positionSize: number;
  odds: number;
}

/**
 * Check if a bet exceeds the maximum position size limit (BANK-01)
 * Max position size is based on potential LOSS, not stake amount.
 * At odds 0.5, losing $1 stake means losing $1 (100% of stake)
 * At odds 0.3, losing $1 stake means losing $1 (100% of stake)
 *
 * The loss calculation: stake - (stake * odds) = stake * (1 - odds)
 * Example: $1 at odds 0.5 → loss = $1 * (1 - 0.5) = $0.50
 */
export function checkPositionSize(
  input: PositionSizeCheckInput,
  bankroll: number,
  config: SafetyModuleConfig
): SafetyCheckResult {
  const maxLossAmount = bankroll * config.maxPositionSizePct;
  const potentialLoss = input.positionSize * (1 - input.odds);

  if (potentialLoss > maxLossAmount) {
    return {
      passed: false,
      checkType: 'position',
      message: `Potential loss ${potentialLoss.toFixed(2)} exceeds max ${maxLossAmount.toFixed(2)} (${config.maxPositionSizePct * 100}% of bankroll)`,
      value: potentialLoss,
      threshold: maxLossAmount,
    };
  }

  return {
    passed: true,
    checkType: 'position',
    value: potentialLoss,
    threshold: maxLossAmount,
  };
}

/**
 * Calculate max position size for given odds and bankroll
 * Based on max loss, NOT on potential gain
 */
export function getMaxPositionSize(
  bankroll: number,
  maxPositionPct: number,
  odds: number
): number {
  const maxLossAmount = bankroll * maxPositionPct;
  return maxLossAmount / (1 - odds);
}
