import type { SafetyState } from '../types/index.js';
import type { SafetyCheckResult, SafetyModuleConfig } from './types.js';

/**
 * Track total drawdown and trigger kill switch if exceeded (BANK-03)
 */
export class DrawdownTracker {
  private config: SafetyModuleConfig;
  private state: SafetyState;
  private peakBankroll: number;

  constructor(config: SafetyModuleConfig, initialState: SafetyState, initialBankroll: number) {
    this.config = config;
    this.state = initialState;
    this.peakBankroll = initialBankroll;
  }

  updatePeak(currentBankroll: number): void {
    if (currentBankroll > this.peakBankroll) {
      this.peakBankroll = currentBankroll;
    }
  }

  recordTradeResult(bankroll: number, pnl: number): void {
    this.updatePeak(bankroll);
    
    const drawdown = this.peakBankroll - bankroll;
    const drawdownPct = this.peakBankroll > 0 ? drawdown / this.peakBankroll : 0;
    
    this.state.totalDrawdown = drawdownPct;
    
    if (drawdownPct >= this.config.drawdownKillSwitchPct) {
      this.state.isKillSwitchActive = true;
    }
  }

  checkDrawdown(currentBankroll: number): SafetyCheckResult {
    this.updatePeak(currentBankroll);
    
    const drawdown = this.peakBankroll - currentBankroll;
    const drawdownPct = this.peakBankroll > 0 ? drawdown / this.peakBankroll : 0;
    
    this.state.totalDrawdown = drawdownPct;
    
    if (this.state.isKillSwitchActive) {
      return {
        passed: false,
        checkType: 'drawdown',
        message: `Drawdown kill switch active: ${(drawdownPct * 100).toFixed(2)}% exceeds ${(this.config.drawdownKillSwitchPct * 100)}%`,
        value: drawdownPct,
        threshold: this.config.drawdownKillSwitchPct,
      };
    }
    
    return {
      passed: true,
      checkType: 'drawdown',
      value: drawdownPct,
      threshold: this.config.drawdownKillSwitchPct,
    };
  }

  getDrawdown(currentBankroll: number): number {
    this.updatePeak(currentBankroll);
    const drawdown = this.peakBankroll - currentBankroll;
    return this.peakBankroll > 0 ? drawdown / this.peakBankroll : 0;
  }

  isKillSwitchActive(): boolean {
    return this.state.isKillSwitchActive;
  }

  resetKillSwitch(): void {
    this.state.isKillSwitchActive = false;
  }
}
