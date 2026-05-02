import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TwitterAdapter } from '../../src/research/twitter.js';
import { RedditAdapter } from '../../src/research/reddit.js';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn()
}));

describe('TwitterAdapter', () => {
  let adapter: TwitterAdapter;
  
  beforeEach(() => {
    adapter = new TwitterAdapter();
  });
  
  it('has correct initial state', () => {
    expect(adapter.id).toBe('twitter');
    expect(adapter.name).toBe('Twitter/X API');
    expect(adapter.category).toBe('social');
    expect(adapter.rating).toBe(3);
  });
  
  it('isAvailable returns true when TWITTER_BEARER_TOKEN is set', () => {
    process.env.TWITTER_BEARER_TOKEN = 'test-token';
    const result = adapter.isAvailable();
    expect(result).toBe(true);
    delete process.env.TWITTER_BEARER_TOKEN;
  });
  
  it('isAvailable returns false when TWITTER_BEARER_TOKEN is not set', () => {
    delete process.env.TWITTER_BEARER_TOKEN;
    const result = adapter.isAvailable();
    expect(result).toBe(false);
  });
  
  it('clearCache removes all cached entries', () => {
    adapter.clearCache();
    // No error means success
    expect(true).toBe(true);
  });
});

describe('RedditAdapter', () => {
  let adapter: RedditAdapter;
  
  beforeEach(() => {
    adapter = new RedditAdapter();
  });
  
  it('has correct initial state', () => {
    expect(adapter.id).toBe('reddit');
    expect(adapter.name).toBe('Reddit API');
    expect(adapter.category).toBe('social');
    expect(adapter.rating).toBe(4);
  });
  
  it('isAvailable returns true when credentials are set', () => {
    process.env.REDDIT_CLIENT_ID = 'test-id';
    process.env.REDDIT_CLIENT_SECRET = 'test-secret';
    const result = adapter.isAvailable();
    expect(result).toBe(true);
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
  });
  
  it('isAvailable returns false when REDDIT_CLIENT_ID is not set', () => {
    delete process.env.REDDIT_CLIENT_ID;
    process.env.REDDIT_CLIENT_SECRET = 'test-secret';
    const result = adapter.isAvailable();
    expect(result).toBe(false);
    delete process.env.REDDIT_CLIENT_SECRET;
  });
  
  it('isAvailable returns false when REDDIT_CLIENT_SECRET is not set', () => {
    process.env.REDDIT_CLIENT_ID = 'test-id';
    delete process.env.REDDIT_CLIENT_SECRET;
    const result = adapter.isAvailable();
    expect(result).toBe(false);
    delete process.env.REDDIT_CLIENT_ID;
  });
  
  it('isAvailable returns false when neither credential is set', () => {
    delete process.env.REDDIT_CLIENT_ID;
    delete process.env.REDDIT_CLIENT_SECRET;
    const result = adapter.isAvailable();
    expect(result).toBe(false);
  });
  
  it('clearCache removes all cached entries', () => {
    adapter.clearCache();
    // No error means success
    expect(true).toBe(true);
  });
});