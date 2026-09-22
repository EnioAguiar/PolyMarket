#!/usr/bin/env python3
"""
Crawl4AI-based single-article text extractor for Polymarket Bot.
Fetches the full markdown text of one article/page URL. No LLM extraction
strategy is used here — plain markdown conversion, since downstream
semantic judgment (Jev) handles interpretation, not crawl4ai.

Usage:
    python scripts/crawl4ai_article.py --url "https://example.com/article"
"""

import asyncio
import argparse
import json
import sys

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


async def fetch_article(url: str) -> dict:
    """Fetch the full markdown text of a single article URL."""
    browser_config = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=720,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    run_config = CrawlerRunConfig(
        page_timeout=60000,
        remove_overlay_elements=True,
        word_count_threshold=10,
        cache_mode="bypass",
    )

    result = {
        "source": "crawl4ai_article",
        "url": url,
        "markdown": "",
        "error": None
    }

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            crawl_result = await crawler.arun(url=url, config=run_config)

            if not crawl_result.success:
                result["error"] = f"Crawl failed: {crawl_result.error_message}"
                return result

            result["markdown"] = str(crawl_result.markdown)

    except Exception as e:
        result["error"] = str(e)

    return result


async def main():
    parser = argparse.ArgumentParser(description='Crawl4AI Article Text Fetcher')
    parser.add_argument('--url', type=str, required=True, help='URL to fetch')

    args = parser.parse_args()

    result = await fetch_article(args.url)
    print(json.dumps(result))


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
