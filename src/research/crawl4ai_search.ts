import { spawn } from 'child_process';
import { SourceCategory } from '../types/source.js';
import type { ResearchSource, ResearchSignal } from './interface.js';

export class Crawl4AISearchAdapter implements ResearchSource {
  id = 'crawl4ai_search';
  name = 'Crawl4AI Web Search';
  category = SourceCategory.WEB;
  rating = 3 as const;

  async fetch(topic: string, _marketTimeHorizon?: number): Promise<ResearchSignal> {
    return new Promise((resolve, reject) => {
      const args = [
        'scripts/crawl4ai_search.py',
        '--query', topic,
        '--max-results', '5'
      ];

      const proc = spawn('python3', args);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`crawl4ai_search.py exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const data = JSON.parse(stdout);
          const posts = data.results?.flatMap((r: any) =>
            r.posts?.map((p: any) => p.text) || []
          ) || [];

          resolve({
            sourceId: this.id,
            category: this.category,
            signal: { posts, query: data.query, totalPosts: data.total_posts },
            confidence: 0.6,
            timestamp: new Date(),
            recency: 1.0,
            metadata: {
              totalUrls: data.results?.length || 0,
              totalPosts: data.total_posts || 0
            }
          });
        } catch (e) {
          reject(new Error(`Failed to parse crawl4ai_search output: ${stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn crawl4ai_search.py: ${err.message}`));
      });
    });
  }

  isAvailable(): boolean {
    return true;
  }
}

export const crawl4aiSearchAdapter = new Crawl4AISearchAdapter();