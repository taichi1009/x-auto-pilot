from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.services.auto_pilot_service import AutoPilotService
from app.schemas.schemas import AutoPilotSettings
from app.utils.auth import get_current_user, get_current_admin

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


# --- Admin endpoints ---


@router.get("/admin/status/bulk")
def admin_bulk_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    service = AutoPilotService(db)
    result = {}
    for u in users:
        result[str(u.id)] = service.get_status(user_id=u.id)
    return result


@router.get("/admin/status/{user_id}")
def admin_get_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = AutoPilotService(db)
    return service.get_status(user_id=user_id)


@router.post("/admin/toggle/{user_id}")
def admin_toggle(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = AutoPilotService(db)
    return service.toggle(user_id=user_id)


@router.put("/admin/settings/{user_id}")
def admin_update_settings(
    user_id: int,
    data: AutoPilotSettings,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = AutoPilotService(db)
    return service.update_settings(data.model_dump(), user_id=user_id)
