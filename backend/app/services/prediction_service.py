import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    ImpressionPrediction,
    PostAnalytics,
    Post,
    PostStatus,
    PostFormat,
)
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


class PredictionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.ai_service = AIService()

    def predict_impressions(
        self, content: str, post_format: str = "tweet"
    ) -> Dict[str, Any]:
        """Predict impressions for content using past analytics + AI."""
        # Gather past 30 days analytics for context
        past_metrics = self._get_recent_metrics(days=30)

        system_prompt = (
            "You are a social media analytics AI. "
            "Based on the provided historical performance data and the new post content, "
            "predict the expected impressions, likes, and retweets. "
            "Return ONLY valid JSON with keys: "
            "'predicted_impressions', 'predicted_likes', 'predicted_retweets', "
            "'confidence_score' (0.0-1.0), 'factors' (dict of contributing factors), "
            "'suggestions' (list of improvement suggestions)."
        )

        user_prompt = (
            f"Post format: {post_format}\n"
            f"Post content:\n{content[:2000]}\n\n"
            f"Historical performance (last 30 days):\n"
            f"- Average impressions: {past_metrics.get('avg_impressions', 0):.0f}\n"
            f"- Average likes: {past_metrics.get('avg_likes', 0):.0f}\n"
            f"- Average retweets: {past_metrics.get('avg_retweets', 0):.0f}\n"
            f"- Total posts: {past_metrics.get('total_posts', 0)}\n"
            f"- Best performing impressions: {past_metrics.get('max_impressions', 0)}\n\n"
            "Predict the performance and provide improvement suggestions."
        )

        try:
            message = self.ai_service.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1024,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            response_text = message.content[0].text.strip()
            result = json.loads(response_text)

            prediction = {
                "predicted_impressions": int(
                    result.get("predicted_impressions", past_metrics.get("avg_impressions", 1000))
                ),
                "predicted_likes": int(result.get("predicted_likes", 0)),
                "predicted_retweets": int(result.get("predicted_retweets", 0)),
                "confidence_score": float(
                    min(max(result.get("confidence_score", 0.5), 0.0), 1.0)
                ),
                "factors": result.get("factors", {}),
                "suggestions": result.get("suggestions", []),
            }

            # Record prediction
            self._record_prediction(content, post_format, prediction)

            return prediction
        except (json.JSONDecodeError, KeyError):
            logger.error("Failed to parse prediction response")
            fallback = {
                "predicted_impressions": int(past_metrics.get("avg_impressions", 1000)),
                "predicted_likes": int(past_metrics.get("avg_likes", 10)),
                "predicted_retweets": int(past_metrics.get("avg_retweets", 2)),
                "confidence_score": 0.3,
                "factors": {"note": "Fallback prediction based on historical average"},
                "suggestions": ["Could not generate AI prediction, using historical average."],
            }
            return fallback

    def _get_recent_metrics(self, days: int = 30) -> Dict[str, Any]:
        cutoff = datetime.utcnow() - timedelta(days=days)
        results = (
            self.db.query(
                func.count(PostAnalytics.id).label("total"),
                func.avg(PostAnalytics.impressions).label("avg_imp"),
                func.avg(PostAnalytics.likes).label("avg_likes"),
                func.avg(PostAnalytics.retweets).label("avg_rt"),
                func.max(PostAnalytics.impressions).label("max_imp"),
            )
            .filter(PostAnalytics.collected_at >= cutoff)
            .first()
        )
        return {
            "total_posts": results.total or 0,
            "avg_impressions": float(results.avg_imp or 0),
            "avg_likes": float(results.avg_likes or 0),
            "avg_retweets": float(results.avg_rt or 0),
            "max_impressions": results.max_imp or 0,
        }

    def _record_prediction(
        self, content: str, post_format: str, prediction: Dict[str, Any]
    ) -> ImpressionPrediction:
        record = ImpressionPrediction(
            content_preview=content[:500],
            post_format=PostFormat(post_format),
            predicted_impressions=prediction["predicted_impressions"],
            predicted_likes=prediction["predicted_likes"],
            predicted_retweets=prediction["predicted_retweets"],
            confidence_score=prediction["confidence_score"],
            factors=prediction.get("factors", {}),
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def update_actual(self, post_id: int, actual_impressions: int) -> None:
        """Update prediction records with actual impression data."""
        predictions = (
            self.db.query(ImpressionPrediction)
            .filter(ImpressionPrediction.post_id == post_id)
            .all()
        )
        for pred in predictions:
            pred.actual_impressions = actual_impressions
        self.db.commit()
