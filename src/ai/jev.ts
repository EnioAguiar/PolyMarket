export interface JevNoulResult {
  probability: number;
  confidence: number;
}

/**
 * Ask Jev (TypeSafe System One) a calibrated yes/no ("noul") question about
 * a given state description, returning a probability in [0, 1].
 *
 * Response shape confirmed against a real live call to
 * POST https://api.typesafe.ai/v1/systemone:
 * {
 *   "model": "jev-1.13.0",
 *   "answers": { "judgment": { "type": "noul", "noul": 0.87 } },
 *   "usage": { "input_tokens": 274, "output_tokens": 22 }
 * }
 * There is no per-question or top-level confidence field in the real
 * response, so confidence defaults to 1 when absent.
 */
export async function judgeNoul(state: string, instructions: string): Promise<JevNoulResult> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('TYPESAFE_API_KEY environment variable is required');
  }

  // TypeSafe returns 5xx (observed live: 529 system_overloaded) under load.
  // A single failed judgment previously propagated straight to the caller,
  // which in scripts/validate-research.ts's backtest loop silently dropped
  // that market from every summary counter with no accounting (review
  // finding, 2026-09-22, after a wider backtest run lost a market to this
  // exact error). Retry transient 5xx with backoff before giving up --
  // callers should only see a thrown error for a genuinely persistent
  // failure or a non-5xx (4xx) error, which retrying cannot fix.
  const maxAttempts = 3;
  let lastError: Error = new Error('unreachable');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state,
        questions: {
          judgment: { type: 'noul', instructions },
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const answer = data.answers.judgment;
      return {
        probability: answer.noul,
        confidence: answer.confidence ?? 1,
      };
    }

    const body = await response.text();
    lastError = new Error(`TypeSafe API error: ${response.status} ${body}`);
    if (response.status < 500 || attempt === maxAttempts) throw lastError;
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 500 * 2 ** (attempt - 1));
    await promise;
  }
  throw lastError;
}
