#!/usr/bin/env python3
"""
Crawl4AI web scraper with search integration.
First searches DuckDuckGo for relevant URLs, then scrapes them.

Usage:
    python scripts/crawl4ai_search.py --query "Bitcoin news" --max-results 5
"""

import asyncio
import argparse
import json
import sys
import re
from datetime import datetime
from typing import List, Set

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig


async def search_duckduckgo(query: str, max_results: int = 5) -> List[dict]:
    """Search DuckDuckGo for relevant URLs."""
    browser_config = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=720,
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

    run_config = CrawlerRunConfig(
        page_timeout=30000,
        remove_overlay_elements=True,
        css_selector="body",
    )

    search_results = []
    search_url = f"https://duckduckgo.com/?q={query.replace(' ', '+')}&ia=web"

    seen_domains: Set[str] = set()

    try:
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=search_url, config=run_config)

            if result.success:
                content = str(result.markdown)

                # Extract URLs from markdown
                url_pattern = r'\[([^\]]+)\]\((https?://[^\)]+)\)'
                matches = re.findall(url_pattern, content)

                for title, url in matches:
                    # Skip if same domain already seen
                    domain = re.search(r'https?://([^/]+)', url)
                    if not domain:
                        continue
                    domain_name = domain.group(1).replace('www.', '')

                    if domain_name in seen_domains:
                        continue

                    # Skip non-article domains
                    skip_domains = ['duckduckgo', 'lite.duckduckgo', 'addons.mozilla', 'chrome.google', 'twitter.com', 'x.com', 'github.com', 'youtube.com']
                    if any(d in domain_name for d in skip_domains):
                        continue

                    seen_domains.add(domain_name)
                    clean_title = title.strip()

                    search_results.append({
                        'title': clean_title if clean_title else domain_name,
                        'url': url
                    })

                    if len(search_results) >= max_results:
                        break

    except Exception as e:
        print(f"Search error: {e}", file=sys.stderr)

    return search_results


async def scrape_url(url: str, crawler) -> dict:
    """Scrape a single URL with Crawl4AI."""
    run_config = CrawlerRunConfig(
        page_timeout=45000,
        remove_overlay_elements=True,
        word_count_threshold=10,
        css_selector="article, main, .content, .post, .article, .entry, .story, .news, .blog",
        cache_mode="bypass",
        delay_before_return_html=1.0,
        excluded_tags=["script", "style", "nav", "header", "footer", "aside", "form"],
        js_code="""
        async () => {
            // Quick scroll to trigger lazy load
            window.scrollBy(0, 300);
            await new Promise(r => setTimeout(r, 300));
            window.scrollTo(0, 0);
        }
        """
    )

    result = {
        "url": url,
        "title": "",
        "posts": [],
        "count": 0,
        "markdown_length": 0,
        "error": None
    }

    try:
        crawl_result = await crawler.arun(url=url, config=run_config)

        if crawl_result.success:
            content = str(crawl_result.markdown)
            result["markdown_length"] = len(content)

            # Get title
            title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
            if not title_match:
                title_match = re.search(r'<title>([^<]+)</title>', content)
            if title_match:
                result["title"] = title_match.group(1).strip()[:100]

            # Parse content
            posts = parse_content(content, 15)
            result["posts"] = posts
            result["count"] = len(posts)

        else:
            result["error"] = crawl_result.error_message

    except Exception as e:
        result["error"] = str(e)

    return result


def parse_content(markdown: str, limit: int) -> list:
    """Parse markdown into clean content chunks, filtering ads and UI elements."""
    if not markdown or len(markdown) < 100:
        return []

    posts = []
    lines = markdown.split('\n')

    # Skip patterns for ads, UI, navigation
    skip_patterns = [
        r'^!\[\]',  # Images
        r'^\s*\|',  # Tables
        r'^\s*\[submit\]', r'^\s*\[login\]', r'^\s*\[ask\]',
        r'^\s*\[show\]', r'^\s*\[jobs\]', r'^\s*\[comment',
        r'^\s*Hacker\s+News', r'^\s*#+\s*$',  # HN branding
        r'^\s*\d+\s+(points?|hours?|days?|minutes?)\s+by',  # HN metadata
        r'^\s*(subscribe|newsletter|sign\s*up)',  # Newsletter prompts
        r'^\s*(advertisement|ad\s*by| Sponsored)',  # Ads
        r'^\s*Cookie',  # Cookie notices
        r'^\s*GDPR',  # GDPR banners
    ]

    # Content indicators (keep these lines)
    content_indicators = [
        r'\.$',  # Ends with period (sentence)
        r'^\d+',  # Starts with number (list item, stat)
        r'[A-Z][a-z]+',  # Has proper case (real text)
    ]

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Skip empty, short, or all-special lines
        if len(line) < 40:
            continue

        # Skip UI/ads patterns
        if any(re.search(p, line, re.IGNORECASE) for p in skip_patterns):
            continue

        # Skip lines that are mostly special characters
        special_ratio = sum(1 for c in line if c in '|[]{}()_*#^~`>/<\\') / max(len(line), 1)
        if special_ratio > 0.2:
            continue

        # Skip lines that look like navigation/menu
        if re.match(r'^(home|about|contact|menu|search|login|sign\s*up|register)', line, re.IGNORECASE):
            continue

        # Clean markdown
        clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', line)  # Links to text
        clean = re.sub(r'[#*_`~^>\-\+]+', '', clean)  # Remove markdown
        clean = re.sub(r'\s+', ' ', clean)  # Collapse whitespace
        clean = clean.strip()

        # Final checks
        if len(clean) < 30 or len(clean) > 1000:
            continue

        # Must have some alphabetic characters
        if not re.search(r'[a-zA-Z]{5,}', clean):
            continue

        posts.append({
            "text": clean,
            "type": "content"
        })

        if len(posts) >= limit:
            break

    return posts


async def main():
    parser = argparse.ArgumentParser(description='Crawl4AI Web Search & Scrape')
    parser.add_argument('--query', type=str, required=True, help='Search query')
    parser.add_argument('--max-results', type=int, default=5, help='Max URLs to scrape')

    args = parser.parse_args()

    print(f"Searching for: {args.query}", file=sys.stderr)

    # Step 1: Search for URLs
    urls = await search_duckduckgo(args.query, args.max_results)

    if not urls:
        print(json.dumps({
            "source": "crawl4ai_search",
            "query": args.query,
            "error": "No search results found",
            "results": []
        }))
        sys.exit(0)

    print(f"Found {len(urls)} URLs: {[u['url'][:40] for u in urls]}", file=sys.stderr)

    # Step 2: Scrape each URL
    browser_config = BrowserConfig(
        headless=True,
        viewport_width=1280,
        viewport_height=720,
    )

    all_results = {
        "source": "crawl4ai_search",
        "query": args.query,
        "results": [],
        "total_posts": 0,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }

    async with AsyncWebCrawler(config=browser_config) as crawler:
        for i, item in enumerate(urls):
            print(f"  Scraping ({i+1}/{len(urls)}): {item['url'][:50]}...", file=sys.stderr)
            scrape_result = await scrape_url(item['url'], crawler)
            scrape_result['search_title'] = item['title']
            all_results['results'].append(scrape_result)
            all_results['total_posts'] += scrape_result['count']

    print(json.dumps(all_results, indent=2))


if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())