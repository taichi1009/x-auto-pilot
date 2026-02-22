import logging
from typing import Optional, Dict, Any, List

import tweepy
from fastapi import HTTPException
from sqlalchemy.orm import Session

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
    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        access_token: Optional[str] = None,
        access_token_secret: Optional[str] = None,
        bearer_token: Optional[str] = None,
        api_tier: Optional[str] = None,
    ) -> None:
        self._api_key = api_key or settings.X_API_KEY
        self._api_secret = api_secret or settings.X_API_SECRET
        self._access_token = access_token or settings.X_ACCESS_TOKEN
        self._access_token_secret = access_token_secret or settings.X_ACCESS_TOKEN_SECRET
        self._bearer_token = bearer_token or settings.X_BEARER_TOKEN
        self.current_tier = (api_tier or settings.X_API_TIER).lower()
        self._client: Optional[tweepy.Client] = None
        self._api_v1: Optional[tweepy.API] = None

    @property
    def client(self) -> tweepy.Client:
        if self._client is None:
            self._client = tweepy.Client(
                bearer_token=self._bearer_token or None,
                consumer_key=self._api_key or None,
                consumer_secret=self._api_secret or None,
                access_token=self._access_token or None,
                access_token_secret=self._access_token_secret or None,
                wait_on_rate_limit=True,
            )
        return self._client

    @property
    def api_v1(self) -> tweepy.API:
        """Tweepy v1.1 API for media upload."""
        if self._api_v1 is None:
            auth = tweepy.OAuth1UserHandler(
                consumer_key=self._api_key or "",
                consumer_secret=self._api_secret or "",
                access_token=self._access_token or "",
                access_token_secret=self._access_token_secret or "",
            )
            self._api_v1 = tweepy.API(auth, wait_on_rate_limit=True)
        return self._api_v1

    def upload_media(self, filepath: str) -> Optional[str]:
        """Upload media via v1.1 API and return the media_id string."""
        try:
            media = self.api_v1.media_upload(filename=filepath)
            media_id = str(media.media_id)
            logger.info("Media uploaded: media_id=%s", media_id)
            return media_id
        except tweepy.TweepyException as exc:
            logger.error("Failed to upload media: %s", exc)
            return None

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
        self, content: str, reply_to: Optional[str] = None,
        media_ids: Optional[List[str]] = None,
    ) -> str:
        # Long-form posts (X Premium) allow up to 25,000 chars
        # Regular tweets max 280
        if not reply_to and len(content) > 25000:
            raise HTTPException(
                status_code=400,
                detail="Post content exceeds 25,000 characters.",
            )
        try:
            kwargs: Dict[str, Any] = {"text": content}
            if reply_to:
                kwargs["in_reply_to_tweet_id"] = reply_to
            if media_ids:
                kwargs["media_ids"] = media_ids
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


def create_x_api_service(db: Session, user_id: int) -> XApiService:
    """Factory: build an XApiService using per-user settings from the DB."""
    from app.services.user_settings import get_x_api_settings

    cfg = get_x_api_settings(db, user_id)
    return XApiService(
        api_key=cfg["api_key"] or None,
        api_secret=cfg["api_secret"] or None,
        access_token=cfg["access_token"] or None,
        access_token_secret=cfg["access_token_secret"] or None,
        bearer_token=cfg["bearer_token"] or None,
        api_tier=cfg["api_tier"] or None,
    )
