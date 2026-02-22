import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.models import Post, PostAnalytics, PostStatus
from app.services.x_api import XApiService

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.x_api = XApiService()

    def get_overview(self, days: int = 30) -> Dict[str, Any]:
        cutoff = datetime.utcnow() - timedelta(days=days)

        total_posts = (
            self.db.query(Post)
            .filter(Post.status == PostStatus.posted)
            .count()
        )

        recent_posts = (
            self.db.query(Post)
            .filter(
                Post.status == PostStatus.posted,
                Post.posted_at >= cutoff,
            )
            .count()
        )

        # Aggregate analytics for the period
        analytics = (
            self.db.query(
                func.sum(PostAnalytics.impressions).label("total_impressions"),
                func.sum(PostAnalytics.likes).label("total_likes"),
                func.sum(PostAnalytics.retweets).label("total_retweets"),
                func.sum(PostAnalytics.replies).label("total_replies"),
                func.sum(PostAnalytics.quotes).label("total_quotes"),
                func.sum(PostAnalytics.bookmarks).label("total_bookmarks"),
                func.avg(PostAnalytics.impressions).label("avg_impressions"),
                func.avg(PostAnalytics.likes).label("avg_likes"),
            )
            .filter(PostAnalytics.collected_at >= cutoff)
            .first()
        )

        return {
            "period_days": days,
            "total_posts": total_posts,
            "recent_posts": recent_posts,
            "total_impressions": analytics.total_impressions or 0,
            "total_likes": analytics.total_likes or 0,
            "total_retweets": analytics.total_retweets or 0,
            "total_replies": analytics.total_replies or 0,
            "total_quotes": analytics.total_quotes or 0,
            "total_bookmarks": analytics.total_bookmarks or 0,
            "avg_impressions": round(float(analytics.avg_impressions or 0), 1),
            "avg_likes": round(float(analytics.avg_likes or 0), 1),
        }

    def get_post_analytics(self, post_id: int) -> List[PostAnalytics]:
        post = self.db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail=f"Post {post_id} not found.")

        analytics = (
            self.db.query(PostAnalytics)
            .filter(PostAnalytics.post_id == post_id)
            .order_by(desc(PostAnalytics.collected_at))
            .all()
        )
        return analytics

    def get_trends(self, days: int = 30) -> List[Dict[str, Any]]:
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Get daily aggregated metrics
        daily_metrics = (
            self.db.query(
                func.date(PostAnalytics.collected_at).label("date"),
                func.sum(PostAnalytics.impressions).label("impressions"),
                func.sum(PostAnalytics.likes).label("likes"),
                func.sum(PostAnalytics.retweets).label("retweets"),
                func.sum(PostAnalytics.replies).label("replies"),
                func.count(PostAnalytics.id).label("posts_tracked"),
            )
            .filter(PostAnalytics.collected_at >= cutoff)
            .group_by(func.date(PostAnalytics.collected_at))
            .order_by(func.date(PostAnalytics.collected_at))
            .all()
        )

        trends = []
        for row in daily_metrics:
            trends.append(
                {
                    "date": str(row.date),
                    "impressions": row.impressions or 0,
                    "likes": row.likes or 0,
                    "retweets": row.retweets or 0,
                    "replies": row.replies or 0,
                    "posts_tracked": row.posts_tracked or 0,
                }
            )
        return trends

    def collect_analytics(self) -> Dict[str, Any]:
        # Collect analytics for all posted tweets
        posted_posts = (
            self.db.query(Post)
            .filter(
                Post.status == PostStatus.posted,
                Post.x_tweet_id.isnot(None),
            )
            .all()
        )

        collected = 0
        errors = 0
        for post in posted_posts:
            try:
                metrics = self.x_api.get_tweet_metrics(post.x_tweet_id)
                analytics = PostAnalytics(
                    post_id=post.id,
                    impressions=metrics.get("impressions", 0),
                    likes=metrics.get("likes", 0),
                    retweets=metrics.get("retweets", 0),
                    replies=metrics.get("replies", 0),
                    quotes=metrics.get("quotes", 0),
                    bookmarks=metrics.get("bookmarks", 0),
                    profile_visits=metrics.get("profile_visits", 0),
                    collected_at=datetime.utcnow(),
                )
                self.db.add(analytics)
                collected += 1
            except HTTPException as exc:
                logger.warning(
                    "Failed to collect analytics for post %d: %s",
                    post.id,
                    exc.detail,
                )
                errors += 1

        self.db.commit()
        logger.info("Collected analytics: %d succeeded, %d failed", collected, errors)
        return {
            "collected": collected,
            "errors": errors,
            "total_posts": len(posted_posts),
        }
