import type { SafetyState } from '../types/index.js';

/**
 * Result of a safety check
 */
export interface SafetyCheckResult {
  passed: boolean;
  checkType: 'position' | 'daily_loss' | 'drawdown' | 'dry_run';
  message?: string;
  value?: number;
  threshold?: number;
}

/**
 * Safety check input including bet details
 */
export interface BetCheckInput {
  odds: number;
  positionSize: number;
  bankroll?: number;
}

/**
 * Safety module configuration
 */
export interface SafetyModuleConfig {
  maxPositionSizePct: number;
  dailyLossLimitPct: number;
  drawdownKillSwitchPct: number;
  isDryRun: boolean;
}
