#!/usr/bin/env python3
"""
Crawl4AI-based Twitter scraper for Polymarket Bot.
Scrapes Twitter/X without requiring expensive API access.

Usage:
    python scripts/crawl4ai_twitter.py --username elonmusk --limit 10
    python scripts/crawl4ai_twitter.py --search "Bitcoin" --limit 10

Output: JSON to stdout
"""

import asyncio
import argparse
import json
import sys
import re
from datetime import datetime

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


async def scrape_user_tweets(username: str, limit: int) -> dict:
    """Scrape tweets from a user's profile page."""
    url = f"https://x.com/{username}"
    meta = {"type": "user", "username": username}
    return await scrape_url(url, limit, meta)


async def scrape_search(query: str, limit: int) -> dict:
    """Scrape tweets matching a search query."""
    url = f"https://x.com/search?q={query}&src=typed_query&f=top"
    meta = {"type": "search", "query": query}
    return await scrape_url(url, limit, meta)


async def scrape_url(url: str, limit: int, meta: dict) -> dict:
    """Scrape tweets from a URL using Crawl4AI."""
    browser_config = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=720,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    # Try multiple CSS selectors for tweets
    crawler_config = CrawlerRunConfig(
        page_timeout=60000,
        remove_overlay_elements=True,
        wait_for="css:article[data-testid='tweet']",
        css_selector="article[data-testid='tweet'], div[data-testid='tweetDetail']",
        js_code="""
        // Scroll to load more tweets
        async () => {
            for (let i = 0; i < 3; i++) {
                window.scrollBy(0, 500);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        """
    )

    result = {
        "source": "crawl4ai_twitter",
        "meta": meta,
        "url": url,
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

            # Parse tweets from markdown
            posts = parse_tweets_from_markdown(crawl_result.markdown, limit)
            result["posts"] = posts
            result["count"] = len(posts)

            # Also store raw markdown length for debugging
            result["debug"] = {
                "markdown_length": len(crawl_result.markdown),
                "success": crawl_result.success
            }

    except Exception as e:
        result["error"] = str(e)

    return result


def parse_tweets_from_markdown(markdown: str, limit: int) -> list:
    """Extract tweet data from Crawl4AI markdown output."""
    posts = []
    lines = markdown.split('\n')

    current_tweet = None

    for line in lines:
        line = line.strip()

        # Skip empty lines, headers, and links
        if not line or line.startswith('#') or line.startswith('http'):
            continue

        # Tweet content patterns - look for substantive text
        # Twitter tweets typically have these characteristics
        if len(line) > 10 and not line.startswith('[') and not line.startswith('@'):
            # Check if this looks like a tweet (not a UI element)
            if any(c.isalnum() for c in line) and not any(ui in line.lower() for ui in ['sign up', 'log in', 'follow', 'share', 'copy link']):
                # Start a new potential tweet
                if current_tweet is None or len(current_tweet.get('text', '')) > 50:
                    if current_tweet and current_tweet.get('text'):
                        posts.append(current_tweet)
                    current_tweet = {
                        "text": line[:500],
                        "created_at": None,
                        "like_count": 0,
                        "retweet_count": 0,
                        "reply_count": 0
                    }
                else:
                    # Append to existing tweet if it's a continuation
                    current_tweet['text'] += ' ' + line[:200]

        # Look for engagement metrics in the line
        if current_tweet:
            # Like patterns
            like_match = re.search(r'(\d+[\d,]*)\s*(?:likes?|♥|❤️|💙)', line, re.IGNORECASE)
            if like_match:
                current_tweet['like_count'] = int(like_match.group(1).replace(',', ''))

            # Retweet patterns
            rt_match = re.search(r'(\d+[\d,]*)\s*(?:retweets?|🔁|RT)', line, re.IGNORECASE)
            if rt_match:
                current_tweet['retweet_count'] = int(rt_match.group(1).replace(',', ''))

            # Reply patterns
            reply_match = re.search(r'(\d+[\d,]*)\s*(?:replies?|💬)', line, re.IGNORECASE)
            if reply_match:
                current_tweet['reply_count'] = int(reply_match.group(1).replace(',', ''))

        # Stop if we have enough posts
        if len(posts) >= limit:
            break

    # Don't forget the last post
    if current_tweet and current_tweet.get('text') and len(posts) < limit:
        posts.append(current_tweet)

    return posts


async def main():
    parser = argparse.ArgumentParser(description='Crawl4AI Twitter Scraper')
    parser.add_argument('--username', type=str, help='Twitter username to scrape')
    parser.add_argument('--search', type=str, help='Search query')
    parser.add_argument('--limit', type=int, default=10, help='Max tweets to return')

    args = parser.parse_args()

    if not args.username and not args.search:
        print(json.dumps({"error": "Must specify --username or --search"}))
        sys.exit(1)

    if args.username:
        result = await scrape_user_tweets(args.username, args.limit)
    else:
        result = await scrape_search(args.search, args.limit)

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())