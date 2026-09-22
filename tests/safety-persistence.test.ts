import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import type { SafetyState } from '../src/types/index.js';
import type { SafetyModuleConfig } from '../src/safety/types.js';
import { DrawdownTracker } from '../src/safety/drawdown.js';

const TEST_STATE_FILE = 'data/safety-state.test.json';

describe('safety persistence', () => {
  beforeEach(() => {
    process.env.SAFETY_STATE_FILE = TEST_STATE_FILE;
  });

  afterEach(() => {
    if (existsSync(TEST_STATE_FILE)) {
      rmSync(TEST_STATE_FILE);
    }
    delete process.env.SAFETY_STATE_FILE;
  });

  it('round-trips a saved state, including peakBankroll', async () => {
    // Dynamic import is required here: persistence.ts reads SAFETY_STATE_FILE into a
    // module-level const at import time, so the module must be (re-)imported after
    // SAFETY_STATE_FILE is set in beforeEach for the override to take effect.
    const { saveSafetyState, loadSafetyState } = await import('../src/safety/persistence.js');
    const state: SafetyState = {
      dailyLoss: 42,
      totalDrawdown: 0.05,
      isKillSwitchActive: true,
      peakBankroll: 1234.56,
    };

    saveSafetyState(state);
    const loaded = loadSafetyState();

    expect(loaded).toEqual(state);
  });

  it('returns the zeroed default when the file does not exist', async () => {
    const { loadSafetyState } = await import('../src/safety/persistence.js');

    expect(existsSync(TEST_STATE_FILE)).toBe(false);
    const loaded = loadSafetyState();

    expect(loaded).toEqual({ dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false });
  });

  it('returns the zeroed default when the file contains invalid JSON', async () => {
    const { loadSafetyState } = await import('../src/safety/persistence.js');

    mkdirSync('data', { recursive: true });
    writeFileSync(TEST_STATE_FILE, '{ not valid json', 'utf-8');
    const loaded = loadSafetyState();

    expect(loaded).toEqual({ dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false });
  });

  it('DrawdownTracker prefers a restored peakBankroll over a lower current bankroll after a restart', () => {
    const config: SafetyModuleConfig = {
      maxPositionSizePct: 0.05,
      dailyLossLimitPct: 0.1,
      drawdownKillSwitchPct: 0.2,
      isDryRun: false,
    };
    const initialState: SafetyState = {
      dailyLoss: 0,
      totalDrawdown: 0,
      isKillSwitchActive: false,
      peakBankroll: 100,
    };

    const tracker = new DrawdownTracker(config, initialState, 90);

    expect(tracker.getPeakBankroll()).toBe(100);
  });

  it('DrawdownTracker falls back to the current bankroll when no restored peak is available', () => {
    const config: SafetyModuleConfig = {
      maxPositionSizePct: 0.05,
      dailyLossLimitPct: 0.1,
      drawdownKillSwitchPct: 0.2,
      isDryRun: false,
    };
    const initialState: SafetyState = {
      dailyLoss: 0,
      totalDrawdown: 0,
      isKillSwitchActive: false,
    };

    const tracker = new DrawdownTracker(config, initialState, 90);

    expect(tracker.getPeakBankroll()).toBe(90);
  });
});
