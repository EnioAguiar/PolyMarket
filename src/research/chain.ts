import type { ResearchSource, AggregatedResearch } from './interface.js';
import { ResearchAggregator } from './aggregator.js';
import { BayesianScorer } from './confidence.js';

export class ResearchChain {
  private aggregator: ResearchAggregator;
  private scorer: BayesianScorer;
  
  constructor(sources: ResearchSource[]) {
    this.aggregator = new ResearchAggregator(sources);
    this.scorer = new BayesianScorer(0.5);
  }
  
  async run(
    marketId: string,
    topic: string,
    marketTimeHorizon?: number
  ): Promise<AggregatedResearch> {
    // Aggregate research from all sources
    const aggregated = await this.aggregator.aggregate(marketId, topic, marketTimeHorizon);
    
    // Calculate Bayesian confidence
    const result = this.scorer.calculate(aggregated.signals);
    
    // Update aggregated result with Bayesian posterior
    aggregated.bayesianPosterior = result.posterior;
    
    // Add any new warnings from scoring
    aggregated.warnings.push(...result.warnings);
    
    return aggregated;
  }
  
  addSource(source: ResearchSource): void {
    this.aggregator.addSource(source);
  }
}
