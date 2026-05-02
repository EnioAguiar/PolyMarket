#!/usr/bin/env python3
"""
Reddit scraper using PRAW (Python Reddit API Wrapper).
Outputs JSON to stdout for consumption by TypeScript subprocess.
"""

import json
import os
import sys
from typing import Any

import praw


def get_subreddit_posts(subreddit: str, limit: int = 10, sort: str = "hot") -> dict[str, Any]:
    """Fetch posts from a subreddit using PRAW."""
    client_id = os.environ.get('REDDIT_CLIENT_ID')
    client_secret = os.environ.get('REDDIT_CLIENT_SECRET')
    user_agent = os.environ.get('REDDIT_USER_AGENT', 'polymarket-bot/1.0')

    if not client_id or not client_secret:
        return {"error": "REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not set", "posts": []}

    try:
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent,
        )

        sub = reddit.subreddit(subreddit)
        if sort == "hot":
            posts_iter = sub.hot(limit=limit)
        elif sort == "rising":
            posts_iter = sub.rising(limit=limit)
        elif sort == "new":
            posts_iter = sub.new(limit=limit)
        elif sort == "controversial":
            posts_iter = sub.controversial(limit=limit)
        else:
            posts_iter = sub.hot(limit=limit)

        posts = []
        for post in posts_iter:
            posts.append({
                "id": post.id,
                "title": post.title,
                "score": post.score,
                "url": post.url,
                "num_comments": post.num_comments,
                "subreddit": post.subreddit.display_name,
                "created_utc": post.created_utc,
                "selftext": post.selftext[:500] if post.selftext else "",
            })

        return {
            "source": "reddit",
            "subreddit": subreddit,
            "posts": posts,
            "count": len(posts),
            "sort": sort,
            "timestamp": __import__('datetime').datetime.utcnow().isoformat() + "Z",
        }
    except Exception as e:
        return {"error": str(e), "posts": []}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python reddit_scraper.py <subreddit> [limit] [sort]"}))
        sys.exit(1)

    subreddit = sys.argv[1]
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    sort = sys.argv[3] if len(sys.argv) > 3 else "hot"

    result = get_subreddit_posts(subreddit, limit, sort)
    print(json.dumps(result, indent=2))