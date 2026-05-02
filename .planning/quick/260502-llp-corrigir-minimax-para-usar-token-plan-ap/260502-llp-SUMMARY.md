---
quick_id: 260502-llp
status: complete
date: "2026-05-02"
---

# Quick Task 260502-llp: corrigir minimax para usar token plan api key

**Status:** ✓ Complete

## Summary

Updated `src/ai/minimax.ts` to use MiniMax Token Plan API (Anthropic-compatible endpoint).

## Changes Made

### 1. Updated Model Name
- Changed from `'MiniMax 2'` to `'MiniMax-M2.7'` (correct Token Plan model)

### 2. Updated API Endpoint
- Old: `https://api.minimax.chat/v1/text/chatcompletion_v2`
- New: `https://api.minimax.io/anthropic/v1/messages` (Anthropic-compatible)

### 3. Implemented Real API Call
- Added proper Bearer authentication with `MINIMAX_API_KEY`
- Sends messages in Anthropic format
- Handles JSON responses and markdown code blocks
- Falls back to extracting probability from text if JSON parse fails

### 4. Added Validation
- `generateEstimate()` now throws error if `MINIMAX_API_KEY` is not set

## Verification

- ✅ TypeScript compiles without errors (`npx tsc --noEmit`)

## Notes

- Your Token Plan key (`sk-cp-...`) is compatible with the Anthropic endpoint
- The API call uses the correct model name `MiniMax-M2.7`