import { getLogger } from '../logging/index.js';
import type { AIRequest, AIResponse, AIEstimate, ChainOfThoughtEntry } from '../types/ai.js';

export class MiniMaxAI {
  private apiKey: string;
  private model = 'MiniMax 2';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async generateEstimate(request: AIRequest): Promise<AIResponse> {
    const logger = getLogger();
    const chainOfThought: ChainOfThoughtEntry[] = [];
    
    // Step 1: Signal Analysis
    const signalsStep = this.logStep('Signal Analysis', {
      signalCount: request.signals.length,
      sources: [...new Set(request.signals.map(s => s.sourceId))],
    }, {
      analyzedSignals: request.signals.length,
      uniqueSources: [...new Set(request.signals.map(s => s.sourceId))],
    });
    chainOfThought.push(signalsStep);
    
    // Step 2: Confidence Integration
    const confidenceStep = this.logStep('Confidence Integration', {
      bayesianPosterior: request.confidenceResult.posterior,
      confidence: request.confidenceResult.confidence,
      sourceCount: request.confidenceResult.sourceCount,
    }, {
      weightedPosterior: request.confidenceResult.posterior,
      effectiveConfidence: request.confidenceResult.confidence,
    });
    chainOfThought.push(confidenceStep);
    
    // Step 3: Prior Update (Bayesian)
    const priorStep = this.logStep('Prior Update', {
      prior: 0.5,
      likelihood: request.confidenceResult.confidence,
    }, {
      posterior: request.confidenceResult.posterior,
    });
    chainOfThought.push(priorStep);
    
    // Step 4: LLM Inference (MiniMax 2)
    const llmStep = await this.logStepAsync('LLM Inference', {
      model: this.model,
      prompt: this.buildPrompt(request),
    }, async () => this.callMiniMax(request));
    chainOfThought.push(llmStep);
    
    // Build final estimate
    const llmOutput = llmStep.output as { probability: number; reasoning: string; confidence: number };
    const estimate: AIEstimate = {
      probability: llmOutput.probability,
      reasoning: llmOutput.reasoning,
      confidence: llmOutput.confidence,
      sources: [...new Set(request.signals.map(s => s.sourceId))],
      model: this.model,
      timestamp: new Date(),
    };
    
    // Log full chain of thought
    logger.info({ 
      chainOfThought,
      estimate,
      marketId: request.marketId 
    }, 'AI estimation complete with chain-of-thought');
    
    return { estimate, chainOfThought };
  }
  
  private logStep(step: string, input: unknown, output: unknown): ChainOfThoughtEntry {
    return {
      step,
      input,
      output,
      timestamp: new Date(),
    };
  }
  
  private async logStepAsync<T>(
    step: string, 
    input: unknown, 
    fn: () => Promise<T>
  ): Promise<ChainOfThoughtEntry> {
    const output = await fn();
    return {
      step,
      input,
      output,
      timestamp: new Date(),
    };
  }
  
  private buildPrompt(request: AIRequest): string {
    return `
Given the following market question and research signals, estimate the probability that this market resolves YES.

Market Question: ${request.question}
Market ID: ${request.marketId}

Research Summary:
- Number of signals: ${request.signals.length}
- Bayesian posterior estimate: ${request.confidenceResult.posterior.toFixed(2)}
- Confidence: ${request.confidenceResult.confidence.toFixed(2)}
- Source count: ${request.confidenceResult.sourceCount}

Provide your estimate as a JSON object:
{
  "probability": 0.0-1.0,
  "reasoning": "brief explanation",
  "confidence": 0.0-1.0
}
`.trim();
  }
  
  private async callMiniMax(request: AIRequest): Promise<{probability: number; reasoning: string; confidence: number}> {
    // MiniMax API call - placeholder for now returns Bayesian estimate
    // In production, this calls MiniMax API with proper authentication
    
    const apiUrl = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
    
    // For development, return Bayesian estimate as fallback
    // TODO: Implement actual MiniMax API call when API key is available
    return {
      probability: request.confidenceResult.posterior,
      reasoning: 'Based on Bayesian analysis of research signals',
      confidence: request.confidenceResult.confidence,
    };
  }
}

export async function generateEstimate(request: AIRequest): Promise<AIResponse> {
  const apiKey = process.env.MINIMAX_API_KEY || 'demo-key';
  const ai = new MiniMaxAI(apiKey);
  return ai.generateEstimate(request);
}
