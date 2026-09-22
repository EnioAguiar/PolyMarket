import { describe, it, expect, vi, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { fetchArticleText } from '../src/research/crawl4ai.js';

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
}));

// Mirrors crawl4ai.ts's own PYTHON_BIN resolution: prefer the project venv
// (has crawl4ai installed) over bare `python3` (generally does not), with
// a PYTHON_BIN env override. Computed the same way here so this assertion
// tracks real environment state instead of pinning a stale hardcoded value.
const expectedPythonBin = process.env.PYTHON_BIN ?? (existsSync('.venv/bin/python3') ? '.venv/bin/python3' : 'python3');

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
      expectedPythonBin,
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

  it('truncates article text to the Jev-safe cap', async () => {
    const fakeProcess = makeFakeProcess();
    vi.mocked(spawn).mockReturnValue(fakeProcess as unknown as ChildProcess);

    const hugeMarkdown = 'a'.repeat(210_000);
    const resultPromise = fetchArticleText('https://example.com/huge-article');
    fakeProcess.stdout.emit('data', Buffer.from(JSON.stringify({ markdown: hugeMarkdown, error: null })));
    fakeProcess.emit('close', 0);

    const text = await resultPromise;
    expect(text.length).toBe(5000);
    expect(text).toBe(hugeMarkdown.slice(0, 5000));
  });
});
