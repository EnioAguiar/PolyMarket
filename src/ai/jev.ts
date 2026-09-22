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

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TypeSafe API error: ${response.status} ${body}`);
  }

  const data = await response.json();
  const answer = data.answers.judgment;
  return {
    probability: answer.noul,
    confidence: answer.confidence ?? 1,
  };
}
