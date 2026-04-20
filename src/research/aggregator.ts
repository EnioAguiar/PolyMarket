import type { ResearchSource, ResearchSignal, AggregatedResearch } from './interface.js';
import { MIN_SOURCES } from '../types/source.js';

export class ResearchAggregator {
  private sources: ResearchSource[];
  
  constructor(sources: ResearchSource[]) {
    this.sources = sources;
  }
  
  async aggregate(
    marketId: string,
    topic: string,
    marketTimeHorizon?: number
  ): Promise<AggregatedResearch> {
    const signals: ResearchSignal[] = [];
    const warnings: string[] = [];
    
    // Fetch from all sources in parallel
    const results = await Promise.allSettled(
      this.sources.map(async (source) => {
        if (!source.isAvailable()) {
          throw new Error(`Source ${source.id} not available`);
        }
        return source.fetch(topic, marketTimeHorizon);
      })
    );
    
    // Collect successful results
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        signals.push(result.value);
      } else {
        warnings.push(`Source ${this.sources[i].id} failed: ${result.reason}`);
      }
    }
    
    // Check minimum sources
    const meetsMinSources = signals.length >= MIN_SOURCES;
    if (!meetsMinSources) {
      warnings.push(`Only ${signals.length} sources (< ${MIN_SOURCES} minimum)`);
    }
    
    // Calculate average confidence
    const avgConfidence = signals.length > 0
      ? signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
      : 0;
    
    return {
      marketId,
      signals,
      totalSources: signals.length,
      avgConfidence,
      bayesianPosterior: avgConfidence,  // Will be recalculated by BayesianScorer
      meetsMinSources,
      warnings,
    };
  }
  
  addSource(source: ResearchSource): void {
    this.sources.push(source);
  }
  
  getSources(): ResearchSource[] {
    return [...this.sources];
  }
}
