import logging
from datetime import datetime
from typing import Optional, List, Tuple, Dict, Any

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import FollowTarget, FollowAction, FollowStatus
from app.schemas.schemas import FollowTargetCreate
from app.services.x_api import XApiService

logger = logging.getLogger(__name__)


class FollowService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.x_api = XApiService()

    def get_follow_targets(
        self,
        skip: int = 0,
        limit: int = 20,
        status: Optional[str] = None,
        action: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> Tuple[List[FollowTarget], int]:
        query = self.db.query(FollowTarget)
        if user_id is not None:
            query = query.filter(FollowTarget.user_id == user_id)
        if status:
            query = query.filter(FollowTarget.status == FollowStatus(status))
        if action:
            query = query.filter(FollowTarget.action == FollowAction(action))
        total = query.count()
        targets = (
            query.order_by(desc(FollowTarget.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
        return targets, total

    def create_follow_target(self, data: FollowTargetCreate, user_id: Optional[int] = None) -> FollowTarget:
        existing = (
            self.db.query(FollowTarget)
            .filter(FollowTarget.x_user_id == data.x_user_id)
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"User {data.x_user_id} is already in the follow targets list.",
            )

        target = FollowTarget(
            x_user_id=data.x_user_id,
            x_username=data.x_username,
            action=FollowAction(data.action) if data.action else FollowAction.follow,
            status=FollowStatus.pending,
        )
        target.user_id = user_id
        self.db.add(target)
        self.db.commit()
        self.db.refresh(target)
        logger.info(
            "Created follow target id=%d user=%s", target.id, target.x_username
        )
        return target

    def discover_users(self, query: str) -> List[Dict[str, Any]]:
        users = self.x_api.search_users(query)
        return users

    def execute_follow(self, target_id: int, user_id: Optional[int] = None) -> FollowTarget:
        query = self.db.query(FollowTarget).filter(FollowTarget.id == target_id)
        if user_id is not None:
            query = query.filter(FollowTarget.user_id == user_id)
        target = query.first()
        if not target:
            raise HTTPException(
                status_code=404, detail=f"Follow target {target_id} not found."
            )
        if target.status == FollowStatus.completed:
            raise HTTPException(
                status_code=400, detail="This follow action has already been completed."
            )

        try:
            if target.action == FollowAction.follow:
                self.x_api.follow_user(target.x_user_id)
                target.followed_at = datetime.utcnow()
            else:
                self.x_api.unfollow_user(target.x_user_id)
                target.unfollowed_at = datetime.utcnow()

            target.status = FollowStatus.completed
            self.db.commit()
            self.db.refresh(target)
            logger.info(
                "Executed %s for target id=%d user=%s",
                target.action.value,
                target.id,
                target.x_username,
            )
            return target
        except HTTPException:
            target.status = FollowStatus.failed
            self.db.commit()
            self.db.refresh(target)
            raise

    def get_follow_stats(self, user_id: Optional[int] = None) -> Dict[str, int]:
        base_query = self.db.query(FollowTarget)
        if user_id is not None:
            base_query = base_query.filter(FollowTarget.user_id == user_id)
        total = base_query.count()
        pending = (
            base_query.filter(FollowTarget.status == FollowStatus.pending)
            .count()
        )
        completed = (
            base_query.filter(FollowTarget.status == FollowStatus.completed)
            .count()
        )
        failed = (
            base_query.filter(FollowTarget.status == FollowStatus.failed)
            .count()
        )
        follow_backs = (
            base_query.filter(FollowTarget.follow_back == True)
            .count()
        )
        return {
            "total_targets": total,
            "pending": pending,
            "completed": completed,
            "failed": failed,
            "follow_backs": follow_backs,
        }
