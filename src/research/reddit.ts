import { spawn } from 'child_process';
import { SourceCategory } from '../types/source.js';
import type { ResearchSource, ResearchSignal } from './interface.js';

const REDDIT_SCRIPT = './scripts/reddit_scraper.py';

/**
 * RedditAdapter - implements ResearchSource for Reddit via PRAW subprocess.
 * Rating: ★4 (better signal-to-noise than Twitter for well-defined topics)
 */
export class RedditAdapter implements ResearchSource {
  id = 'reddit';
  name = 'Reddit API';
  category = SourceCategory.SOCIAL;
  rating = 4 as const;

  private cache = new Map<string, { signal: ResearchSignal; expiry: number }>();
  private cacheTtl = 5 * 60 * 1000; // 5 minutes

  async fetch(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    // Check cache
    const cached = this.cache.get(topic);
    if (cached && cached.expiry > Date.now()) {
      return cached.signal;
    }

    const signal = await this.fetchFromPython(topic, marketTimeHorizon);

    // Cache result
    this.cache.set(topic, { signal, expiry: Date.now() + this.cacheTtl });

    return signal;
  }

  private fetchFromPython(topic: string, marketTimeHorizon?: number): Promise<ResearchSignal> {
    return new Promise((resolve, reject) => {
      const limit = marketTimeHorizon && marketTimeHorizon <= 60 ? 5 : 10;
      const sort = 'hot'; // Default sort for general research

      const child = spawn('python3', [REDDIT_SCRIPT, topic, String(limit), sort], {
        timeout: 10000,
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`reddit_scraper.py exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);

          if (parsed.error) {
            reject(new Error(`Reddit API error: ${parsed.error}`));
            return;
          }

          const signal = {
            sourceId: this.id,
            category: this.category,
            signal: {
              subreddit: parsed.subreddit,
              posts: parsed.posts,
              postCount: parsed.count,
            },
            confidence: this.calculateConfidence(parsed),
            timestamp: new Date(),
            recency: this.calculateRecency(parsed),
            metadata: { source: 'reddit' },
          };

          resolve(signal);
        } catch (err) {
          reject(new Error(`Failed to parse Reddit response: ${err}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn reddit_scraper.py: ${err.message}`));
      });

      setTimeout(() => {
        child.kill();
        reject(new Error('Reddit fetch timeout'));
      }, 10000);
    });
  }

  isAvailable(): boolean {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    return !!clientId && !!clientSecret;
  }

  private calculateConfidence(response: { posts?: { score?: number }[]; count?: number }): number {
    // Base confidence
    let confidence = 0.7; // Higher than Twitter - Reddit has better structure

    // More posts = higher confidence
    const count = response.count || 0;
    if (count > 5) confidence += 0.1;
    if (count > 10) confidence += 0.1;

    // High engagement posts indicate quality
    const posts = response.posts || [];
    const highScorePosts = posts.filter((p) => (p.score || 0) > 100).length;
    if (highScorePosts > 3) confidence += 0.1;

    return Math.min(confidence, 0.95);
  }

  private calculateRecency(response: { timestamp?: string }): number {
    if (!response.timestamp) return 0.5;

    const now = Date.now();
    const then = new Date(response.timestamp).getTime();
    const ageMs = now - then;

    // Fresh = < 5 minutes
    if (ageMs < 5 * 60 * 1000) return 1.0;
    // Recent = < 15 minutes
    if (ageMs < 15 * 60 * 1000) return 0.8;
    // Old = < 1 hour
    if (ageMs < 60 * 60 * 1000) return 0.5;

    return 0.2;
  }

  clearCache(): void {
    this.cache.clear();
  }
}