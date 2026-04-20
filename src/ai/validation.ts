import { getLogger } from '../logging/index.js';
import type { AIEstimate, ValidationResult, ValidationCheck } from '../types/ai.js';
import { ValidationMode } from '../types/ai.js';
import type { ResearchSignal } from '../research/interface.js';

export interface AIValidatorConfig {
  mode: ValidationMode;
  blockThresholdHigh: number;
  blockThresholdLow: number;
  divergenceThreshold: number;
}

const DEFAULT_CONFIG: AIValidatorConfig = {
  mode: ValidationMode.HYBRID,
  blockThresholdHigh: 0.95,
  blockThresholdLow: 0.50,
  divergenceThreshold: 0.30,
};

export class AIValidator {
  private config: AIValidatorConfig;
  
  constructor(config: Partial<AIValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  validate(
    estimate: AIEstimate,
    currentOdd?: number,
    overrideSignals?: ResearchSignal[]
  ): ValidationResult {
    const logger = getLogger();
    const checks: ValidationCheck[] = [];
    
    // Check 1: Extreme probability check
    const extremeCheck = this.checkExtreme(estimate.probability);
    checks.push(extremeCheck);
    
    // Check 2: Divergence from market (if currentOdd available)
    let divergenceCheck: ValidationCheck = { name: 'divergence', passed: true, details: 'No market odd provided' };
    if (currentOdd !== undefined) {
      divergenceCheck = this.checkDivergence(estimate.probability, currentOdd);
      checks.push(divergenceCheck);
    }
    
    // Check 3: Confidence check
    const confidenceCheck = this.checkConfidence(estimate.confidence);
    checks.push(confidenceCheck);
    
    // Determine if validation passed
    let passed = checks.every(c => c.passed);
    let blockedReason: string | undefined;
    let overrideUsed = false;
    
    if (!passed && this.config.mode === ValidationMode.HYBRID && overrideSignals) {
      // Check for high-rated source override
      const highRatedCount = overrideSignals.filter(s => s.confidence >= 4).length;
      if (highRatedCount >= 2) {
        passed = true;
        overrideUsed = true;
        logger.info({ highRatedCount, estimate: estimate.probability }, 'Override used - multiple high-rated sources agree');
      }
    }
    
    if (!passed) {
      const failedCheck = checks.find(c => !c.passed);
      blockedReason = failedCheck?.details || 'Validation failed';
      
      logger.warn({ 
        estimate: estimate.probability, 
        currentOdd,
        reason: blockedReason,
        overrideUsed 
      }, 'AI validation blocked');
    } else {
      logger.info({ 
        estimate: estimate.probability, 
        confidence: estimate.confidence,
        passed: true 
      }, 'AI validation passed');
    }
    
    return { passed, checks, blockedReason, overrideUsed };
  }
  
  private checkExtreme(probability: number): ValidationCheck {
    const isExtreme = probability >= this.config.blockThresholdHigh || 
                       probability <= (1 - this.config.blockThresholdHigh);
    
    return {
      name: 'extreme',
      passed: !isExtreme,
      details: isExtreme 
        ? `Probability ${(probability * 100).toFixed(0)}% is extreme (${this.config.blockThresholdHigh * 100}%+ or ${((1 - this.config.blockThresholdHigh) * 100).toFixed(0)}%-)` 
        : 'Probability in reasonable range',
    };
  }
  
  private checkDivergence(probability: number, currentOdd: number): ValidationCheck {
    const divergence = Math.abs(probability - currentOdd);
    const isDivergent = divergence > this.config.divergenceThreshold;
    
    return {
      name: 'divergence',
      passed: !isDivergent,
      details: isDivergent 
        ? `AI (${(probability * 100).toFixed(0)}%) diverges from market (${(currentOdd * 100).toFixed(0)}%) by ${(divergence * 100).toFixed(0)}%` 
        : 'AI and market estimates aligned',
    };
  }
  
  private checkConfidence(confidence: number): ValidationCheck {
    const isLow = confidence < 0.3;
    
    return {
      name: 'confidence',
      passed: !isLow,
      details: isLow 
        ? `AI confidence ${(confidence * 100).toFixed(0)}% is very low` 
        : 'AI confidence adequate',
    };
  }
}

export async function validateEstimate(
  estimate: AIEstimate,
  currentOdd?: number,
  overrideSignals?: ResearchSignal[]
): Promise<ValidationResult> {
  const validator = new AIValidator();
  return validator.validate(estimate, currentOdd, overrideSignals);
}
