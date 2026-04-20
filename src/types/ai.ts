import type { ResearchSignal } from '../research/interface.js';
import type { ConfidenceResult } from '../research/confidence.js';

export interface AIEstimate {
  probability: number;      // 0-1 estimated probability
  reasoning: string;        // Chain-of-thought reasoning
  confidence: number;        // AI's own confidence (0-1)
  sources: string[];         // Source IDs used
  model: string;            // "MiniMax 2"
  timestamp: Date;
}

export interface AIRequest {
  marketId: string;
  question: string;
  signals: ResearchSignal[];
  confidenceResult: ConfidenceResult;
  currentOdd?: number;      // Market odd for validation
}

export interface AIResponse {
  estimate: AIEstimate;
  chainOfThought: ChainOfThoughtEntry[];
}

export interface ChainOfThoughtEntry {
  step: string;
  input: unknown;
  output: unknown;
  timestamp: Date;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
  blockedReason?: string;
  overrideUsed?: boolean;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  details: string;
}

export enum ValidationMode {
  STRICT = 'strict',
  HYBRID = 'hybrid',
}
