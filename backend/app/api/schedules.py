from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import ScheduleCreate, ScheduleUpdate, ScheduleResponse
from app.services.schedule_service import ScheduleService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("", response_model=List[ScheduleResponse])
def list_schedules(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ScheduleService(db)
    schedules, total = service.get_schedules(
        skip=skip, limit=limit, is_active=is_active,
        user_id=current_user.id,
    )
    return schedules


@router.post("", response_model=ScheduleResponse, status_code=201)
def create_schedule(
    data: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ScheduleService(db)
    return service.create_schedule(data, user_id=current_user.id)


@router.put("/{schedule_id}", response_model=ScheduleResponse)
def update_schedule(
    schedule_id: int,
    data: ScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ScheduleService(db)
    return service.update_schedule(schedule_id, data, user_id=current_user.id)


@router.delete("/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ScheduleService(db)
    service.delete_schedule(schedule_id, user_id=current_user.id)
    return {"detail": "Schedule deleted successfully."}


@router.put("/{schedule_id}/toggle", response_model=ScheduleResponse)
def toggle_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = ScheduleService(db)
    return service.toggle_schedule(schedule_id, user_id=current_user.id)
