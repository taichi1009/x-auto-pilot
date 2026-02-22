import logging
from typing import Optional, List, Tuple, Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import ContentStrategy

logger = logging.getLogger(__name__)


class StrategyService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_strategy(self, data: dict, user_id: Optional[int] = None) -> ContentStrategy:
        strategy = ContentStrategy(**data)
        strategy.user_id = user_id
        self.db.add(strategy)
        self.db.commit()
        self.db.refresh(strategy)
        logger.info("Created strategy id=%d name=%s", strategy.id, strategy.name)
        return strategy

    def get_strategies(
        self, skip: int = 0, limit: int = 20, user_id: Optional[int] = None
    ) -> Tuple[List[ContentStrategy], int]:
        query = self.db.query(ContentStrategy)
        if user_id is not None:
            query = query.filter(ContentStrategy.user_id == user_id)
        total = query.count()
        strategies = (
            query.order_by(desc(ContentStrategy.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return strategies, total

    def get_strategy(self, strategy_id: int, user_id: Optional[int] = None) -> ContentStrategy:
        query = (
            self.db.query(ContentStrategy)
            .filter(ContentStrategy.id == strategy_id)
        )
        if user_id is not None:
            query = query.filter(ContentStrategy.user_id == user_id)
        strategy = query.first()
        if not strategy:
            raise HTTPException(
                status_code=404, detail=f"Strategy {strategy_id} not found."
            )
        return strategy

    def update_strategy(self, strategy_id: int, data: dict, user_id: Optional[int] = None) -> ContentStrategy:
        strategy = self.get_strategy(strategy_id, user_id=user_id)
        for field, value in data.items():
            setattr(strategy, field, value)
        self.db.commit()
        self.db.refresh(strategy)
        logger.info("Updated strategy id=%d", strategy.id)
        return strategy

    def delete_strategy(self, strategy_id: int, user_id: Optional[int] = None) -> bool:
        strategy = self.get_strategy(strategy_id, user_id=user_id)
        self.db.delete(strategy)
        self.db.commit()
        logger.info("Deleted strategy id=%d", strategy_id)
        return True

    def get_active_strategy(self, user_id: Optional[int] = None) -> Optional[ContentStrategy]:
        query = (
            self.db.query(ContentStrategy)
            .filter(ContentStrategy.is_active == True)
        )
        if user_id is not None:
            query = query.filter(ContentStrategy.user_id == user_id)
        return query.first()

    def activate_strategy(self, strategy_id: int, user_id: Optional[int] = None) -> ContentStrategy:
        # Deactivate all strategies (scoped by user_id if provided)
        deactivate_query = self.db.query(ContentStrategy)
        if user_id is not None:
            deactivate_query = deactivate_query.filter(ContentStrategy.user_id == user_id)
        deactivate_query.update({"is_active": False})
        # Activate the specified one
        strategy = self.get_strategy(strategy_id, user_id=user_id)
        strategy.is_active = True
        self.db.commit()
        self.db.refresh(strategy)
        logger.info("Activated strategy id=%d", strategy.id)
        return strategy

    def get_recommendations(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Return basic recommendations based on active strategy."""
        strategy = self.get_active_strategy(user_id=user_id)
        if not strategy:
            return {
                "message": "No active strategy. Create and activate a strategy first.",
                "recommendations": [],
            }
        recs = []
        if strategy.content_pillars:
            recs.append(
                f"Focus on your {len(strategy.content_pillars)} content pillars: "
                + ", ".join(strategy.content_pillars[:3])
            )
        if strategy.content_mix:
            mix_parts = [
                f"{k}: {v:.0f}%" for k, v in strategy.content_mix.items()
            ]
            recs.append(f"Maintain content mix: {', '.join(mix_parts)}")
        if strategy.optimal_posting_times:
            recs.append(
                f"Post at optimal times: {', '.join(strategy.optimal_posting_times[:3])}"
            )
        if strategy.hashtag_groups:
            groups = list(strategy.hashtag_groups.keys())
            recs.append(f"Rotate hashtag groups: {', '.join(groups[:3])}")
        recs.append(
            f"Target: {strategy.impression_target:,} impressions, "
            f"{strategy.follower_growth_target:,} follower growth/month"
        )
        return {
            "strategy_name": strategy.name,
            "recommendations": recs,
        }
