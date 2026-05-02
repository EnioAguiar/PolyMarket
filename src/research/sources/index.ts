import type { ResearchSource } from '../interface.js';
import type { SourceCategory } from '../../types/source.js';

export { BaseResearchAdapter } from './base.js';
export type { ResearchSource } from '../interface.js';

export interface SourceRegistry {
  getSourcesForCategory(category: SourceCategory): ResearchSource[];
  getSourceById(id: string): ResearchSource | null;
  getAllSources(): ResearchSource[];
  getPrimarySource(category: SourceCategory): ResearchSource | null;
}

class InMemorySourceRegistry implements SourceRegistry {
  private sources: Map<string, ResearchSource> = new Map();

  register(source: ResearchSource): void {
    this.sources.set(source.id, source);
  }

  getSourcesForCategory(category: SourceCategory): ResearchSource[] {
    return Array.from(this.sources.values())
      .filter(s => s.category === category)
      .sort((a, b) => b.rating - a.rating);
  }

  getSourceById(id: string): ResearchSource | null {
    return this.sources.get(id) || null;
  }

  getAllSources(): ResearchSource[] {
    return Array.from(this.sources.values());
  }

  getPrimarySource(category: SourceCategory): ResearchSource | null {
    const sources = this.getSourcesForCategory(category);
    return sources[0] || null;
  }
}

export const sourceRegistry = new InMemorySourceRegistry();

export function registerResearchSource(source: ResearchSource): void {
  sourceRegistry.register(source);
}

export function getSourcesForCategory(category: SourceCategory): ResearchSource[] {
  return sourceRegistry.getSourcesForCategory(category);
}

export function getPrimarySource(category: SourceCategory): ResearchSource | null {
  return sourceRegistry.getPrimarySource(category);
}

export function getAllSources(): ResearchSource[] {
  return sourceRegistry.getAllSources();
}
