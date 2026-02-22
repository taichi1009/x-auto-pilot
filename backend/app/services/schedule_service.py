import logging
from typing import Optional, List, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.models import Schedule, ScheduleType, PostType
from app.schemas.schemas import ScheduleCreate, ScheduleUpdate

logger = logging.getLogger(__name__)


class ScheduleService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_schedule(self, data: ScheduleCreate) -> Schedule:
        schedule_type = ScheduleType(data.schedule_type)
        if schedule_type == ScheduleType.recurring and not data.cron_expression:
            raise HTTPException(
                status_code=400,
                detail="cron_expression is required for recurring schedules.",
            )
        if schedule_type == ScheduleType.once and not data.scheduled_at:
            raise HTTPException(
                status_code=400,
                detail="scheduled_at is required for one-time schedules.",
            )

        schedule = Schedule(
            name=data.name,
            schedule_type=schedule_type,
            cron_expression=data.cron_expression,
            scheduled_at=data.scheduled_at,
            is_active=data.is_active,
            post_type=PostType(data.post_type) if data.post_type else PostType.original,
            ai_prompt=data.ai_prompt,
            template_id=data.template_id,
        )
        self.db.add(schedule)
        self.db.commit()
        self.db.refresh(schedule)
        logger.info("Created schedule id=%d name='%s'", schedule.id, schedule.name)
        return schedule

    def get_schedules(
        self,
        skip: int = 0,
        limit: int = 20,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[Schedule], int]:
        query = self.db.query(Schedule)
        if is_active is not None:
            query = query.filter(Schedule.is_active == is_active)
        total = query.count()
        schedules = (
            query.order_by(desc(Schedule.created_at)).offset(skip).limit(limit).all()
        )
        return schedules, total

    def get_schedule(self, schedule_id: int) -> Schedule:
        schedule = (
            self.db.query(Schedule).filter(Schedule.id == schedule_id).first()
        )
        if not schedule:
            raise HTTPException(
                status_code=404, detail=f"Schedule {schedule_id} not found."
            )
        return schedule

    def update_schedule(self, schedule_id: int, data: ScheduleUpdate) -> Schedule:
        schedule = self.get_schedule(schedule_id)
        update_data = data.model_dump(exclude_unset=True)

        if "schedule_type" in update_data and update_data["schedule_type"] is not None:
            update_data["schedule_type"] = ScheduleType(update_data["schedule_type"])
        if "post_type" in update_data and update_data["post_type"] is not None:
            update_data["post_type"] = PostType(update_data["post_type"])

        for field, value in update_data.items():
            setattr(schedule, field, value)

        self.db.commit()
        self.db.refresh(schedule)
        logger.info("Updated schedule id=%d", schedule.id)
        return schedule

    def delete_schedule(self, schedule_id: int) -> bool:
        schedule = self.get_schedule(schedule_id)
        self.db.delete(schedule)
        self.db.commit()
        logger.info("Deleted schedule id=%d", schedule_id)
        return True

    def toggle_schedule(self, schedule_id: int) -> Schedule:
        schedule = self.get_schedule(schedule_id)
        schedule.is_active = not schedule.is_active
        self.db.commit()
        self.db.refresh(schedule)
        logger.info(
            "Toggled schedule id=%d, is_active=%s", schedule.id, schedule.is_active
        )
        return schedule

    def get_active_schedules(self) -> List[Schedule]:
        return (
            self.db.query(Schedule)
            .filter(Schedule.is_active == True)
            .all()
        )
