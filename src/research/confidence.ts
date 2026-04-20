import type { ResearchSignal } from './interface.js';
import { MIN_RATING, MIN_SOURCES, HIGH_RATING } from '../types/source.js';

export interface ConfidenceResult {
  posterior: number;
  confidence: number;
  sourceCount: number;
  avgWeight: number;
  meetsMinRating: boolean;
  warnings: string[];
}

// Star rating to weight mapping
const RATING_WEIGHTS: Record<number, number> = {
  5: 1.0,
  4: 0.8,
  3: 0.5,
  2: 0.2,
  1: 0.1,
};

export class BayesianScorer {
  private prior: number;
  
  constructor(prior = 0.5) {
    this.prior = prior;
  }
  
  calculate(signals: ResearchSignal[]): ConfidenceResult {
    if (signals.length === 0) {
      return {
        posterior: this.prior,
        confidence: 0,
        sourceCount: 0,
        avgWeight: 0,
        meetsMinRating: false,
        warnings: ['No signals provided'],
      };
    }
    
    const warnings: string[] = [];
    
    // Filter by minimum rating
    const validSignals = signals.filter(s => {
      const weight = RATING_WEIGHTS[s.confidence] || 0.5;
      return weight >= RATING_WEIGHTS[MIN_RATING];
    });
    
    if (validSignals.length < signals.length) {
      const filtered = signals.length - validSignals.length;
      warnings.push(`Filtered ${filtered} sources below ★${MIN_RATING}`);
    }
    
    if (validSignals.length < MIN_SOURCES) {
      warnings.push(`Only ${validSignals.length} valid sources (< ${MIN_SOURCES} minimum)`);
    }
    
    // Calculate weighted likelihood
    let totalWeight = 0;
    let weightedEvidence = 0;
    
    for (const signal of validSignals) {
      const ratingWeight = RATING_WEIGHTS[signal.confidence] || 0.5;
      const recencyWeight = signal.recency;
      const sourceWeight = ratingWeight * recencyWeight;
      
      totalWeight += sourceWeight;
      weightedEvidence += sourceWeight * signal.confidence;
    }
    
    // Bayesian update: P(H|E) ∝ P(E|H) * P(H)
    const likelihood = totalWeight > 0 ? weightedEvidence / totalWeight : this.prior;
    const posterior = likelihood * this.prior / (likelihood * this.prior + (1 - likelihood) * (1 - this.prior));
    
    const avgWeight = validSignals.length > 0 ? totalWeight / validSignals.length : 0;
    
    // Check if high-rated sources override relaxed policy
    const highRatedCount = validSignals.filter(s => s.confidence >= HIGH_RATING).length;
    const meetsMinRating = highRatedCount >= 1 || validSignals.length >= MIN_SOURCES;
    
    if (highRatedCount >= 1) {
      warnings.push(`${highRatedCount} ★${HIGH_RATING}+ sources - relaxed policy applies`);
    }
    
    return {
      posterior: Math.max(0.01, Math.min(0.99, posterior)),
      confidence: Math.min(1, avgWeight * posterior),
      sourceCount: validSignals.length,
      avgWeight,
      meetsMinRating,
      warnings,
    };
  }
}
