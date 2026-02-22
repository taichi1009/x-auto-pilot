from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.services.auto_pilot_service import AutoPilotService
from app.schemas.schemas import AutoPilotSettings
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/auto-pilot", tags=["auto-pilot"])


@router.get("/status")
def get_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AutoPilotService(db)
    return service.get_status(user_id=current_user.id)


@router.post("/toggle")
def toggle(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AutoPilotService(db)
    return service.toggle(user_id=current_user.id)


@router.put("/settings")
def update_settings(
    data: AutoPilotSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AutoPilotService(db)
    return service.update_settings(data.model_dump(), user_id=current_user.id)
