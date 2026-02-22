import logging
from typing import Optional, Dict, Any, List

import tweepy
from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger(__name__)

TIER_ORDER = {"free": 0, "basic": 1, "pro": 2}

TIER_LIMITS: Dict[str, Dict[str, int]] = {
    "free": {
        "posts_per_month": 1500,
        "reads_per_month": 0,
        "follows_per_day": 0,
    },
    "basic": {
        "posts_per_month": 50000,
        "reads_per_month": 10000,
        "follows_per_day": 400,
    },
    "pro": {
        "posts_per_month": 300000,
        "reads_per_month": 1000000,
        "follows_per_day": 1000,
    },
}


class XApiService:
    def __init__(self) -> None:
        self.current_tier = settings.X_API_TIER.lower()
        self._client: Optional[tweepy.Client] = None

    @property
    def client(self) -> tweepy.Client:
        if self._client is None:
            self._client = tweepy.Client(
                bearer_token=settings.X_BEARER_TOKEN or None,
                consumer_key=settings.X_API_KEY or None,
                consumer_secret=settings.X_API_SECRET or None,
                access_token=settings.X_ACCESS_TOKEN or None,
                access_token_secret=settings.X_ACCESS_TOKEN_SECRET or None,
                wait_on_rate_limit=True,
            )
        return self._client

    def require_tier(self, min_tier: str) -> None:
        current_level = TIER_ORDER.get(self.current_tier, 0)
        required_level = TIER_ORDER.get(min_tier, 0)
        if current_level < required_level:
            raise HTTPException(
                status_code=403,
                detail=(
                    f"This feature requires '{min_tier}' tier or above. "
                    f"Current tier: '{self.current_tier}'."
                ),
            )

    def get_tier_limits(self) -> Dict[str, int]:
        return TIER_LIMITS.get(self.current_tier, TIER_LIMITS["free"])

    def post_tweet(
        self, content: str, reply_to: Optional[str] = None
    ) -> str:
        # Long-form posts (X Premium) allow up to 25,000 chars
        # Regular tweets max 280
        if not reply_to and len(content) > 25000:
            raise HTTPException(
                status_code=400,
                detail="Post content exceeds 25,000 characters.",
            )
        try:
            kwargs = {"text": content}
            if reply_to:
                kwargs["in_reply_to_tweet_id"] = reply_to
            response = self.client.create_tweet(**kwargs)
            tweet_id = str(response.data["id"])
            logger.info("Tweet posted successfully: %s", tweet_id)
            return tweet_id
        except tweepy.TweepyException as exc:
            logger.error("Failed to post tweet: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"Failed to post tweet: {exc}"
            ) from exc

    def get_tweet_metrics(self, tweet_id: str) -> Dict[str, Any]:
        self.require_tier("basic")
        try:
            response = self.client.get_tweet(
                tweet_id,
                tweet_fields=[
                    "public_metrics",
                    "non_public_metrics",
                    "organic_metrics",
                ],
            )
            if response.data is None:
                raise HTTPException(
                    status_code=404, detail=f"Tweet {tweet_id} not found."
                )
            metrics = response.data.get("public_metrics", {})
            return {
                "impressions": metrics.get("impression_count", 0),
                "likes": metrics.get("like_count", 0),
                "retweets": metrics.get("retweet_count", 0),
                "replies": metrics.get("reply_count", 0),
                "quotes": metrics.get("quote_count", 0),
                "bookmarks": metrics.get("bookmark_count", 0),
            }
        except tweepy.TweepyException as exc:
            logger.error("Failed to get tweet metrics: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"Failed to get metrics: {exc}"
            ) from exc

    def search_users(self, query: str, max_results: int = 20) -> List[Dict[str, Any]]:
        self.require_tier("basic")
        try:
            response = self.client.search_recent_tweets(
                query=f"from:{query}",
                max_results=min(max_results, 100),
                user_fields=["id", "username", "name", "public_metrics"],
            )
            users = []
            if response.includes and "users" in response.includes:
                for user in response.includes["users"]:
                    users.append(
                        {
                            "id": str(user.id),
                            "username": user.username,
                            "name": user.name,
                            "followers_count": user.public_metrics.get(
                                "followers_count", 0
                            )
                            if user.public_metrics
                            else 0,
                        }
                    )
            return users
        except tweepy.TweepyException as exc:
            logger.error("Failed to search users: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"Failed to search users: {exc}"
            ) from exc

    def follow_user(self, user_id: str) -> bool:
        self.require_tier("basic")
        try:
            self.client.follow_user(target_user_id=user_id)
            logger.info("Followed user: %s", user_id)
            return True
        except tweepy.TweepyException as exc:
            logger.error("Failed to follow user %s: %s", user_id, exc)
            raise HTTPException(
                status_code=502, detail=f"Failed to follow user: {exc}"
            ) from exc

    def unfollow_user(self, user_id: str) -> bool:
        self.require_tier("basic")
        try:
            self.client.unfollow_user(target_user_id=user_id)
            logger.info("Unfollowed user: %s", user_id)
            return True
        except tweepy.TweepyException as exc:
            logger.error("Failed to unfollow user %s: %s", user_id, exc)
            raise HTTPException(
                status_code=502, detail=f"Failed to unfollow user: {exc}"
            ) from exc

    def get_followers(self, user_id: str, max_results: int = 100) -> List[Dict[str, Any]]:
        self.require_tier("basic")
        try:
            response = self.client.get_users_followers(
                user_id,
                max_results=min(max_results, 1000),
                user_fields=["id", "username", "name", "public_metrics"],
            )
            followers = []
            if response.data:
                for user in response.data:
                    followers.append(
                        {
                            "id": str(user.id),
                            "username": user.username,
                            "name": user.name,
                            "followers_count": user.public_metrics.get(
                                "followers_count", 0
                            )
                            if user.public_metrics
                            else 0,
                        }
                    )
            return followers
        except tweepy.TweepyException as exc:
            logger.error("Failed to get followers: %s", exc)
            raise HTTPException(
                status_code=502, detail=f"Failed to get followers: {exc}"
            ) from exc

    def test_connection(self) -> Dict[str, Any]:
        try:
            response = self.client.get_me(user_fields=["id", "username", "name"])
            if response.data is None:
                return {"connected": False, "error": "Could not retrieve user info."}
            return {
                "connected": True,
                "user_id": str(response.data.id),
                "username": response.data.username,
                "name": response.data.name,
                "tier": self.current_tier,
            }
        except tweepy.TweepyException as exc:
            return {"connected": False, "error": str(exc)}
