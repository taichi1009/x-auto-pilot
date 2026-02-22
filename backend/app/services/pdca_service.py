import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.models.models import (
    PdcaLog,
    PostAnalytics,
    Post,
    PostStatus,
    AnalysisType,
)
from app.services.ai_service import AIService, create_ai_service

logger = logging.getLogger(__name__)


class PdcaService:
    def __init__(self, db: Session, user_id: Optional[int] = None) -> None:
        self.db = db
        if user_id is not None:
            self.ai_service = create_ai_service(db, user_id)
        else:
            self.ai_service = AIService()

    def run_weekly_analysis(self) -> PdcaLog:
        now = datetime.utcnow()
        period_start = now - timedelta(days=7)
        return self._run_analysis(AnalysisType.weekly, period_start, now)

    def run_monthly_analysis(self) -> PdcaLog:
        now = datetime.utcnow()
        period_start = now - timedelta(days=30)
        return self._run_analysis(AnalysisType.monthly, period_start, now)

    def _run_analysis(
        self,
        analysis_type: AnalysisType,
        period_start: datetime,
        period_end: datetime,
    ) -> PdcaLog:
        # Gather metrics data for the period
        metrics_data = self._gather_metrics(period_start, period_end)

        # Use AI to analyze performance
        if metrics_data:
            analysis_result = self.ai_service.analyze_performance(metrics_data)
        else:
            analysis_result = {
                "analysis": "No data available for this period.",
                "top_performing": [],
                "improvement_areas": [],
                "recommendations": ["Start posting to gather performance data."],
            }

        recommendations = analysis_result.get("recommendations", [])

        pdca_log = PdcaLog(
            analysis_type=analysis_type,
            period_start=period_start,
            period_end=period_end,
            analysis_result=analysis_result,
            recommendations=recommendations,
            applied_changes=None,
        )
        self.db.add(pdca_log)
        self.db.commit()
        self.db.refresh(pdca_log)
        logger.info(
            "PDCA %s analysis completed for %s to %s",
            analysis_type.value,
            period_start.isoformat(),
            period_end.isoformat(),
        )
        return pdca_log

    def _gather_metrics(
        self,
        period_start: datetime,
        period_end: datetime,
    ) -> List[Dict[str, Any]]:
        results = (
            self.db.query(Post, PostAnalytics)
            .join(PostAnalytics, Post.id == PostAnalytics.post_id)
            .filter(
                Post.status == PostStatus.posted,
                PostAnalytics.collected_at >= period_start,
                PostAnalytics.collected_at <= period_end,
            )
            .all()
        )

        metrics_data = []
        for post, analytics in results:
            metrics_data.append(
                {
                    "post_id": post.id,
                    "content": post.content,
                    "post_type": post.post_type.value if post.post_type else "original",
                    "posted_at": post.posted_at.isoformat() if post.posted_at else None,
                    "impressions": analytics.impressions,
                    "likes": analytics.likes,
                    "retweets": analytics.retweets,
                    "replies": analytics.replies,
                    "quotes": analytics.quotes,
                    "bookmarks": analytics.bookmarks,
                }
            )
        return metrics_data

    def get_pdca_logs(
        self,
        skip: int = 0,
        limit: int = 20,
        analysis_type: Optional[str] = None,
    ) -> List[PdcaLog]:
        query = self.db.query(PdcaLog)
        if analysis_type:
            query = query.filter(PdcaLog.analysis_type == AnalysisType(analysis_type))
        return (
            query.order_by(desc(PdcaLog.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def apply_changes(
        self,
        pdca_log_id: int,
        changes: Dict[str, Any],
    ) -> PdcaLog:
        pdca_log = self.db.query(PdcaLog).filter(PdcaLog.id == pdca_log_id).first()
        if not pdca_log:
            raise ValueError(f"PDCA log {pdca_log_id} not found.")
        pdca_log.applied_changes = changes
        self.db.commit()
        self.db.refresh(pdca_log)
        logger.info("Applied changes to PDCA log id=%d", pdca_log_id)
        return pdca_log
