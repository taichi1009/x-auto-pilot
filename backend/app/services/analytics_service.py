import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.models import Post, PostAnalytics, PostStatus
from app.services.x_api import XApiService, create_x_api_service

logger = logging.getLogger(__name__)


class AnalyticsService:
    def __init__(self, db: Session, user_id: Optional[int] = None) -> None:
        self.db = db
        if user_id is not None:
            self.x_api = create_x_api_service(db, user_id)
        else:
            self.x_api = XApiService()

    def get_overview(self, days: int = 30, user_id: Optional[int] = None) -> Dict[str, Any]:
        cutoff = datetime.utcnow() - timedelta(days=days)

        total_posts_query = (
            self.db.query(Post)
            .filter(Post.status == PostStatus.posted)
        )
        if user_id is not None:
            total_posts_query = total_posts_query.filter(Post.user_id == user_id)
        total_posts = total_posts_query.count()

        recent_posts_query = (
            self.db.query(Post)
            .filter(
                Post.status == PostStatus.posted,
                Post.posted_at >= cutoff,
            )
        )
        if user_id is not None:
            recent_posts_query = recent_posts_query.filter(Post.user_id == user_id)
        recent_posts = recent_posts_query.count()

        # Aggregate analytics for the period
        analytics_query = (
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
        )
        if user_id is not None:
            analytics_query = analytics_query.join(Post, PostAnalytics.post_id == Post.id).filter(Post.user_id == user_id)
        analytics = analytics_query.first()

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

    def get_post_analytics(self, post_id: int, user_id: Optional[int] = None) -> List[PostAnalytics]:
        post_query = self.db.query(Post).filter(Post.id == post_id)
        if user_id is not None:
            post_query = post_query.filter(Post.user_id == user_id)
        post = post_query.first()
        if not post:
            raise HTTPException(status_code=404, detail=f"Post {post_id} not found.")

        analytics = (
            self.db.query(PostAnalytics)
            .filter(PostAnalytics.post_id == post_id)
            .order_by(desc(PostAnalytics.collected_at))
            .all()
        )
        return analytics

    def get_trends(self, days: int = 30, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        cutoff = datetime.utcnow() - timedelta(days=days)

        # Get daily aggregated metrics
        daily_metrics_query = (
            self.db.query(
                func.date(PostAnalytics.collected_at).label("date"),
                func.sum(PostAnalytics.impressions).label("impressions"),
                func.sum(PostAnalytics.likes).label("likes"),
                func.sum(PostAnalytics.retweets).label("retweets"),
                func.sum(PostAnalytics.replies).label("replies"),
                func.count(PostAnalytics.id).label("posts_tracked"),
            )
            .filter(PostAnalytics.collected_at >= cutoff)
        )
        if user_id is not None:
            daily_metrics_query = daily_metrics_query.join(Post, PostAnalytics.post_id == Post.id).filter(Post.user_id == user_id)
        daily_metrics = (
            daily_metrics_query
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

    def collect_analytics(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        # Collect analytics for all posted tweets
        posted_posts_query = (
            self.db.query(Post)
            .filter(
                Post.status == PostStatus.posted,
                Post.x_tweet_id.isnot(None),
            )
        )
        if user_id is not None:
            posted_posts_query = posted_posts_query.filter(Post.user_id == user_id)
        posted_posts = posted_posts_query.all()

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
