from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import PostAnalyticsResponse
from app.services.analytics_service import AnalyticsService
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def get_overview(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    return service.get_overview(days=days, user_id=current_user.id)


@router.get("/posts/{post_id}", response_model=List[PostAnalyticsResponse])
def get_post_analytics(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    return service.get_post_analytics(post_id, user_id=current_user.id)


@router.get("/trends")
def get_trends(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    return service.get_trends(days=days, user_id=current_user.id)


@router.post("/collect")
def collect_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = AnalyticsService(db)
    result = service.collect_analytics(user_id=current_user.id)
    return result
