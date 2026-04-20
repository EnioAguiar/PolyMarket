import type { SafetyState } from '../types/index.js';
import type { SafetyCheckResult, SafetyModuleConfig } from './types.js';

/**
 * Track daily loss and check if threshold exceeded (BANK-02)
 */
export class DailyLossTracker {
  private config: SafetyModuleConfig;
  private state: SafetyState;
  private sessionStartDate: string;

  constructor(config: SafetyModuleConfig, initialState: SafetyState) {
    this.config = config;
    this.state = initialState;
    this.sessionStartDate = new Date().toISOString().split('T')[0];
  }

  private resetIfNewDay(): void {
    const today = new Date().toISOString().split('T')[0];
    if (today !== this.sessionStartDate) {
      this.state.dailyLoss = 0;
      this.sessionStartDate = today;
    }
  }

  recordLoss(amount: number): void {
    this.resetIfNewDay();
    this.state.dailyLoss += amount;
  }

  recordGain(amount: number): void {
    this.resetIfNewDay();
    this.state.dailyLoss = Math.min(0, this.state.dailyLoss - amount);
  }

  checkDailyLoss(bankroll: number): SafetyCheckResult {
    this.resetIfNewDay();
    
    const dailyLossLimit = bankroll * this.config.dailyLossLimitPct;
    
    if (this.state.dailyLoss <= -dailyLossLimit) {
      return {
        passed: false,
        checkType: 'daily_loss',
        message: `Daily loss ${Math.abs(this.state.dailyLoss)} exceeds limit ${dailyLossLimit}`,
        value: this.state.dailyLoss,
        threshold: -dailyLossLimit,
      };
    }
    
    return {
      passed: true,
      checkType: 'daily_loss',
      value: this.state.dailyLoss,
      threshold: dailyLossLimit,
    };
  }

  getDailyLoss(): number {
    this.resetIfNewDay();
    return this.state.dailyLoss;
  }
}
