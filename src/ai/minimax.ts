import { getLogger } from '../logging/index.js';
import type { AIRequest, AIResponse, AIEstimate, ChainOfThoughtEntry } from '../types/ai.js';

export class MiniMaxAI {
  private apiKey: string;
  private model = 'MiniMax-M2.7';

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
    const apiUrl = 'https://api.minimax.io/anthropic/v1/messages';

    const body = {
      model: this.model,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: this.buildPrompt(request),
      }],
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as {
      content?: Array<{ type: string; text?: string }>;
    };

    const text = data.content?.[0]?.text || '';

    // Extract JSON from response (handle potential markdown code blocks)
    let jsonStr = text;
    if (text.includes('```json')) {
      jsonStr = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (text.includes('```')) {
      jsonStr = text.replace(/```\n?/g, '').trim();
    }

    // Try to extract probability from the response text
    let probability = request.confidenceResult.posterior;
    let reasoning = 'From MiniMax M2.7 response';
    let confidence = request.confidenceResult.confidence;

    try {
      // Try parsing as JSON first
      const parsed = JSON.parse(jsonStr);
      probability = typeof parsed.probability === 'number' ? parsed.probability : probability;
      reasoning = parsed.reasoning || reasoning;
      confidence = typeof parsed.confidence === 'number' ? parsed.confidence : confidence;
    } catch {
      // Fallback: extract numbers from text
      const numMatch = text.match(/(?:probability|pr[o]?b)[:\s]*0?\.\d+/i);
      if (numMatch) {
        const numStr = numMatch[0].replace(/[^0-9.]/g, '');
        probability = parseFloat(numStr) || probability;
      }
    }

    return { probability, reasoning, confidence };
  }
}

export async function generateEstimate(request: AIRequest): Promise<AIResponse> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY environment variable is required');
  }
  const ai = new MiniMaxAI(apiKey);
  return ai.generateEstimate(request);
}
