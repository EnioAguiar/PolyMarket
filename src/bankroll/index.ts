import { loadConfig } from '../config/index.js';
import { calculatePositionSize, calculateShareCount } from './position-sizing.js';
import { checkExposureCap, createInitialExposure, updateExposureWithPosition } from './exposure-caps.js';
import type { 
  BankrollState, 
  OpenPosition, 
  CategoryExposure,
  PositionSizingInput,
  PositionSizingResult,
  ExposureCheckInput,
  ExposureCheckResult 
} from './types.js';

export type { 
  BankrollState, 
  OpenPosition, 
  CategoryExposure,
  PositionSizingInput,
  PositionSizingResult,
  ExposureCheckInput,
  ExposureCheckResult 
};

/**
 * Bankroll Module - Entry point
 * D-01 to D-08: Position sizing and exposure caps
 */
/**
 * Bankroll Module - Entry point
 * D-01 to D-08: Position sizing and exposure caps
 */
export const BankrollModule = {
  calculatePositionSize,
  calculateShareCount,
  checkExposureCap,
  createInitialExposure,
  updateExposureWithPosition,
};

/**
 * Create initial bankroll state
 */
export function createInitialBankrollState(initialBankroll: number): BankrollState {
  return {
    totalBankroll: initialBankroll,
    availableBankroll: initialBankroll,
    openPositions: [],
    dailyPnL: 0,
    totalPnL: 0,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Update bankroll state with completed trade result
 */
export function updateBankrollOnTrade(
  state: BankrollState,
  marketId: string,
  side: 'YES' | 'NO',
  size: number,
  entryPrice: number,
  currentPrice: number,
  pnl: number
): BankrollState {
  // Remove closed position from open positions
  const openPositions = state.openPositions.filter(p => p.marketId !== marketId);
  
  // Update available bankroll
  const availableBankroll = state.availableBankroll + pnl;
  
  return {
    ...state,
    totalBankroll: state.totalBankroll + pnl,
    availableBankroll,
    openPositions,
    dailyPnL: state.dailyPnL + pnl,
    totalPnL: state.totalPnL + pnl,
    lastUpdated: new Date().toISOString(),
  };
}

export { calculatePositionSize, checkExposureCap, createInitialExposure, updateExposureWithPosition };
