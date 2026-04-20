import type { CategoryExposure, ExposureCheckInput, ExposureCheckResult } from './types.js';

export function createInitialExposure(categories: string[]): CategoryExposure[] {
  return categories.map(category => ({
    category,
    totalValue: 0,
    maxExposurePct: 0.20, // D-05: default 20%, adjusted per quality
    currentPct: 0,
    isWithinLimit: true,
  }));
}

export function checkExposureCap(
  input: ExposureCheckInput,
  currentExposure: CategoryExposure[]
): ExposureCheckResult {
  const { category, proposedPositionValue, currentExposure: exposures } = input;
  
  // Find or create category exposure
  let categoryExposure = exposures.find(e => e.category === category);
  
  if (!categoryExposure) {
    categoryExposure = {
      category,
      totalValue: 0,
      maxExposurePct: 0.20, // D-05: default 20%
      currentPct: 0,
      isWithinLimit: true,
    };
  }
  
  const newTotalValue = categoryExposure.totalValue + proposedPositionValue;
  const newPct = newTotalValue; // This should be divided by bankroll in calling context
  
  // D-05 to D-08: Check if within limits
  // maxExposurePct is 10-20% based on research quality
  const isWithinLimit = newPct <= categoryExposure.maxExposurePct;
  
  if (!isWithinLimit) {
    return {
      allowed: false,
      categoryExposure: {
        ...categoryExposure,
        totalValue: newTotalValue,
        currentPct: newPct,
        isWithinLimit: false,
      },
      reason: `Category ${category} would exceed exposure cap (${newPct.toFixed(2)} > ${categoryExposure.maxExposurePct})`,
    };
  }
  
  return {
    allowed: true,
    categoryExposure: {
      ...categoryExposure,
      totalValue: newTotalValue,
      currentPct: newPct,
      isWithinLimit: true,
    },
    reason: `Category ${category} exposure OK (${newPct.toFixed(2)} <= ${categoryExposure.maxExposurePct})`,
  };
}

export function updateExposureWithPosition(
  exposures: CategoryExposure[],
  category: string,
  positionValue: number
): CategoryExposure[] {
  return exposures.map(exp => {
    if (exp.category === category) {
      return {
        ...exp,
        totalValue: exp.totalValue + positionValue,
        currentPct: exp.totalValue + positionValue,
      };
    }
    return exp;
  });
}

export function calculateCategoryExposurePct(
  exposure: CategoryExposure,
  totalBankroll: number
): number {
  return totalBankroll > 0 ? exposure.totalValue / totalBankroll : 0;
}
