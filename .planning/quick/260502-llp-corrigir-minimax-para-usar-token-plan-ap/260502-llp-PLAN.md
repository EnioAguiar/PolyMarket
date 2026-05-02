---
quick_id: 260502-llp
plan: "1"
type: quick
tasks: 3
---

corrigir minimax para usar token plan api key

## Tasks

### Task 1: Update MiniMax API endpoint

Update `src/ai/minimax.ts` to use the Anthropic-compatible endpoint for Token Plan:
- Endpoint: `https://api.minimax.io/anthropic/v1/messages`
- Model: `MiniMax-M2.7`
- Use Bearer authentication with the `MINIMAX_API_KEY` env var

### Task 2: Update generateEstimate to call real API

Replace the placeholder `callMiniMax` with actual API call:
- Send proper JSON with `model`, `max_tokens`, `messages`
- Handle response and extract probability from LLM output
- Add proper error handling

### Task 3: Verify TypeScript compiles

Run `npx tsc --noEmit` to ensure no type errors.

## Verification

- `npx tsc --noEmit` passes
- `MINIMAX_API_KEY=sk-cp-...` env var is used correctly