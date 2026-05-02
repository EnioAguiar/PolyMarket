import { spawn } from 'child_process';
import { SourceCategory } from '../../types/source.js';
import type { ResearchSignal } from '../interface.js';
import { BaseResearchAdapter } from './base.js';

export class Crawl4AIAdapter extends BaseResearchAdapter {
  id = 'crawl4ai';
  name = 'Crawl4AI Web Scraper';
  category = SourceCategory.WEB;
  rating = 2 as const;

  private timeout = 120000;

  async fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    const url = this.topicToUrl(topic);

    return new Promise((resolve, reject) => {
      const args = [
        'python',
        'python/scripts/crawl4ai_web.py',
        '--url', url,
        '--query', topic,
        '--limit', '10'
      ];

      const proc = spawn(args[0], args.slice(1), {
        timeout: this.timeout,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => { stdout += data.toString(); });
      proc.stderr?.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Crawl4AI scraper failed: ${stderr || 'non-zero exit'}`));
          return;
        }

        try {
          const result = JSON.parse(stdout);
          const signals = this.extractSignals(result, topic, marketTimeHorizon);
          resolve(signals);
        } catch (err) {
          reject(new Error(`Failed to parse Crawl4AI output: ${err}`));
        }
      });

      proc.on('error', reject);
    });
  }

  isAvailable(): boolean {
    return true;
  }

  private topicToUrl(topic: string): string {
    const lower = topic.toLowerCase();

    if (lower.includes('bitcoin') || lower.includes('crypto') || lower.includes('ethereum')) {
      return 'https://cointelegraph.com';
    }
    if (lower.includes('sport') || lower.includes('game') || lower.includes('match') || lower.includes('football')) {
      return 'https://www.espn.com';
    }
    if (lower.includes('election') || lower.includes('politic')) {
      return 'https://www.reuters.com';
    }
    if (lower.includes('ai') || lower.includes('openai') || lower.includes('gpt')) {
      return 'https://techcrunch.com';
    }

    return 'https://news.ycombinator.com';
  }

  private extractSignals(result: any, topic: string, marketTimeHorizon?: number): ResearchSignal {
    const posts = result.posts || [];
    const markdownLength = result.markdown_length || 0;

    let confidence = 0.3;
    if (posts.length > 0) confidence += 0.2;
    if (posts.length > 5) confidence += 0.1;
    if (markdownLength > 5000) confidence += 0.15;
    if (markdownLength > 10000) confidence += 0.1;

    let recency = 0.7;
    if (marketTimeHorizon) {
      const hours = marketTimeHorizon / (60 * 60 * 1000);
      if (hours <= 1) recency = 1.0;
      else if (hours <= 6) recency = 0.9;
      else if (hours <= 24) recency = 0.7;
    }

    return {
      sourceId: this.id,
      category: this.category,
      signal: {
        topic,
        postCount: posts.length,
        posts,
        url: result.url,
        markdownLength,
        error: result.error
      },
      confidence: Math.min(confidence, 0.85),
      timestamp: new Date(),
      recency,
      metadata: {
        url: result.url,
        query: topic,
        markdownLength,
        error: result.error
      }
    };
  }
}
