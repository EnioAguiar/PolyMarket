#!/usr/bin/env python3
"""
Twitter scraper using Tweepy.
Outputs JSON to stdout for consumption by TypeScript subprocess.
"""

import json
import os
import sys
from typing import Any

import tweepy


def search_tweets(query: str, max_results: int = 10) -> dict[str, Any]:
    """Search recent tweets using Twitter API v2."""
    bearer_token = os.environ.get('TWITTER_BEARER_TOKEN')
    if not bearer_token:
        return {"error": "TWITTER_BEARER_TOKEN not set", "posts": []}

    try:
        client = tweepy.Client(bearer_token=bearer_token)
        tweets = client.search_recent_tweets(query=query, max_results=max_results)

        posts = []
        if tweets.data:
            for tweet in tweets.data:
                posts.append({
                    "id": str(tweet.id),
                    "text": tweet.text,
                    "created_at": str(tweet.created_at) if hasattr(tweet, 'created_at') else None,
                    "public_metrics": tweet.public_metrics if hasattr(tweet, 'public_metrics') else {},
                })

        return {
            "source": "twitter",
            "query": query,
            "posts": posts,
            "count": len(posts),
            "timestamp": __import__('datetime').datetime.utcnow().isoformat() + "Z",
        }
    except tweepy.TooManyRequests:
        return {"error": "rate_limit_exceeded", "posts": []}
    except Exception as e:
        return {"error": str(e), "posts": []}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python twitter_scraper.py <query>"}))
        sys.exit(1)

    query = sys.argv[1]
    max_results = int(sys.argv[2]) if len(sys.argv) > 2 else 10

    result = search_tweets(query, max_results)
    print(json.dumps(result, indent=2))