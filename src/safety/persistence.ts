import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { SafetyState } from '../types/index.js';

const STATE_FILE = process.env.SAFETY_STATE_FILE || 'data/safety-state.json';

export function loadSafetyState(): SafetyState {
  if (!existsSync(STATE_FILE)) {
    return { dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false };
  }
  try {
    const raw = readFileSync(STATE_FILE, 'utf-8');
    return JSON.parse(raw) as SafetyState;
  } catch (error) {
    return { dailyLoss: 0, totalDrawdown: 0, isKillSwitchActive: false };
  }
}

export function saveSafetyState(state: SafetyState): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}
