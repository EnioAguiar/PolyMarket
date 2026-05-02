#!/usr/bin/env python3
"""
Crawl4AI-based general web scraper for Polymarket Bot.
Scrapes any website for research purposes.

Usage:
    python scripts/crawl4ai_web.py --url "https://news.site.com" --query "Bitcoin"
"""

import asyncio
import argparse
import json
import sys
import re
from datetime import datetime
from typing import Optional

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


async def scrape_url(url: str, query: Optional[str], limit: int) -> dict:
    """Scrape a URL using Crawl4AI."""
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
        css_selector="body",  # Get everything first, filter later
        cache_mode="bypass",
        delay_before_return_html=2.0,
        js_code="""
        async () => {
            // Scroll down to load content
            for (let i = 0; i < 3; i++) {
                window.scrollBy(0, 500);
                await new Promise(r => setTimeout(r, 800));
            }
            window.scrollTo(0, 0);
        }
        """
    )

    result = {
        "source": "crawl4ai_web",
        "url": url,
        "query": query,
        "posts": [],
        "count": 0,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "error": None
    }

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            crawl_result = await crawler.arun(url=url, config=run_config)

            if not crawl_result.success:
                result["error"] = f"Crawl failed: {crawl_result.error_message}"
                return result

            # Get the raw markdown content
            content = str(crawl_result.markdown)
            result["markdown_length"] = len(content)
            result["success"] = crawl_result.success

            # Parse content into clean chunks
            posts = parse_content(content, limit)
            result["posts"] = posts
            result["count"] = len(posts)

            # Store sample
            result["sample"] = content[:2000] if content else ""

    except Exception as e:
        result["error"] = str(e)

    return result


def parse_content(markdown: str, limit: int) -> list:
    """Parse markdown content into clean, structured chunks."""
    if not markdown or len(markdown) < 100:
        return []

    posts = []
    lines = markdown.split('\n')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip UI elements
        skip_patterns = [
            r'^!\[\]',
            r'^\s*\|',
            r'^\s*\[submit\]',
            r'^\s*\[login\]',
            r'^\s*\[ask\]',
            r'^\s*\[show\]',
            r'^\s*\[jobs\]',
            r'^\s*\[comment',
            r'^\s*Hacker\s+News',
            r'^\s*news\.ycombinator',
            r'^\s*\+\d+',
            r'^\s*\d+\s+(hour|day|minute|second)',
            r'^\s*by\s+\w+',
            r'^\s*#+\s*$',
        ]

        should_skip = any(re.match(p, line, re.IGNORECASE) for p in skip_patterns)
        if should_skip:
            continue

        # Skip short lines
        if len(line) < 50:
            continue

        # Skip lines that are mostly markdown/UI
        special_chars = sum(1 for c in line if c in '|[]{}()_*#^~`>/<\\')
        if special_chars / max(len(line), 1) > 0.25:
            continue

        # Clean markdown links to text
        clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', line)
        clean = re.sub(r'[#*_`~^>\-\+]+', '', clean)
        clean = clean.strip()

        if len(clean) > 50 and len(clean) < 800:
            posts.append({
                "text": clean,
                "type": "content"
            })

        if len(posts) >= limit:
            break

    return posts


async def main():
    parser = argparse.ArgumentParser(description='Crawl4AI Web Scraper')
    parser.add_argument('--url', type=str, required=True, help='URL to scrape')
    parser.add_argument('--query', type=str, help='Topic/query context')
    parser.add_argument('--limit', type=int, default=10, help='Max content chunks')

    args = parser.parse_args()

    result = await scrape_url(args.url, args.query, args.limit)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())