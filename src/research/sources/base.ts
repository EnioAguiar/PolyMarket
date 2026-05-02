import type { ResearchSource, ResearchSignal } from '../interface.js';
import type { SourceCategory } from '../../types/source.js';

export abstract class BaseResearchAdapter implements ResearchSource {
  abstract id: string;
  abstract name: string;
  abstract category: SourceCategory;
  abstract rating: 1 | 2 | 3 | 4 | 5;

  abstract fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal>;

  isAvailable(): boolean {
    return true;
  }

  protected createSignal(
    signal: unknown,
    confidence: number,
    metadata?: Record<string, unknown>
  ): ResearchSignal {
    return {
      sourceId: this.id,
      category: this.category,
      signal,
      confidence,
      timestamp: new Date(),
      recency: 1.0,
      metadata,
    };
  }
}
