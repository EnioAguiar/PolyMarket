import { describe, it, expect, vi, afterEach } from 'vitest';
import { judgeNoul } from '../src/ai/jev.js';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TYPESAFE_API_KEY;
});

describe('judgeNoul', () => {
  it('returns a probability from a successful call', async () => {
    process.env.TYPESAFE_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        // Exact shape confirmed against a real live TypeSafe /v1/systemone call.
        model: 'jev-1.13.0',
        answers: { judgment: { type: 'noul', noul: 0.73 } },
        usage: { input_tokens: 274, output_tokens: 22 },
      }),
    } as Response);

    const result = await judgeNoul('Some state', 'Some instructions');
    expect(result.probability).toBe(0.73);
  });

  it('throws when TYPESAFE_API_KEY is not set', async () => {
    delete process.env.TYPESAFE_API_KEY;
    await expect(judgeNoul('state', 'instructions')).rejects.toThrow('TYPESAFE_API_KEY');
  });

  it('throws on a non-ok response', async () => {
    process.env.TYPESAFE_API_KEY = 'test-key';
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized',
    } as Response);
    await expect(judgeNoul('state', 'instructions')).rejects.toThrow('401');
  });
});
