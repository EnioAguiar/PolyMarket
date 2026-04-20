export interface BankrollState {
  totalBankroll: number;
  availableBankroll: number;
  openPositions: OpenPosition[];
  dailyPnL: number;
  totalPnL: number;
  lastUpdated: string;
}

export interface OpenPosition {
  marketId: string;
  side: 'YES' | 'NO';
  size: number;
  entryPrice: number;
  currentPrice: number;
  value: number;
  category: string;
}

export interface CategoryExposure {
  category: string;
  totalValue: number;
  maxExposurePct: number;
  currentPct: number;
  isWithinLimit: boolean;
}

export interface PositionSizingInput {
  bankroll: number;
  odds: number;
  category: string;
  researchQuality: 'low' | 'medium' | 'high';
}

export interface PositionSizingResult {
  positionSize: number;
  shareCount: number;
  isWithinMinThreshold: boolean;
  reason: string;
}

export interface ExposureCheckInput {
  category: string;
  proposedPositionValue: number;
  currentExposure: CategoryExposure[];
}

export interface ExposureCheckResult {
  allowed: boolean;
  categoryExposure: CategoryExposure;
  reason: string;
}
