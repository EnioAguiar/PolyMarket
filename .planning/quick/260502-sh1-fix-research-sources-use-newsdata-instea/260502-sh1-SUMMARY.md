---
quick_id: 260502-sh1
status: complete
---

# Quick Task 260502-sh1: Fix Research Sources

**Completed:** 2026-05-02

## Summary
Removed wrong Google and Crawl4AI adapters that were using incorrect approaches.

## Changes Made
- DELETED `src/research/sources/google.ts` - NewsData already exists at `src/research/newsdata.ts`
- DELETED `src/research/sources/crawl4ai.ts` - Using hardcoded URL mapping instead of search-first approach

## Correct Implementation (Already Existed)
- `src/research/newsdata.ts` - NewsData.io adapter (replaces Google)
- `src/research/crawl4ai_search.ts` + `scripts/crawl4ai_search.py` - Search first (Brave API/scrape), then scrape URLs
