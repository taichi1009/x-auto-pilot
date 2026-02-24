from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import PostAnalyticsResponse
from app.services.analytics_service import AnalyticsService
from app.utils.auth import get_current_user, get_current_admin

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def get_overview(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db, user_id=current_user.id)
    return service.get_overview(days=days, user_id=current_user.id)


@router.get("/posts/{post_id}", response_model=List[PostAnalyticsResponse])
def get_post_analytics(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db, user_id=current_user.id)
    return service.get_post_analytics(post_id, user_id=current_user.id)


@router.get("/trends")
def get_trends(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db, user_id=current_user.id)
    return service.get_trends(days=days, user_id=current_user.id)


@router.post("/collect")
def collect_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db, user_id=current_user.id)
    result = service.collect_analytics(user_id=current_user.id)
    return result


# --- Admin endpoints ---


@router.get("/admin/{user_id}/overview")
def admin_get_overview(
    user_id: int,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = AnalyticsService(db, user_id=user_id)
    return service.get_overview(days=days, user_id=user_id)


@router.get("/admin/{user_id}/trends")
def admin_get_trends(
    user_id: int,
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = AnalyticsService(db, user_id=user_id)
    return service.get_trends(days=days, user_id=user_id)


@router.post("/admin/{user_id}/collect")
def admin_collect_analytics(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    service = AnalyticsService(db, user_id=user_id)
    return service.collect_analytics(user_id=user_id)
