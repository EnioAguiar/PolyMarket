import type { ResearchSignal } from './interface.js';
import { MIN_RATING, MIN_SOURCES } from '../types/source.js';
import pino from 'pino';

const logger = pino({ level: 'debug' });

export interface ConfidenceInput {
  signals: ResearchSignal[];
  prior?: number;  // Default 0.5 for binary
}

export interface ConfidenceResult {
  posterior: number;           // Final probability estimate (0-1)
  confidence: number;           // Confidence in the estimate (0-1)
  sourceCount: number;          // Number of sources used
  weightedEvidence: number;    // Total weighted evidence
  individualScores: Array<{
    sourceId: string;
    sourceRating: number;
    weight: number;
    contribution: number;
  }>;
  warning?: string;             // Warning if < 10 sources
  warnings: string[];           // Array of warnings for AI chain compatibility
  avgWeight: number;            // Average weight for AI chain compatibility
  meetsMinRating: boolean;      // Whether minimum rating threshold met
}

export class BayesianScorer {
  /**
   * Calculate star rating weight based on 1-5 rating
   * D-11: Weighted by star rating automatically
   * Maps 0-1 confidence (from source) to star equivalent for weight lookup
   */
  static getWeight(rating: number): number {
    // rating is 0-1 from ResearchSignal.confidence
    // Map to star scale: 0.9-1.0 -> 5 stars, etc.
    if (rating >= 0.9) return 1.0;
    if (rating >= 0.7) return 0.8;
    if (rating >= 0.5) return 0.5;
    if (rating >= 0.3) return 0.2;
    return 0.1;
  }
  
  /**
   * Score a single signal and convert to probability contribution
   * 
   * Bayesian approach:
   * - Strong BUY signals increase P(H)
   * - Strong SELL signals decrease P(H)
   * - Neutral signals have minimal effect
   * 
   * Uses metadata.direction if available (-1 to +1), otherwise uses confidence
   */
  static scoreSignal(signal: ResearchSignal): number {
    // Direction from metadata if available (e.g., price direction)
    const direction = (signal.metadata?.direction as number) ?? (signal.confidence - 0.5) * 2;
    
    // Combine: direction * confidence * recency
    const score = direction * signal.confidence * signal.recency;
    
    // Convert to probability contribution (-1 to +1 range)
    return Math.max(-1, Math.min(1, score));
  }
  
  /**
   * Calculate recency weight
   * D-20: 2/3 recency + 1/3 age weight
   * 
   * @param ageSeconds - age of the signal in seconds
   */
  static calculateRecencyWeight(ageSeconds: number): number {
    const maxAge = 24 * 60 * 60; // 24 hours
    const recencyScore = Math.max(0, 1 - (ageSeconds / maxAge));
    const ageScore = 1 - recencyScore;
    
    return (2/3 * recencyScore) + (1/3 * ageScore);
  }
  
  /**
   * Calculate posterior probability using weighted Bayesian update
   * 
   * P(H|E) ≈ P(E|H) * P(H) / P(E)
   * 
   * Simplified weighted approach:
   * - Start with prior (usually 0.5)
   * - Apply weighted evidence
   */
  static calculate(input: ConfidenceInput): ConfidenceResult {
    const { signals, prior = 0.5 } = input;
    
    // Filter by minimum rating (D-12, D-26)
    // MIN_RATING = 3 stars, so we need confidence >= 0.5
    const qualifiedSignals = signals.filter(
      s => s.confidence >= MIN_RATING / 5
    );
    
    // Check minimum sources (D-26, D-28)
    let warning: string | undefined;
    if (qualifiedSignals.length < MIN_SOURCES) {
      // D-12: Relaxed policy - OK if we have ★4+ sources
      const highQualitySignals = signals.filter(s => s.confidence >= 0.7);
      if (highQualitySignals.length < 2) {
        warning = `Low source count: ${qualifiedSignals.length} qualified, ${MIN_SOURCES} recommended. Logging warning per D-28.`;
        logger.warn({ 
          sourceCount: qualifiedSignals.length, 
          recommended: MIN_SOURCES,
          highQualityCount: highQualitySignals.length 
        }, warning);
      }
    }
    
    if (qualifiedSignals.length === 0) {
      return {
        posterior: prior,
        confidence: 0,
        sourceCount: 0,
        weightedEvidence: 0,
        individualScores: [],
        warning: 'No qualified sources - using prior probability',
        warnings: ['No qualified sources - using prior probability'],
        avgWeight: 0,
        meetsMinRating: false,
      };
    }
    
    // Calculate individual contributions
    const individualScores = qualifiedSignals.map(signal => {
      const rating = signal.confidence;
      const weight = this.getWeight(rating);
      const score = this.scoreSignal(signal);
      const contribution = score * weight;
      
      return {
        sourceId: signal.sourceId,
        sourceRating: rating,
        weight,
        contribution,
      };
    });
    
    // Calculate weighted evidence
    const totalWeight = individualScores.reduce((sum, s) => sum + s.weight, 0);
    const weightedEvidence = totalWeight > 0 
      ? individualScores.reduce((sum, s) => sum + s.contribution, 0) / totalWeight
      : 0;
    
    // Bayesian posterior update
    // posterior = prior + evidence * confidence_reduction
    // More evidence = less impact from any single source
    const evidenceStrength = Math.min(1, totalWeight / 10); // Saturates at 10 sources
    const posterior = prior + (weightedEvidence * evidenceStrength * 0.5);
    
    // Clamp to valid probability range
    const clampedPosterior = Math.max(0.01, Math.min(0.99, posterior));
    
    // Confidence: higher with more high-rated sources
    const avgWeight = totalWeight / qualifiedSignals.length;
    const confidence = Math.min(1, (qualifiedSignals.length / MIN_SOURCES) * avgWeight);
    
    // Check if high-rated sources override relaxed policy
    const highRatedCount = qualifiedSignals.filter(s => s.confidence >= 0.7).length;
    const meetsMinRating = highRatedCount >= 1 || qualifiedSignals.length >= MIN_SOURCES;
    
    return {
      posterior: clampedPosterior,
      confidence,
      sourceCount: qualifiedSignals.length,
      weightedEvidence,
      individualScores,
      warning,
      warnings: [warning].filter((w): w is string => !!w),
      avgWeight,
      meetsMinRating,
    };
  }
}