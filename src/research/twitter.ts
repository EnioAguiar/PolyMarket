import { spawn } from 'child_process';
import { SourceCategory } from '../types/source.js';
import type { ResearchSource, ResearchSignal } from './interface.js';

const TWITTER_SCRIPT = './scripts/twitter_scraper.py';

/**
 * TwitterAdapter - implements ResearchSource for Twitter API via Tweepy subprocess.
 * Rating: ★3 (minimum viable - high noise, fast signal for breaking news)
 */
export class TwitterAdapter implements ResearchSource {
  id = 'twitter';
  name = 'Twitter/X API';
  category = SourceCategory.SOCIAL;
  rating = 3 as const;

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
      const maxResults = marketTimeHorizon && marketTimeHorizon <= 60 ? 5 : 10;
      const child = spawn('python3', [TWITTER_SCRIPT, topic, String(maxResults)], {
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
          reject(new Error(`twitter_scraper.py exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const parsed = JSON.parse(stdout);

          if (parsed.error) {
            reject(new Error(`Twitter API error: ${parsed.error}`));
            return;
          }

          const signal = {
            sourceId: this.id,
            category: this.category,
            signal: {
              query: parsed.query,
              posts: parsed.posts,
              postCount: parsed.count,
            },
            confidence: this.calculateConfidence(parsed),
            timestamp: new Date(),
            recency: this.calculateRecency(parsed),
            metadata: { source: 'twitter' },
          };

          resolve(signal);
        } catch (err) {
          reject(new Error(`Failed to parse Twitter response: ${err}`));
        }
      });

      child.on('error', (err) => {
        reject(new Error(`Failed to spawn twitter_scraper.py: ${err.message}`));
      });

      setTimeout(() => {
        child.kill();
        reject(new Error('Twitter fetch timeout'));
      }, 10000);
    });
  }

  isAvailable(): boolean {
    const token = process.env.TWITTER_BEARER_TOKEN;
    return !!token;
  }

  private calculateConfidence(response: { posts?: unknown[]; count?: number }): number {
    // Base confidence
    let confidence = 0.6;

    // More posts = higher confidence
    const count = response.count || 0;
    if (count > 5) confidence += 0.1;
    if (count > 10) confidence += 0.1;

    // High-quality posts have public metrics
    return Math.min(confidence, 0.9);
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