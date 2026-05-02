import { getLogger } from '../logging/index.js';
import type { AIRequest, AIEstimate } from '../types/ai.js';
import type { AggregatedResearch } from '../research/interface.js';
import { MiniMaxAI } from './minimax.js';
import { AIValidator } from './validation.js';

export class AIChain {
  private ai: MiniMaxAI;
  private validator: AIValidator;
  
  constructor() {
    this.ai = new MiniMaxAI(process.env.MINIMAX_API_KEY || 'demo-key');
    this.validator = new AIValidator();
  }
  
  async run(
    marketId: string,
    question: string,
    research: AggregatedResearch,
    currentOdd?: number
  ): Promise<{ estimate: AIEstimate; validation: ReturnType<AIValidator['validate']> }> {
    const logger = getLogger();
    
    logger.info({ 
      marketId, 
      sources: research.totalSources,
      bayesianPosterior: research.bayesianPosterior 
    }, 'Starting AI chain');
    
    // Build AI request from research
    const request: AIRequest = {
      marketId,
      question,
      signals: research.signals,
      confidenceResult: {
        posterior: research.bayesianPosterior,
        confidence: research.avgConfidence,
        sourceCount: research.totalSources,
        weightedEvidence: research.bayesianPosterior - 0.5, // Approximate from posterior
        individualScores: [], // Not available at this level
        avgWeight: 0.5, // Default value
        meetsMinRating: research.meetsMinSources,
        warnings: research.warnings,
      },
      currentOdd,
    };
    
    // Generate estimate with chain-of-thought
    const response = await this.ai.generateEstimate(request);
    
    // Validate estimate
    const validation = this.validator.validate(
      response.estimate,
      currentOdd,
      research.signals
    );
    
    if (!validation.passed) {
      logger.warn({ 
        marketId, 
        reason: validation.blockedReason,
        overrideUsed: validation.overrideUsed 
      }, 'AI estimate blocked by validation');
    }
    
    return { estimate: response.estimate, validation };
  }
}
