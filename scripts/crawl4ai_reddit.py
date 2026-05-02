#!/usr/bin/env python3
"""
Crawl4AI-based Reddit scraper for Polymarket Bot.
Scrapes Reddit without requiring PRAW API credentials.

Usage:
    python scripts/crawl4ai_reddit.py --subreddit CryptoCurrency --limit 10
    python scripts/crawl4ai_reddit.py --subreddit worldnews --search "election" --limit 10

Output: JSON to stdout
"""

import asyncio
import argparse
import json
import sys
import re
from datetime import datetime
from typing import Optional

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


async def scrape_subreddit(subreddit: str, search: Optional[str], limit: int) -> dict:
    """Scrape posts from a subreddit using Crawl4AI."""
    if search:
        url = f"https://www.reddit.com/r/{subreddit}/search/?q={search}&restrict_sr=1"
    else:
        url = f"https://www.reddit.com/r/{subreddit}/"

    browser_config = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=720,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    crawler_config = CrawlerRunConfig(
        page_timeout=30000,
        remove_overlay_elements=True,
        css_selector="div[data-testid='post-container']",  # Post containers
    )

    result = {
        "source": "crawl4ai_reddit",
        "subreddit": subreddit,
        "search": search,
        "posts": [],
        "count": 0,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "error": None
    }

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            crawl_result = await crawler.arun(url=url, config=crawler_config)

            if not crawl_result.success:
                result["error"] = f"Crawl failed: {crawl_result.error_message}"
                return result

            # Parse posts from markdown
            posts = parse_posts_from_markdown(crawl_result.markdown, limit)
            result["posts"] = posts
            result["count"] = len(posts)

    except Exception as e:
        result["error"] = str(e)

    return result


def parse_posts_from_markdown(markdown: str, limit: int) -> list:
    """Extract post data from Crawl4AI markdown output."""
    posts = []
    lines = markdown.split('\n')

    current_post = {}
    for line in lines:
        line = line.strip()

        # Skip empty lines and headers
        if not line or line.startswith('#') or line.startswith('http'):
            continue

        # Look for post title (substantial text that looks like a title)
        if len(line) > 20 and len(line) < 300 and not line.startswith('['):
            if current_post and current_post.get('title'):
                # Previous post is complete
                posts.append(current_post)

            current_post = {
                "title": line,
                "url": "",
                "score": extract_number(line, ['↑', '▲', '+']),
                "num_comments": 0,
                "created_utc": None,
                "upvote_ratio": 0.9
            }

        # Look for post metadata
        if current_post:
            if 'comments' in line.lower() or '💬' in line:
                current_post['num_comments'] = extract_number(line, ['💬', 'comments'])

            # Check for URL
            url_match = re.search(r'\[([^\]]+)\]\((https?://[^\)]+)\)', line)
            if url_match and not current_post.get('url'):
                current_post['title'] = current_post.get('title', url_match.group(1))
                current_post['url'] = url_match.group(2)

        if len(posts) >= limit:
            break

    # Don't forget the last post
    if current_post and current_post.get('title') and len(posts) < limit:
        posts.append(current_post)

    return posts


def extract_number(text: str, prefixes: list) -> int:
    """Extract a number from text that follows certain prefixes."""
    for prefix in prefixes:
        if prefix in text:
            match = re.search(r'(\d+)', text)
            if match:
                return int(match.group(1))
    return 0


async def main():
    parser = argparse.ArgumentParser(description='Crawl4AI Reddit Scraper')
    parser.add_argument('--subreddit', type=str, default='predictionmarkets',
                        help='Subreddit to scrape (default: predictionmarkets)')
    parser.add_argument('--search', type=str, help='Search query within subreddit')
    parser.add_argument('--limit', type=int, default=10, help='Max posts to return')

    args = parser.parse_args()

    result = await scrape_subreddit(args.subreddit, args.search, args.limit)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())