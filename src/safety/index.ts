import type { Config, SafetyState } from '../types/index.js';
import type { SafetyCheckResult, SafetyModuleConfig, BetCheckInput } from './types.js';
import { checkPositionSize, getMaxPositionSize } from './position-limits.js';
import { DailyLossTracker } from './daily-loss.js';
import { DrawdownTracker } from './drawdown.js';
import { isDryRun } from '../config/index.js';

/**
 * Main safety module class (per D-03: dedicated module separate from execution flow)
 * Coordinates all safety checks for betting decisions
 */
export class SafetyModule {
  private config: SafetyModuleConfig;
  private dailyLossTracker: DailyLossTracker;
  private drawdownTracker: DrawdownTracker;
  private bankroll: number;

  constructor(config: Config, initialState: SafetyState, initialBankroll: number) {
    this.config = {
      maxPositionSizePct: config.safety.maxPositionSizePct,
      dailyLossLimitPct: config.safety.dailyLossLimitPct,
      drawdownKillSwitchPct: config.safety.drawdownKillSwitchPct,
      isDryRun: config.dryRun,
    };
    this.bankroll = initialBankroll;
    this.dailyLossTracker = new DailyLossTracker(this.config, initialState);
    this.drawdownTracker = new DrawdownTracker(this.config, initialState, initialBankroll);
  }

  /**
   * Check if a bet passes all safety checks (BANK-01, BANK-02, BANK-03)
   */
  checkBet(input: BetCheckInput): SafetyCheckResult {
    if (this.config.isDryRun) {
      return {
        passed: true,
        checkType: 'dry_run',
        message: 'Dry-run mode: safety checks logged but not blocking',
      };
    }

    const positionCheck = checkPositionSize(input, this.config);
    if (!positionCheck.passed) return positionCheck;

    const dailyLossCheck = this.dailyLossTracker.checkDailyLoss(input.bankroll);
    if (!dailyLossCheck.passed) return dailyLossCheck;

    const drawdownCheck = this.drawdownTracker.checkDrawdown(input.bankroll);
    if (!drawdownCheck.passed) return drawdownCheck;

    return {
      passed: true,
      checkType: 'position',
      message: 'All safety checks passed',
    };
  }

  /**
   * Record a completed trade result
   */
  recordTrade(pnl: number, newBankroll: number): void {
    if (pnl < 0) {
      this.dailyLossTracker.recordLoss(Math.abs(pnl));
    } else {
      this.dailyLossTracker.recordGain(pnl);
    }
    this.drawdownTracker.recordTradeResult(newBankroll, pnl);
    this.bankroll = newBankroll;
  }

  /**
   * Get max position size for given odds
   */
  getMaxPositionSizeForOdds(odds: number): number {
    return getMaxPositionSize(this.bankroll, this.config.maxPositionSizePct, odds);
  }

  /**
   * Get current safety state
   */
  getState(): SafetyState {
    return {
      dailyLoss: this.dailyLossTracker.getDailyLoss(),
      totalDrawdown: this.drawdownTracker.getDrawdown(this.bankroll),
      isKillSwitchActive: this.drawdownTracker.isKillSwitchActive(),
    };
  }

  /**
   * Check if kill switch is active
   */
  isKillSwitchActive(): boolean {
    return this.drawdownTracker.isKillSwitchActive();
  }

  /**
   * Reset kill switch (manual intervention required)
   */
  resetKillSwitch(): void {
    this.drawdownTracker.resetKillSwitch();
  }
}
