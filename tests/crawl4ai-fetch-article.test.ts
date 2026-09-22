import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { spawn, type ChildProcess } from 'node:child_process';
import { fetchArticleText } from '../src/research/crawl4ai.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

interface FakeChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
}

function makeFakeProcess(): FakeChildProcess {
  const proc = new EventEmitter() as FakeChildProcess;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchArticleText', () => {
  it('returns the markdown text from a successful crawl', async () => {
    const fakeProcess = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProcess as unknown as ChildProcess);

    const resultPromise = fetchArticleText('https://example.com/article');

    fakeProcess.stdout.emit('data', Buffer.from(JSON.stringify({ markdown: 'Article body text.', error: null })));
    fakeProcess.emit('close', 0);

    const text = await resultPromise;
    expect(text).toBe('Article body text.');
    expect(spawn).toHaveBeenCalledWith(
      'python3',
      ['scripts/crawl4ai_article.py', '--url', 'https://example.com/article'],
      expect.objectContaining({ timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] })
    );
  });

  it('rejects when the subprocess exits non-zero', async () => {
    const fakeProcess = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProcess as unknown as ChildProcess);

    const resultPromise = fetchArticleText('https://example.com/broken');
    fakeProcess.stderr.emit('data', Buffer.from('crawl failed'));
    fakeProcess.emit('close', 1);

    await expect(resultPromise).rejects.toThrow();
  });

  it('rejects when the crawl script reports an error', async () => {
    const fakeProcess = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProcess as unknown as ChildProcess);

    const resultPromise = fetchArticleText('https://example.com/unreachable');
    fakeProcess.stdout.emit('data', Buffer.from(JSON.stringify({ markdown: '', error: 'Crawl failed: timeout' })));
    fakeProcess.emit('close', 0);

    await expect(resultPromise).rejects.toThrow('Crawl failed: timeout');
  });
});
